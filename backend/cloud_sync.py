import logging
import httpx
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import async_session
from models import CloudTerminal, CloudResource, CloudCommand, CloudScene, SyncLog
from config import get_config

logger = logging.getLogger(__name__)


async def get_cloud_client() -> httpx.AsyncClient:
    basic_user = await get_config("cloud.basic_auth_user") or "admin"
    basic_pass = await get_config("cloud.basic_auth_pass") or "admin123"
    return httpx.AsyncClient(
        auth=(basic_user, basic_pass),
        timeout=30,
        verify=False
    )


async def get_token(client: httpx.AsyncClient) -> str:
    """每次请求前重新登录获取新token（nonce机制）"""
    api_url = await get_config("cloud.api_url") or "http://112.20.77.18:7772"
    account = await get_config("cloud.account") or "ZhanGuan"
    password = await get_config("cloud.password") or "sidex@123"

    try:
        resp = await client.post(
            f"{api_url}/app/authority/api/v1/login",
            params={"account": account, "password": password}
        )
        data = resp.json()
        token = data.get("data", {}).get("token") or data.get("token")
        if not token:
            # Try alternate response structure
            token = data.get("data") if isinstance(data.get("data"), str) else None
        logger.debug(f"Got cloud token: {token[:20] if token else 'None'}...")
        return token
    except Exception as e:
        logger.error(f"Cloud login failed: {e}")
        raise


async def sync_terminals() -> dict:
    """同步终端数据"""
    sync_log = SyncLog(sync_type="terminals", status="running", created_at=datetime.now())
    async with async_session() as session:
        session.add(sync_log)
        await session.commit()
        await session.refresh(sync_log)

    try:
        api_url = await get_config("cloud.api_url") or "http://112.20.77.18:7772"
        exhibition_id = await get_config("cloud.exhibition_id") or "5"

        async with await get_cloud_client() as client:
            token = await get_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            # 尝试多个可能的接口
            endpoints = [
                f"{api_url}/app/special/api/v1/terminal/list",
                f"{api_url}/app/special/api/v1/terminals",
                f"{api_url}/app/special/api/v1/exhibition/{exhibition_id}/terminals",
            ]

            terminals = []
            for endpoint in endpoints:
                try:
                    resp = await client.get(endpoint, headers=headers, params={"exhibitionId": exhibition_id, "pageSize": 1000, "pageNum": 1})
                    if resp.status_code == 200:
                        data = resp.json()
                        records = (data.get("data", {}) or {})
                        if isinstance(records, list):
                            terminals = records
                        elif isinstance(records, dict):
                            terminals = records.get("list") or records.get("records") or records.get("rows") or []
                        if terminals:
                            logger.info(f"Got {len(terminals)} terminals from {endpoint}")
                            break
                except Exception as e:
                    logger.debug(f"Terminal endpoint {endpoint} failed: {e}")
                    continue

        async with async_session() as session:
            await session.execute(delete(CloudTerminal))
            for t in terminals:
                terminal = CloudTerminal(
                    terminal_id=t.get("id") or t.get("terminalId"),
                    special_terminal_id=t.get("specialTerminalId") or t.get("special_terminal_id"),
                    name=t.get("name") or t.get("terminalName", ""),
                    ip=t.get("ip") or t.get("terminalIp", ""),
                    port=t.get("port") or t.get("terminalPort"),
                    exhibition_id=int(exhibition_id),
                    raw_data=t,
                    synced_at=datetime.now()
                )
                session.add(terminal)

            sync_log.status = "success"
            sync_log.records_count = len(terminals)
            session.add(sync_log)
            await session.commit()

        return {"type": "terminals", "count": len(terminals)}

    except Exception as e:
        logger.error(f"Sync terminals failed: {e}")
        async with async_session() as session:
            sync_log.status = "failed"
            sync_log.error = str(e)
            session.add(sync_log)
            await session.commit()
        return {"type": "terminals", "count": 0, "error": str(e)}


async def sync_resources() -> dict:
    """同步资源数据"""
    sync_log = SyncLog(sync_type="resources", status="running", created_at=datetime.now())
    async with async_session() as session:
        session.add(sync_log)
        await session.commit()
        await session.refresh(sync_log)

    try:
        api_url = await get_config("cloud.api_url") or "http://112.20.77.18:7772"
        exhibition_id = await get_config("cloud.exhibition_id") or "5"

        async with await get_cloud_client() as client:
            token = await get_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            endpoints = [
                f"{api_url}/app/special/api/v1/resource/list",
                f"{api_url}/app/special/api/v1/resources",
                f"{api_url}/app/special/api/v1/exhibition/{exhibition_id}/resources",
            ]

            resources = []
            for endpoint in endpoints:
                try:
                    resp = await client.get(endpoint, headers=headers, params={"exhibitionId": exhibition_id, "pageSize": 1000, "pageNum": 1})
                    if resp.status_code == 200:
                        data = resp.json()
                        records = data.get("data", {}) or {}
                        if isinstance(records, list):
                            resources = records
                        elif isinstance(records, dict):
                            resources = records.get("list") or records.get("records") or records.get("rows") or []
                        if resources:
                            logger.info(f"Got {len(resources)} resources from {endpoint}")
                            break
                except Exception as e:
                    logger.debug(f"Resource endpoint {endpoint} failed: {e}")
                    continue

        async with async_session() as session:
            await session.execute(delete(CloudResource))
            for r in resources:
                resource = CloudResource(
                    resource_id=r.get("id") or r.get("resourceId"),
                    terminal_id=r.get("terminalId") or r.get("terminal_id"),
                    exhibit_id=r.get("exhibitId") or r.get("exhibit_id"),
                    title=r.get("title") or r.get("name", ""),
                    description=r.get("description", ""),
                    sort=r.get("sort") or r.get("sortOrder", 0),
                    file_name=r.get("fileName") or r.get("file_name", ""),
                    raw_data=r,
                    synced_at=datetime.now()
                )
                session.add(resource)

            sync_log.status = "success"
            sync_log.records_count = len(resources)
            session.add(sync_log)
            await session.commit()

        return {"type": "resources", "count": len(resources)}

    except Exception as e:
        logger.error(f"Sync resources failed: {e}")
        async with async_session() as session:
            sync_log.status = "failed"
            sync_log.error = str(e)
            session.add(sync_log)
            await session.commit()
        return {"type": "resources", "count": 0, "error": str(e)}


async def sync_commands() -> dict:
    """同步命令数据"""
    sync_log = SyncLog(sync_type="commands", status="running", created_at=datetime.now())
    async with async_session() as session:
        session.add(sync_log)
        await session.commit()
        await session.refresh(sync_log)

    try:
        api_url = await get_config("cloud.api_url") or "http://112.20.77.18:7772"

        async with await get_cloud_client() as client:
            token = await get_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            endpoints = [
                f"{api_url}/app/command/api/v1/command/list",
                f"{api_url}/app/command/api/v1/commands",
                f"{api_url}/app/command/api/v1/list",
            ]

            commands = []
            for endpoint in endpoints:
                try:
                    resp = await client.get(endpoint, headers=headers, params={"pageSize": 1000, "pageNum": 1})
                    if resp.status_code == 200:
                        data = resp.json()
                        records = data.get("data", {}) or {}
                        if isinstance(records, list):
                            commands = records
                        elif isinstance(records, dict):
                            commands = records.get("list") or records.get("records") or records.get("rows") or []
                        if commands:
                            logger.info(f"Got {len(commands)} commands from {endpoint}")
                            break
                except Exception as e:
                    logger.debug(f"Command endpoint {endpoint} failed: {e}")
                    continue

        async with async_session() as session:
            await session.execute(delete(CloudCommand))
            for c in commands:
                command = CloudCommand(
                    command_id=c.get("id") or c.get("commandId"),
                    name=c.get("name") or c.get("commandName", ""),
                    command_type=c.get("type") or c.get("commandType", ""),
                    command_str=c.get("commandStr") or c.get("command", ""),
                    encoding=c.get("encoding", "utf-8"),
                    group_name=c.get("groupName") or c.get("group", ""),
                    raw_data=c,
                    synced_at=datetime.now()
                )
                session.add(command)

            sync_log.status = "success"
            sync_log.records_count = len(commands)
            session.add(sync_log)
            await session.commit()

        return {"type": "commands", "count": len(commands)}

    except Exception as e:
        logger.error(f"Sync commands failed: {e}")
        async with async_session() as session:
            sync_log.status = "failed"
            sync_log.error = str(e)
            session.add(sync_log)
            await session.commit()
        return {"type": "commands", "count": 0, "error": str(e)}


async def sync_scenes() -> dict:
    """同步专场数据"""
    sync_log = SyncLog(sync_type="scenes", status="running", created_at=datetime.now())
    async with async_session() as session:
        session.add(sync_log)
        await session.commit()
        await session.refresh(sync_log)

    try:
        api_url = await get_config("cloud.api_url") or "http://112.20.77.18:7772"
        exhibition_id = await get_config("cloud.exhibition_id") or "5"

        async with await get_cloud_client() as client:
            token = await get_token(client)
            headers = {"Authorization": f"Bearer {token}"}

            endpoints = [
                f"{api_url}/app/special/api/v1/special/list",
                f"{api_url}/app/special/api/v1/scenes",
                f"{api_url}/app/special/api/v1/scene/list",
                f"{api_url}/app/special/api/v1/exhibition/{exhibition_id}/scenes",
            ]

            scenes = []
            for endpoint in endpoints:
                try:
                    resp = await client.get(endpoint, headers=headers, params={"exhibitionId": exhibition_id, "pageSize": 1000, "pageNum": 1})
                    if resp.status_code == 200:
                        data = resp.json()
                        records = data.get("data", {}) or {}
                        if isinstance(records, list):
                            scenes = records
                        elif isinstance(records, dict):
                            scenes = records.get("list") or records.get("records") or records.get("rows") or []
                        if scenes:
                            logger.info(f"Got {len(scenes)} scenes from {endpoint}")
                            break
                except Exception as e:
                    logger.debug(f"Scene endpoint {endpoint} failed: {e}")
                    continue

        async with async_session() as session:
            await session.execute(delete(CloudScene))
            for s in scenes:
                scene = CloudScene(
                    scene_id=s.get("id") or s.get("sceneId") or s.get("specialId"),
                    name=s.get("name") or s.get("sceneName") or s.get("specialName", ""),
                    exhibition_id=int(exhibition_id),
                    raw_data=s,
                    synced_at=datetime.now()
                )
                session.add(scene)

            sync_log.status = "success"
            sync_log.records_count = len(scenes)
            session.add(sync_log)
            await session.commit()

        return {"type": "scenes", "count": len(scenes)}

    except Exception as e:
        logger.error(f"Sync scenes failed: {e}")
        async with async_session() as session:
            sync_log.status = "failed"
            sync_log.error = str(e)
            session.add(sync_log)
            await session.commit()
        return {"type": "scenes", "count": 0, "error": str(e)}


async def sync_all() -> dict:
    """全量同步"""
    results = {}
    for sync_func, name in [
        (sync_terminals, "terminals"),
        (sync_resources, "resources"),
        (sync_commands, "commands"),
        (sync_scenes, "scenes"),
    ]:
        try:
            result = await sync_func()
            results[name] = result
        except Exception as e:
            logger.error(f"Sync {name} error: {e}")
            results[name] = {"type": name, "count": 0, "error": str(e)}
    return results
