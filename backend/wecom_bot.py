"""
展厅智控 企微Bot - v3
WSClient.run() 自己管理 event loop，用同步模式启动
"""
import logging
import asyncio
import threading
import httpx
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


def get_config_sync(key: str) -> str:
    """同步获取配置（从 DB 通过 httpx 同步请求）"""
    try:
        resp = httpx.get(f"http://127.0.0.1:8200/api/config/{key}", timeout=5)
        if resp.status_code == 200:
            return resp.json().get("data", {}).get("value", "") or ""
    except Exception:
        pass
    return ""


def get_reply_sync(text: str, sender: str, chatid: str, chattype: str) -> str:
    """同步调用后端 chat/input"""
    try:
        robot_sn = get_config_sync("robot.sn") or "MC1BCN2K100262058CA0"
        payload = {
            "event": "text",
            "text": text,
            "robot_sn": robot_sn,
            "source": "wecom",
            "params": {"sender": sender, "chatid": chatid, "chattype": chattype}
        }
        resp = httpx.post("http://127.0.0.1:8200/api/chat/input", json=payload, timeout=35)
        if resp.status_code == 200:
            data = resp.json()
            reply = data.get("data", {}).get("reply")
            if reply:
                return str(reply)
            return "收到，已处理。"
        return "处理出错，请稍后再试。"
    except Exception as e:
        logger.error(f"Get reply error: {e}")
        return "网络异常，请稍后再试。"


def poll_notifications_sync(ws_client):
    """后台线程：轮询 bot_notifications 推送到群"""
    import time
    while True:
        try:
            ng_resp = httpx.get("http://127.0.0.1:8200/api/notify-groups", timeout=5)
            if ng_resp.status_code == 200:
                groups = [g for g in (ng_resp.json().get("data") or []) if g.get("enabled")]
            else:
                groups = []

            bn_resp = httpx.get("http://127.0.0.1:8200/api/bot-notifications?sent=false&limit=20", timeout=5)
            if bn_resp.status_code == 200:
                items = bn_resp.json().get("data") or []
                for item in items:
                    msg = item.get("message", "")
                    nid = item.get("id")
                    if not msg:
                        continue
                    for group in groups:
                        chat_id = group.get("chat_id")
                        if chat_id:
                            try:
                                ws_client.send_message(
                                    chatid=chat_id,
                                    msgtype="markdown",
                                    markdown={"content": msg}
                                )
                            except Exception as e:
                                logger.warning(f"Push to {chat_id} failed: {e}")
                    try:
                        httpx.patch(
                            f"http://127.0.0.1:8200/api/bot-notifications/{nid}",
                            json={"sent": True}, timeout=5
                        )
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"Poll error: {e}")
        time.sleep(3)


def main():
    bot_id = get_config_sync("wecom_bot.bot_id")
    secret = get_config_sync("wecom_bot.secret")

    if not bot_id or not secret:
        logger.warning("WecomBot: bot_id or secret not configured, waiting...")
        import time
        while True:
            time.sleep(60)
            bot_id = get_config_sync("wecom_bot.bot_id")
            secret = get_config_sync("wecom_bot.secret")
            if bot_id and secret:
                break

    from aibot import WSClient, WSClientOptions
    options = WSClientOptions(bot_id=bot_id, secret=secret)
    ws_client = WSClient(options)

    # 注册消息处理器
    @ws_client.on("message")
    def on_message(frame):
        try:
            body = frame.get("body", {})
            msgtype = body.get("msgtype", "")
            if msgtype not in ("text", "voice"):
                return

            text = (body.get("text") or {}).get("content", "") or \
                   (body.get("voice") or {}).get("content", "") or ""
            if "@" in text:
                parts = text.split(" ", 1)
                text = parts[1].strip() if len(parts) > 1 else text.strip()
            text = text.strip()
            if not text:
                return

            sender = (body.get("from") or {}).get("userid", "") or ""
            chatid = body.get("chatid", "") or ""
            chattype = body.get("chattype", "group")

            logger.info(f"收到消息 [{chattype}] from {sender}: {text}")

            if "群ID" in text or "chatid" in text.lower():
                reply = f"当前会话ID：`{chatid}`"
            else:
                # 在线程池中同步调用（避免阻塞 event loop）
                reply = get_reply_sync(text, sender, chatid, chattype)

            ws_client.reply_stream(frame, reply)
            logger.info(f"已回复: {reply[:80]}")
        except Exception as e:
            logger.error(f"处理消息失败: {e}")

    # 启动通知推送线程
    t = threading.Thread(target=poll_notifications_sync, args=(ws_client,), daemon=True)
    t.start()
    logger.info("WecomBot starting (sync mode)...")
    ws_client.run()


# 供 main.py 调用的后台启动
def start_bot_background():
    t = threading.Thread(target=main, daemon=True)
    t.start()
    logger.info("WecomBot thread started")


if __name__ == "__main__":
    main()
