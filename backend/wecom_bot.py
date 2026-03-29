"""
展厅智控 企微Bot - 完整版
- 收到消息 → 调 /api/chat/input → 获取reply → 回复用户
- 轮询 bot_notifications 表 → 主动推送到通知群
"""
import logging
import asyncio
import json
import httpx
from config import get_config

logger = logging.getLogger(__name__)

_bot_instance = None
_ws_client = None


async def _get_reply_from_chat(text: str, sender_userid: str, chatid: str, chattype: str) -> str:
    """调用后端chat/input，获取回复文本"""
    try:
        robot_sn = await get_config("robot.sn") or "MC1BCN2K100262058CA0"
        payload = {
            "event": "text",
            "text": text,
            "robot_sn": robot_sn,
            "source": "wecom",
            "params": {
                "sender": sender_userid,
                "chatid": chatid,
                "chattype": chattype,
            }
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post("http://127.0.0.1:8200/api/chat/input", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                reply = data.get("data", {}).get("reply") or data.get("data", {}).get("response")
                if reply:
                    return str(reply)
                intent = data.get("data", {}).get("intent", "unknown")
                if intent != "unknown":
                    return f"已执行：{intent}"
                return "收到，我正在处理中～"
            else:
                logger.error(f"Chat input error: {resp.status_code} {resp.text[:200]}")
                return "抱歉，处理出错了，请稍后再试"
    except Exception as e:
        logger.error(f"Get reply error: {e}")
        return "网络连接异常，请稍后再试"


async def _poll_and_push_notifications(ws_client):
    """轮询 bot_notifications 表，主动推送到企微群"""
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get("http://127.0.0.1:8200/api/notify/pending")
                if resp.status_code == 200:
                    items = resp.json().get("data", [])
                    for item in items:
                        msg = item.get("message", "")
                        chatid = item.get("chatid", "")
                        nid = item.get("id")
                        if msg and chatid and ws_client:
                            try:
                                await ws_client.send_message(
                                    chatid=chatid,
                                    msgtype="markdown",
                                    content={"content": msg}
                                )
                                # 标记已发送
                                await client.post(f"http://127.0.0.1:8200/api/notify/{nid}/sent")
                            except Exception as e:
                                logger.error(f"Push notification error: {e}")
        except Exception as e:
            pass  # 静默失败，避免刷日志
        await asyncio.sleep(3)


async def start_wecom_bot():
    """启动企微Bot - 完整版（收消息+回复+主动推送）"""
    global _ws_client

    try:
        bot_id = await get_config("wecom_bot.bot_id") or ""
        secret = await get_config("wecom_bot.secret") or ""

        if not bot_id or not secret:
            logger.warning("WecomBot: bot_id or secret not configured")
            return

        try:
            from aibot import WSClient, WSClientOptions

            options = WSClientOptions(
                bot_id=bot_id,
                secret=secret,
            )
            ws_client = WSClient(options)
            _ws_client = ws_client

            @ws_client.on_text_message
            async def on_text(message):
                try:
                    body = message.get("body", message)
                    text = body.get("text", {}).get("content", "") or body.get("content", "") or str(body)
                    # 去掉 @机器人 前缀
                    if "@" in text:
                        parts = text.split(" ", 1)
                        text = parts[1].strip() if len(parts) > 1 else text.strip()
                    sender = body.get("from", {}).get("userid", "") or body.get("from", "") or ""
                    chatid = body.get("chatid", "") or body.get("chat_id", "")
                    chattype = body.get("chattype", "group")

                    logger.info(f"收到消息 [{chattype}] from {sender}: {text}")

                    # 保存 chatid 关键词方便配置
                    if "群ID" in text or "chatid" in text.lower():
                        reply = f"当前会话ID：`{chatid}`"
                    else:
                        reply = await _get_reply_from_chat(text, sender, chatid, chattype)

                    await ws_client.reply_stream(message, reply)
                    logger.info(f"已回复: {reply[:80]}")
                except Exception as e:
                    logger.error(f"处理消息失败: {e}")

            # 同时启动通知轮询
            asyncio.create_task(_poll_and_push_notifications(ws_client))

            logger.info("WecomBot (WSClient) starting...")
            await ws_client.run()

        except ImportError:
            logger.warning("aibot WSClient not available, trying AiBot...")
            try:
                from aibot import AiBot

                class ShowroomBot(AiBot):
                    async def on_message(self, message):
                        body = message if isinstance(message, dict) else {}
                        text = body.get("text", {}).get("content", "") or str(body)
                        if "@" in text:
                            parts = text.split(" ", 1)
                            text = parts[1].strip() if len(parts) > 1 else text.strip()
                        sender = body.get("from", {}).get("userid", "") or ""
                        chatid = body.get("chatid", "")
                        chattype = body.get("chattype", "group")
                        if "群ID" in text or "chatid" in text.lower():
                            reply = f"当前会话ID：`{chatid}`"
                        else:
                            reply = await _get_reply_from_chat(text, sender, chatid, chattype)
                        await self.reply(message, reply)

                    async def on_at_message(self, message):
                        await self.on_message(message)

                bot = ShowroomBot(bot_id=bot_id, secret=secret)
                logger.info("WecomBot (AiBot) starting...")
                await bot.run()
            except Exception as e:
                logger.error(f"AiBot failed: {e}")
                while True:
                    await asyncio.sleep(60)

    except Exception as e:
        logger.error(f"WecomBot start failed: {e}")


def start_bot_background():
    """在后台启动Bot"""
    loop = asyncio.get_event_loop()
    loop.create_task(start_wecom_bot())
    logger.info("WecomBot task created")


if __name__ == "__main__":
    import sys
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    logger.info("Starting WecomBot standalone...")
    asyncio.run(start_wecom_bot())
