#!/usr/bin/env python3
"""
展厅智控系统 - 企微机器人
使用 aibot WSClient 长连接，接收群消息触发展厅控制
"""
import asyncio
import logging
import httpx
import os
import sys

from aibot import WSClient, WSClientOptions, generate_req_id

# Bot 配置（从环境变量或硬编码，也可从数据库读）
BOT_ID = os.environ.get("WECOM_BOT_ID", "aibQrNJ78ZCf_Nmy2QSxQVTr_N4QsbplePy")
BOT_SECRET = os.environ.get("WECOM_BOT_SECRET", "yac9cTn8MGLEx6tbh4IDiJexrTdS1ptiHIYkIZyAbg5")
ROBOT_SN = os.environ.get("ROBOT_SN", "MC1BCN2K100262058CA0")
API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8200")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("/var/log/showroom-bot.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

ws_client = WSClient(WSClientOptions(bot_id=BOT_ID, secret=BOT_SECRET))
last_frame = None  # 记录最后一个会话 frame，用于主动推送
log.info(f"Showroom Bot starting, BotID: {BOT_ID}")


@ws_client.on("authenticated")
async def on_auth():
    log.info("企微 Bot 认证成功，开始监听消息")


@ws_client.on("message.text")
async def on_message(frame):
    """接收文本消息，调用展厅智控意图识别"""
    body = frame.get("body", {})
    text_content = body.get("text", {}).get("content", "").strip()
    sender = body.get("from", {}).get("name", "") or body.get("from_user", "")
    chattype = body.get("chattype", "")

    log.info(f"收到消息 [{chattype}] from {sender}: {text_content[:80]}")

    if not text_content:
        return

    # 调用展厅智控意图识别
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{API_BASE}/api/chat/input",
                json={
                    "event": "text",
                    "robot_sn": ROBOT_SN,
                    "text": text_content,
                    "wecom_user_key": sender,
                    "operator": "bot",
                    "params": {"sender": sender, "chattype": chattype},
                },
            )
            data = resp.json()
            result = data.get("data", {})
            intent = result.get("intent", "unknown")
            reply = result.get("result", {})
            log.info(f"意图识别: {intent}, 结果: {str(reply)[:100]}")

            # 构建回复消息
            if isinstance(reply, dict) and reply.get("message"):
                reply_text = reply["message"]
            elif isinstance(reply, str):
                reply_text = reply
            else:
                reply_text = f"✅ 已执行：{intent}"

            # 回复到对话
            await ws_client.reply_stream(
                frame, generate_req_id("stream"), reply_text, finish=True
            )

    except Exception as e:
        log.error(f"处理消息失败: {e}")
        try:
            await ws_client.reply_stream(
                frame, generate_req_id("stream"), f"❌ 处理失败: {str(e)[:100]}", finish=True
            )
        except Exception:
            pass


if __name__ == "__main__":
    log.info("Starting Showroom WecomBot...")
    # 启动企微推送轮询（每3秒检查 bot_notifications 表）
    import asyncio, asyncpg

    async def poll_notifications():
        DB_URL = os.environ.get("DATABASE_URL", "postgresql://showroom:showroom123@127.0.0.1:5432/showroom")
        # 转成 asyncpg 格式
        db_url = DB_URL.replace("postgresql://", "postgres://").replace("+asyncpg", "")
        while True:
            try:
                conn = await asyncpg.connect(db_url, timeout=5)
                rows = await conn.fetch(
                    "SELECT id, message FROM bot_notifications WHERE sent=FALSE ORDER BY id LIMIT 5"
                )
                for row in rows:
                    try:
                        await ws_client.send_text(row["message"])
                        log.info(f"Bot pushed notification: {row['message'][:50]}")
                    except Exception as e:
                        log.warning(f"Bot push failed: {e}")
                    await conn.execute("UPDATE bot_notifications SET sent=TRUE WHERE id=$1", row["id"])
                await conn.close()
            except Exception as e:
                log.debug(f"Poll notifications error: {e}")
            await asyncio.sleep(3)

    loop = asyncio.get_event_loop()
    loop.create_task(poll_notifications())
    ws_client.run()
