import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    logger.info("Starting showroom backend...")

    from database import init_db
    await init_db()

    from config import init_config
    await init_config()

    # 启动TCP监听服务
    from tcp_service import tcp_listen_server
    from models import CurrentScene
    from database import async_session
    from sqlalchemy import select
    from datetime import datetime

    async def on_scene_update(scene_id: int, message: str):
        logger.info(f"TCP scene update: {scene_id} from message: {message}")
        try:
            async with async_session() as session:
                # 查找场景名称
                from models import CloudScene
                result = await session.execute(
                    select(CloudScene).where(CloudScene.scene_id == scene_id).limit(1)
                )
                cloud_scene = result.scalar_one_or_none()
                scene_name = cloud_scene.name if cloud_scene else f"Scene {scene_id}"

                existing = await session.execute(select(CurrentScene).limit(1))
                current = existing.scalar_one_or_none()
                if current:
                    current.scene_id = scene_id
                    current.scene_name = scene_name
                    current.updated_at = datetime.now()
                else:
                    session.add(CurrentScene(scene_id=scene_id, scene_name=scene_name, updated_at=datetime.now()))
                await session.commit()
            logger.info(f"Scene updated to {scene_id} ({scene_name})")

            # 触发同步
            from cloud_sync import sync_scenes
            asyncio.create_task(sync_scenes())
        except Exception as e:
            logger.error(f"Scene update error: {e}")

    tcp_listen_server.set_scene_update_callback(on_scene_update)
    tcp_task = asyncio.create_task(tcp_listen_server.start("0.0.0.0", 19888))

    # 启动APScheduler
    from scheduler import start_scheduler
    await start_scheduler()

    # 启动设备监控
    from device_monitor import start_monitor
    start_monitor()

    # 启动企微Bot（后台）
    from wecom_bot import start_bot_background
    start_bot_background()

    logger.info("All services started")
    yield

    # 关闭
    await tcp_listen_server.stop()
    tcp_task.cancel()
    logger.info("Showroom backend stopped")


app = FastAPI(
    title="Showroom Control Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "showroom-ctrl"}


# 注册所有路由
from routers import config, sync, terminals, exhibits, routes, chat, robots, scenes, logs, nav_positions
from routers import ws_robot, robot_status
from routers import presets, schedules, kiosk, reception, qrcode, device_status

app.include_router(config.router)
app.include_router(sync.router)
app.include_router(terminals.router)
app.include_router(exhibits.router)
app.include_router(routes.router)
app.include_router(chat.router)
app.include_router(robots.router)
app.include_router(scenes.router)
app.include_router(logs.router)
app.include_router(nav_positions.router)
app.include_router(presets.router)
app.include_router(schedules.router)
app.include_router(kiosk.router)
app.include_router(reception.router)
app.include_router(qrcode.router)
app.include_router(device_status.router)
app.include_router(ws_robot.router)
app.include_router(robot_status.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8200,
        reload=False,
        log_level="info"
    )
