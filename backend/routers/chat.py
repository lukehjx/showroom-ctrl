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

        # 获取或创建会话（企微Bot和机器人共享，通过 robot_sn 区分展厅）
        wecom_user = body.wecom_user_key or ""
        req_operator = body.operator or ("bot" if wecom_user else "robot")
        async with async_session() as session:
            result = await session.execute(
                select(ChatSession).where(ChatSession.robot_sn == robot_sn).order_by(ChatSession.id.desc()).limit(1)
            )
            chat_session = result.scalar_one_or_none()

            if not chat_session:
                chat_session = ChatSession(
                    robot_sn=robot_sn, state="idle",
                    operator=req_operator,
                    wecom_user_key=wecom_user if wecom_user else None,
                )
                session.add(chat_session)
                await session.commit()
                await session.refresh(chat_session)
            else:
                # 同步 operator（接管逻辑：谁发消息谁接管，除非对方明确不释放）
                needs_update = False
                if wecom_user and chat_session.operator != "bot":
                    chat_session.operator = "bot"
                    chat_session.wecom_user_key = wecom_user
                    needs_update = True
                elif not wecom_user and req_operator == "robot" and chat_session.operator != "robot":
                    # 机器人发 robot_arrived 等事件时接管
                    if event in ("robot_arrived", "robot_speaking", "robot_idle"):
                        chat_session.operator = "robot"
                        needs_update = True
                if needs_update:
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
            action_result = await handle_intent(intent, extra, robot_sn, chat_session, text=text)
            response_data["result"] = action_result

        elif event == "robot_arrived":
            poi = params.get("poi", "")
            from lane_engine import trigger_callback
            await trigger_callback(f"arrived_{poi}")
            # 到达点位时按名称匹配终端，更新当前展项
            from models import CloudTerminal
            terminal_id = None
            async with async_session() as session:
                t_r = await session.execute(
                    select(CloudTerminal).where(CloudTerminal.name.contains(poi)).limit(1)
                )
                t = t_r.scalar_one_or_none()
                if t:
                    terminal_id = t.terminal_id
            if terminal_id:
                async with async_session() as session:
                    cs_r = await session.execute(
                        select(ChatSession).where(ChatSession.robot_sn == robot_sn).order_by(ChatSession.id.desc()).limit(1)
                    )
                    cs_obj = cs_r.scalar_one_or_none()
                    if cs_obj:
                        cs_obj.current_exhibit_id = terminal_id
                        cs_obj.last_activity_at = datetime.now()
                        await session.commit()
            response_data["result"] = {"message": f"已到达【{poi}】，可以说有哪些文件查看当前内容", "terminal_id": terminal_id}

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


async def handle_intent(intent: str, extra: dict, robot_sn: str, chat_session: ChatSession, text: str = "") -> dict:
    """根据意图执行相应动作"""
    try:
        if intent == "start_tour":
            # 获取第一个终端作为起点
            from models import CloudTerminal
            async with async_session() as session:
                result = await session.execute(
                    select(CloudTerminal).order_by(CloudTerminal.terminal_id).limit(1)
                )
                first_terminal = result.scalar_one_or_none()

            if first_terminal:
                async with async_session() as session:
                    cs = await session.get(ChatSession, chat_session.id)
                    if cs:
                        cs.state = "touring"
                        cs.current_exhibit_id = first_terminal.terminal_id
                        cs.last_activity_at = datetime.now()
                        await session.commit()
                return {"action": "start_tour", "terminal_id": first_terminal.terminal_id, "terminal_name": first_terminal.name, "message": f"好嘞！我们从【{first_terminal.name}】开始参观～跟我走吧！🐾"}
            return {"action": "start_tour", "message": "展馆终端数据还没同步，请联系工作人员哦～"}

        elif intent == "next_exhibit":
            from models import CloudTerminal
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_tid = cs.current_exhibit_id if cs else None

                if current_tid:
                    result = await session.execute(
                        select(CloudTerminal).where(CloudTerminal.terminal_id > current_tid).order_by(CloudTerminal.terminal_id).limit(1)
                    )
                else:
                    result = await session.execute(
                        select(CloudTerminal).order_by(CloudTerminal.terminal_id).limit(1)
                    )
                next_t = result.scalar_one_or_none()

                if next_t and cs:
                    cs.current_exhibit_id = next_t.terminal_id
                    cs.last_activity_at = datetime.now()
                    await session.commit()
                    return {"action": "next_exhibit", "terminal_id": next_t.terminal_id, "terminal_name": next_t.name, "message": f"跟我来！下一站：【{next_t.name}】🚶"}
            return {"action": "next_exhibit", "message": "已经是最后一个展位啦！说「回到入口」可以回到起点，或者说「有哪些文件」看当前内容～"}

        elif intent == "prev_exhibit":
            from models import CloudTerminal
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_tid = cs.current_exhibit_id if cs else None

                if current_tid:
                    result = await session.execute(
                        select(CloudTerminal).where(CloudTerminal.terminal_id < current_tid).order_by(CloudTerminal.terminal_id.desc()).limit(1)
                    )
                    prev_t = result.scalar_one_or_none()
                    if prev_t and cs:
                        cs.current_exhibit_id = prev_t.terminal_id
                        cs.last_activity_at = datetime.now()
                        await session.commit()
                        return {"action": "prev_exhibit", "terminal_id": prev_t.terminal_id, "terminal_name": prev_t.name, "message": f"好的，往回走！上一站：【{prev_t.name}】🔙"}
            return {"action": "prev_exhibit", "message": "已经是第一个展位了，没有更前面啦～"}

        elif intent == "go_home":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                if cs:
                    cs.state = "idle"
                    cs.current_exhibit_id = None
                    cs.last_activity_at = datetime.now()
                    await session.commit()
            return {"action": "go_home", "message": "好的，带你回到入口～稍等一下🏠"}

        elif intent == "stop":
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                if cs:
                    cs.state = "idle"
                    cs.last_activity_at = datetime.now()
                    await session.commit()
            return {"action": "stop", "message": "好的，休息一会儿！有需要随时叫我 😊"}

        elif intent == "list_files":
            from models import CloudTerminal, CloudResource
            from sqlalchemy import text as _sql_text
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                current_terminal_id = cs.current_exhibit_id if cs else None  # 存的是 terminal_id

            # 获取当前专场
            current_scene_id = None
            async with async_session() as session:
                from models import CurrentScene
                sc_row = await session.execute(select(CurrentScene).limit(1))
                sc = sc_row.scalar_one_or_none()
                if sc:
                    current_scene_id = sc.scene_id

            if current_terminal_id:
                # 查终端名
                async with async_session() as session:
                    t = await session.execute(
                        select(CloudTerminal).where(CloudTerminal.terminal_id == current_terminal_id).limit(1)
                    )
                    terminal = t.scalar_one_or_none()
                terminal_name = terminal.name if terminal else f"终端{current_terminal_id}"

                # 从 cloud_resources 查该终端在当前专场的资源（用 raw_data._terminal_id 关联）
                async with async_session() as session:
                    if current_scene_id:
                        rows = await session.execute(
                            _sql_text("""
                                SELECT COALESCE(title, file_name, raw_data->>'resourceName', '未命名'), resource_id
                                FROM cloud_resources
                                WHERE (raw_data->>'_terminal_id')::int = :tid
                                  AND (raw_data->>'_scene_id')::int = :sid
                                ORDER BY sort
                            """),
                            {"tid": current_terminal_id, "sid": current_scene_id}
                        )
                        titles = rows.fetchall()  # [(title, resource_id), ...]
                        # 当前专场没有资源时，fallback 到该终端所有资源
                        if not titles:
                            rows2 = await session.execute(
                                _sql_text("""
                                    SELECT COALESCE(title, file_name, raw_data->>'resourceName', '未命名'), resource_id
                                    FROM cloud_resources
                                    WHERE (raw_data->>'_terminal_id')::int = :tid
                                    ORDER BY sort
                                """),
                                {"tid": current_terminal_id}
                            )
                            titles = rows2.fetchall()  # [(title, resource_id), ...]
                    else:
                        rows = await session.execute(
                            _sql_text("""
                                SELECT COALESCE(title, file_name, raw_data->>'resourceName', '未命名'), resource_id
                                FROM cloud_resources
                                WHERE (raw_data->>'_terminal_id')::int = :tid
                                ORDER BY sort
                            """),
                            {"tid": current_terminal_id}
                        )
                        titles = rows.fetchall()  # [(title, resource_id), ...]

                if titles:
                    items = "、".join(f"第{i+1}个《{t[0]}》" for i, t in enumerate(titles[:8]))
                    msg = f"【{terminal_name}】共 {len(titles)} 个文件：{items}"
                    if len(titles) > 8:
                        msg += f"等{len(titles)}个，说第X个来播放"
                    else:
                        msg += "，说第X个来播放"
                    # 存文件列表到 session（供 select 使用）
                    resource_list = [{"title": t[0], "resource_id": t[1], "terminal_id": current_terminal_id} for t in titles]
                    async with async_session() as session:
                        cs = await session.get(ChatSession, chat_session.id)
                        if cs:
                            cs.shown_resources = resource_list
                            cs.last_activity_at = datetime.now()
                            await session.commit()
                else:
                    msg = f"【{terminal_name}】在当前专场暂无内容"
                    resource_list = []
                return {"action": "list_files", "terminal_id": current_terminal_id, "count": len(titles), "message": msg}
            else:
                # 没有当前终端，列出所有终端
                async with async_session() as session:
                    rows = await session.execute(
                        select(CloudTerminal).order_by(CloudTerminal.terminal_id)
                    )
                    terminals = rows.scalars().all()
                if terminals:
                    names = "、".join(f"《{t.name}》" for t in terminals[:6])
                    msg = f"我现在不在任何展示位前。展厅有：{names}等{len(terminals)}个展位，说开始参观让我带路！"
                else:
                    msg = "展厅终端数据还没同步，请联系工作人员。"
                return {"action": "list_files", "message": msg}

        elif intent == "select":
            index = extra.get("index", 1)
            # 从 session 读文件列表
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                shown = cs.shown_resources if cs else None
                current_tid = cs.current_exhibit_id if cs else None

            if not shown:
                return {"action": "select", "message": "还没有文件列表，请先说有哪些文件～"}

            idx = int(index) - 1
            if idx < 0 or idx >= len(shown):
                return {"action": "select", "message": f"只有 {len(shown)} 个文件，请说第1到第{len(shown)}个～"}

            item = shown[idx]
            resource_id = item.get("resource_id")
            terminal_id = item.get("terminal_id") or current_tid
            title = item.get("title", f"第{index}个")

            # 获取当前专场和 TCP 配置
            from models import CurrentScene
            from tcp_service import send_tcp
            from config import get_config as _gc

            async with async_session() as session:
                sc_row = await session.execute(select(CurrentScene).limit(1))
                sc = sc_row.scalar_one_or_none()
                scene_id = sc.scene_id if sc else 68

            tcp_host = await _gc("tcp.host") or "112.20.77.18"
            tcp_port = int(await _gc("tcp.port") or "8989")

            # TCP 投放命令: 2_{scene_id}_{terminal_id}_{resource_id}
            cmd = f"2_{scene_id}_{terminal_id}_{resource_id}"
            try:
                ok = await send_tcp(tcp_host, tcp_port, cmd)
                if ok:
                    msg = f"好，正在播放《{title}》！🎬"
                else:
                    msg = f"《{title}》投放指令已发送，请查看屏幕～"
            except Exception as e:
                logger.error(f"TCP cast error: {e}")
                msg = f"《{title}》投放时遇到点问题，请稍后再试～"

            return {"action": "select", "index": index, "resource_id": resource_id, "terminal_id": terminal_id, "tcp_cmd": cmd, "message": msg}

        elif intent == "repeat":
            return {"action": "repeat", "message": "好的，我再说一遍～"}

        elif intent == "continue":
            return {"action": "continue", "message": "继续！"}

        elif intent == "go_charge":
            return {"action": "go_charge", "message": "好嘞，去充电了，一会儿回来！⚡"}

        elif intent == "switch_scene":
            scene_name = extra.get("scene_name", "") or extra.get("raw_text", "")
            from models import CloudScene, CurrentScene
            from tcp_service import send_tcp
            from config import get_config as _gc
            # 按名称模糊匹配专场
            async with async_session() as session:
                result = await session.execute(
                    select(CloudScene).where(CloudScene.name.contains(scene_name)).limit(1)
                )
                matched = result.scalar_one_or_none()
                # 如果没匹配到，返回专场列表让用户选
                if not matched:
                    all_scenes = await session.execute(select(CloudScene).order_by(CloudScene.scene_id))
                    scene_list = all_scenes.scalars().all()
                    names = "、".join(f"《{s.name}》" for s in scene_list[:8])
                    return {"action": "switch_scene", "message": f"没找到「{scene_name}」，现有专场：{names}，请说「切换到XX专场」"}

            # 发 TCP 切换指令
            tcp_host = await _gc("tcp.host") or "112.20.77.18"
            tcp_port = int(await _gc("tcp.port") or "8989")
            cmd = f"2_update_{matched.scene_id}"
            try:
                ok = await send_tcp(tcp_host, tcp_port, cmd)
            except Exception as e:
                logger.error(f"Switch scene TCP error: {e}")
                ok = False

            # 更新本地 current_scene
            async with async_session() as session:
                sc_row = await session.execute(select(CurrentScene).limit(1))
                sc = sc_row.scalar_one_or_none()
                if sc:
                    sc.scene_id = matched.scene_id
                    sc.updated_at = datetime.now()
                    await session.commit()

            status = "🎬 已切换" if ok else "📡 指令已发送"
            return {"action": "switch_scene", "scene_id": matched.scene_id, "scene_name": matched.name,
                    "tcp_cmd": cmd, "message": f"{status}：{matched.name}！"}

        elif intent == "takeover":
            target_operator = extra.get("operator", "bot")
            # 更新 session 的 operator 字段
            async with async_session() as session:
                cs = await session.get(ChatSession, chat_session.id)
                if cs:
                    cs.operator = target_operator
                    cs.last_activity_at = datetime.now()
                    await session.commit()
            if target_operator == "bot":
                msg = "好的，我来接管控制，现在由我操作展厅～"
            else:
                msg = "已切换为机器人自主模式，我会配合机器人走位来操作～"
            return {"action": "takeover", "operator": target_operator, "message": msg}

        elif intent == "device_control":
            # 设备控制：发送 TCP/HTTP 命令
            cmd_name = extra.get("cmd_name", "")
            from models import CloudCommand
            async with async_session() as session:
                result = await session.execute(
                    select(CloudCommand).where(CloudCommand.name.contains(cmd_name) if cmd_name else CloudCommand.id > 0).limit(1)
                )
                cmd = result.scalar_one_or_none()
            if cmd:
                from tcp_service import send_tcp
                from config import get_config as _gc
                tcp_host = await _gc("tcp.host") or "112.20.77.18"
                tcp_port = int(await _gc("tcp.port") or "8989")
                if cmd.protocol_type == "tcp":
                    await send_tcp(tcp_host, tcp_port, cmd.command_str, "utf-8", cmd.is_hex or False)
                    return {"action": "device_control", "message": f"好的，{cmd.name}指令已发送！"}
                else:
                    import httpx
                    url = cmd.url or cmd.command_str
                    if url.startswith("http"):
                        async with httpx.AsyncClient(timeout=5) as _hc:
                            await _hc.get(url)
                    return {"action": "device_control", "message": f"好的，{cmd.name}指令已发送！"}
            return {"action": "device_control", "message": f"抱歉，没找到[{cmd_name}]指令，请确认名称～"}

        else:
            # 未识别意图 → 检查每日限额，接入大模型闲聊
            limit_key = robot_sn or "default"
            from datetime import date as _date
            from sqlalchemy import text as _text
            async with async_session() as _session:
                # 查今日已用次数
                r = await _session.execute(
                    _text("SELECT count FROM chat_daily_limits WHERE user_key=:k AND date=CURRENT_DATE"),
                    {"k": limit_key}
                )
                row = r.fetchone()
                daily_count = row[0] if row else 0

            if daily_count >= 100:
                return {"action": "chat_limit", "message": "今天的闲聊次数已达上限（100次），明天再聊吧！展厅功能随时可用：有哪些文件 / 开始参观 / 灯全开 / 灯全关"}

            # 调大模型回复
            from intent import llm_chat
            reply = await llm_chat(text, {"robot_sn": robot_sn})

            # 更新计数
            async with async_session() as _session:
                await _session.execute(
                    _text("""INSERT INTO chat_daily_limits (user_key, date, count)
                             VALUES (:k, CURRENT_DATE, 1)
                             ON CONFLICT (user_key, date) DO UPDATE SET count = chat_daily_limits.count + 1"""),
                    {"k": limit_key}
                )
                await _session.commit()

            return {"action": "chat", "message": reply}

    except Exception as e:
        logger.error(f"Handle intent {intent} error: {e}")
        return {"action": intent, "message": "哎呀出了点小问题，稍后再试试吧～", "error": str(e)}
