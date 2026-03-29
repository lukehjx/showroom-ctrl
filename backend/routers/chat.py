import logging
from fastapi import APIRouter
from sqlalchemy import select, text
from database import async_session
from models import ChatSession, Exhibit, OperationLog
from schemas import ok, err, ChatInput
from intent import recognize_intent
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/input")
async def chat_input(body: ChatInput):
    """对话入口：接收事件并处理意图"""
    try:
        event = body.event
        robot_sn = body.robot_sn or ""
        params = body.params or {}

        # 记录操作日志
        log = OperationLog(
            action=f"chat_input:{event}",
            source=robot_sn,
            params={"event": event, "params": params},
            created_at=datetime.now()
        )

        # 获取或创建会话
        async with async_session() as session:
            result = await session.execute(
                select(ChatSession).where(ChatSession.robot_sn == robot_sn).order_by(ChatSession.id.desc()).limit(1)
            )
            chat_session = result.scalar_one_or_none()

            if not chat_session:
                chat_session = ChatSession(robot_sn=robot_sn, state="idle")
                session.add(chat_session)
                await session.commit()
                await session.refresh(chat_session)

        response_data = {"event": event, "robot_sn": robot_sn, "result": None}

        if event in ("voice_input", "text"):
            text = params.get("text", "") or body.text or ""
            if not text:
                return err("Missing text in params")

            # 意图识别
            intent_result = await recognize_intent(text, {"robot_sn": robot_sn})
            intent = intent_result.get("intent", "unknown")
            extra = intent_result.get("extra", {})

            response_data["intent"] = intent
            response_data["intent_result"] = intent_result

            # 根据意图执行动作
            action_result = await handle_intent(intent, extra, robot_sn, chat_session)
            response_data["result"] = action_result

            # 生成人话回复文本
            reply_text = await _generate_reply(intent, extra, action_result, text)
            response_data["reply"] = reply_text

            # 机器人回复后进入对话模式30秒（只要有动作响应就激活）
            await _set_listening_mode(robot_sn, True)

        elif event == "robot_arrived":
            poi = params.get("poi", "")
            from lane_engine import trigger_callback
            await trigger_callback(f"arrived_{poi}")
            response_data["result"] = f"Arrived at {poi}"

        elif event == "tts_done":
            from lane_engine import trigger_callback
            await trigger_callback("tts_done")
            # TTS播完后激活对话模式30秒
            await _set_listening_mode(robot_sn, True)
            response_data["result"] = "TTS done"

        elif event == "robot_callback":
            cb_type = params.get("type", "")
            from lane_engine import trigger_callback
            await trigger_callback(cb_type)
            response_data["result"] = f"Callback {cb_type} triggered"

        else:
            response_data["result"] = f"Unknown event: {event}"

        # 保存操作日志
        async with async_session() as session:
            log.result = response_data
            session.add(log)
            await session.commit()

        return ok(response_data)

    except Exception as e:
        logger.error(f"Chat input error: {e}")
        return err(str(e))


async def _set_listening_mode(robot_sn: str, active: bool):
    """设置机器人的对话监听模式"""
    try:
        async with async_session() as session:
            if active:
                await session.execute(
                    text("""
                        UPDATE chat_sessions
                        SET listening_mode=TRUE,
                            listening_expires_at=NOW() AT TIME ZONE 'UTC' + INTERVAL '30 seconds'
                        WHERE robot_sn=:sn
                    """),
                    {"sn": robot_sn}
                )
            else:
                await session.execute(
                    text("UPDATE chat_sessions SET listening_mode=FALSE WHERE robot_sn=:sn"),
                    {"sn": robot_sn}
                )
            await session.commit()
    except Exception as e:
        logger.warning(f"Set listening mode error: {e}")


@router.get("/listening-mode/{robot_sn}")
async def get_listening_mode(robot_sn: str):
    """APK轮询：查询机器人是否在对话监听模式（TTS后30秒内免唤醒词）"""
    try:
        async with async_session() as session:
            result = await session.execute(
                text("""
                    SELECT listening_mode, listening_expires_at
                    FROM chat_sessions WHERE robot_sn=:sn
                    ORDER BY id DESC LIMIT 1
                """),
                {"sn": robot_sn}
            )
            row = result.fetchone()

        if not row:
            return ok({"listening": False})

        listening_mode = row[0]
        listening_expires_at = row[1]

        if not listening_mode or not listening_expires_at:
            return ok({"listening": False})

        now_utc = datetime.now(timezone.utc)
        # listening_expires_at may be naive (no tz), compare carefully
        if hasattr(listening_expires_at, 'tzinfo') and listening_expires_at.tzinfo:
            active = listening_expires_at > now_utc
        else:
            from datetime import timezone as tz
            expires_utc = listening_expires_at.replace(tzinfo=timezone.utc)
            active = expires_utc > now_utc

        if not active and listening_mode:
            # 过期，重置
            await _set_listening_mode(robot_sn, False)

        return ok({"listening": bool(active)})

    except Exception as e:
        logger.error(f"Get listening mode error: {e}")
        return ok({"listening": False})


async def handle_intent(intent: str, extra: dict, robot_sn: str, chat_session: ChatSession) -> dict:
    """根据意图执行相应动作"""
    try:
        if intent == "start_tour":
            # 获取第一个展项
            async with async_session() as session:
                result = await session.execute(
                    select(Exhibit).order_by(Exhibit.sort_order, Exhibit.id).limit(1)
                )
                first_exhibit = result.scalar_one_or_none()

            if first_exhibit:
                async with async_session() as session:
                    cs = await session.get(ChatSession, chat_session.id)
                    if cs:
                        cs.state = "touring"
                        cs.current_exhibit_id = first_exhibit.id
                        cs.last_activity_at = datetime.now()
                        await session.commit()
                return {"action": "start_tour", "exhibit_id": first_exhibit.id, "exhibit_name": first_exhibit.name}
            return {"action": "start_tour", "message": "No exhibits found"}

        elif intent == "next_exhibit":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_id = cs.current_exhibit_id if cs else None

                if current_id:
                    result = await session.execute(
                        select(Exhibit).where(Exhibit.id > current_id).order_by(Exhibit.sort_order, Exhibit.id).limit(1)
                    )
                    next_exhibit = result.scalar_one_or_none()
                else:
                    result = await session.execute(
                        select(Exhibit).order_by(Exhibit.sort_order, Exhibit.id).limit(1)
                    )
                    next_exhibit = result.scalar_one_or_none()

                if next_exhibit and cs:
                    cs.current_exhibit_id = next_exhibit.id
                    cs.last_activity_at = datetime.now()
                    await session.commit()
                    return {"action": "next_exhibit", "exhibit_id": next_exhibit.id, "exhibit_name": next_exhibit.name}
            return {"action": "next_exhibit", "message": "No more exhibits"}

        elif intent == "prev_exhibit":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_id = cs.current_exhibit_id if cs else None

                if current_id:
                    result = await session.execute(
                        select(Exhibit).where(Exhibit.id < current_id).order_by(Exhibit.sort_order.desc(), Exhibit.id.desc()).limit(1)
                    )
                    prev_exhibit = result.scalar_one_or_none()
                    if prev_exhibit and cs:
                        cs.current_exhibit_id = prev_exhibit.id
                        cs.last_activity_at = datetime.now()
                        await session.commit()
                        return {"action": "prev_exhibit", "exhibit_id": prev_exhibit.id, "exhibit_name": prev_exhibit.name}
            return {"action": "prev_exhibit", "message": "No previous exhibit"}

        elif intent == "go_home":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                if cs:
                    cs.state = "idle"
                    cs.current_exhibit_id = None
                    cs.last_activity_at = datetime.now()
                    await session.commit()
            return {"action": "go_home"}

        elif intent == "stop":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                if cs:
                    cs.state = "idle"
                    cs.last_activity_at = datetime.now()
                    await session.commit()
            return {"action": "stop"}

        elif intent == "list_files":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_id = cs.current_exhibit_id if cs else None

            if current_id:
                from models import ExhibitResource, CloudResource
                async with async_session() as session:
                    result = await session.execute(
                        select(ExhibitResource).where(ExhibitResource.exhibit_id == current_id).order_by(ExhibitResource.sort_order)
                    )
                    resources = result.scalars().all()
                return {"action": "list_files", "exhibit_id": current_id, "count": len(resources), "resources": [r.id for r in resources]}
            return {"action": "list_files", "message": "No current exhibit"}

        elif intent == "select":
            index = extra.get("index", 1)
            return {"action": "select", "index": index}

        else:
            return {"action": intent, "status": "acknowledged"}

    except Exception as e:
        logger.error(f"Handle intent {intent} error: {e}")
        return {"action": intent, "error": str(e)}


async def _generate_reply(intent: str, extra: dict, action_result: dict, text: str) -> str:
    """根据意图生成人话回复"""
    from config import get_config
    from openai import AsyncOpenAI

    INTENT_REPLIES = {
        "list_files": None,  # 由 handle_intent 的 result 构建
        "next_exhibit": "好的，我们去下一个展项！",
        "prev_exhibit": "好的，回到上一个展项。",
        "start_tour": "好的，我带您开始参观！",
        "go_home": "好的，我们回到入口！",
        "go_charge": "好的，我去充电了，一会儿见！",
        "repeat": "好的，我再说一遍。",
        "stop": "好的，停止了。",
        "continue": "好的，继续。",
        "select": None,  # 由 handle_intent 的 result 构建
    }

    if intent in INTENT_REPLIES and INTENT_REPLIES[intent] is not None:
        return INTENT_REPLIES[intent]

    if intent == "list_files":
        count = action_result.get("count", 0)
        if count > 0:
            return f"当前展位共有 {count} 个内容，说「第一个」「第二个」等来选择播放。"
        return "当前展位暂无内容资源。"

    if intent == "select":
        index = extra.get("index", 1)
        return f"好的，正在播放第{index}个内容。"

    # unknown 意图 → Qwen 闲聊
    try:
        qwen_key = await get_config("ai.qwen_key") or "sk-845c78e1c9a749ba901c5ce3d68f4a33"
        qwen_model = await get_config("ai.qwen_model") or "qwen-plus-latest"
        bot_name = await get_config("bot.name") or "旺财"
        location = await get_config("bot.location") or "南京"
        system_prompt = await get_config("bot.system_prompt") or f"你是展厅导览机器人{bot_name}，请用简短活泼的语气回复（不超过150字）。"
        system_prompt = system_prompt.replace("{name}", bot_name).replace("{location}", location)

        client = AsyncOpenAI(api_key=qwen_key, base_url="https://dashscope.aliyuncs.com/compatible-mode/v1")
        response = await client.chat.completions.create(
            model=qwen_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.7,
            max_tokens=300,
            extra_body={"enable_search": True}
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Qwen llm_chat failed: {e}")
        return f"您好！我是{await get_config('bot.name') or '旺财'}，有什么需要帮助的吗？您可以说「开始参观」「有哪些文件」等指令。"
