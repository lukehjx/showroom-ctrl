import logging
import asyncio
import httpx
from config import get_config

logger = logging.getLogger(__name__)

_bot_task = None


async def handle_message(message: dict):
    """处理企微机器人消息"""
    try:
        content = message.get("content", "") or message.get("text", "") or str(message)
        sender = message.get("sender", "") or message.get("from", "")
        robot_sn = await get_config("robot.sn") or ""

        logger.info(f"WecomBot received message from {sender}: {content}")

        # 调用本地chat/input接口
        payload = {
            "event": "voice_input",
            "robot_sn": robot_sn,
            "params": {"text": content, "sender": sender}
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post("http://localhost:8200/api/chat/input", json=payload)
            logger.info(f"Chat input response: {resp.status_code} {resp.text[:200]}")

    except Exception as e:
        logger.error(f"WecomBot handle_message error: {e}")


async def start_wecom_bot():
    """启动企微Bot"""
    try:
        bot_id = await get_config("wecom_bot.bot_id") or ""
        secret = await get_config("wecom_bot.secret") or ""

        if not bot_id or not secret:
            logger.warning("WecomBot: bot_id or secret not configured")
            return

        try:
            from aibot import AiBot

            class ShowroomBot(AiBot):
                async def on_message(self, message):
                    await handle_message(message)

                async def on_at_message(self, message):
                    await handle_message(message)

            bot = ShowroomBot(bot_id=bot_id, secret=secret)
            logger.info("WecomBot starting...")
            await bot.run()
        except ImportError:
            logger.warning("aibot not installed, using mock mode")
        except Exception as e:
            logger.error(f"WecomBot error: {e}")

    except Exception as e:
        logger.error(f"WecomBot start failed: {e}")


def start_bot_background():
    """在后台启动Bot"""
    global _bot_task
    loop = asyncio.get_event_loop()
    _bot_task = loop.create_task(start_wecom_bot())
    logger.info("WecomBot task created")
