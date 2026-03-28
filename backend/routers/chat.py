import logging
from fastapi import APIRouter
from sqlalchemy import select
from database import async_session
from models import ChatSession, Exhibit, OperationLog
from schemas import ok, err, ChatInput
from intent import recognize_intent
from datetime import datetime

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

        if event == "voice_input":
            text = params.get("text", "")
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

        elif event == "robot_arrived":
            poi = params.get("poi", "")
            from lane_engine import trigger_callback
            await trigger_callback(f"arrived_{poi}")
            response_data["result"] = f"Arrived at {poi}"

        elif event == "tts_done":
            from lane_engine import trigger_callback
            await trigger_callback("tts_done")
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
