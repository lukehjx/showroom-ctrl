from fastapi import APIRouter
from sqlalchemy import select
from database import async_session
from models import CloudTerminal, CloudResource
from schemas import ok, err
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["terminals"])


@router.get("/terminals")
async def list_terminals():
    try:
        async with async_session() as session:
            result = await session.execute(select(CloudTerminal).order_by(CloudTerminal.terminal_id))
            terminals = result.scalars().all()
            data = [{
                "id": t.id,
                "terminal_id": t.terminal_id,
                "special_terminal_id": t.special_terminal_id,
                "name": t.name,
                "ip": t.ip,
                "port": t.port,
                "exhibition_id": t.exhibition_id,
                "synced_at": str(t.synced_at)
            } for t in terminals]
        return ok(data)
    except Exception as e:
        logger.error(f"List terminals error: {e}")
        return err(str(e))


@router.get("/terminals/{terminal_id}/resources")
async def get_terminal_resources(terminal_id: int):
    try:
        async with async_session() as session:
            result = await session.execute(
                select(CloudResource).where(CloudResource.terminal_id == terminal_id).order_by(CloudResource.sort)
            )
            resources = result.scalars().all()
            data = [{
                "id": r.id,
                "resource_id": r.resource_id,
                "terminal_id": r.terminal_id,
                "title": r.title,
                "description": r.description,
                "sort": r.sort,
                "file_name": r.file_name,
                "synced_at": str(r.synced_at)
            } for r in resources]
        return ok(data)
    except Exception as e:
        logger.error(f"Get terminal resources error: {e}")
        return err(str(e))


@router.get("/resources")
async def list_resources():
    try:
        async with async_session() as session:
            result = await session.execute(select(CloudResource).order_by(CloudResource.terminal_id, CloudResource.sort))
            resources = result.scalars().all()
            data = [{
                "id": r.id,
                "resource_id": r.resource_id,
                "terminal_id": r.terminal_id,
                "exhibit_id": r.exhibit_id,
                "title": r.title,
                "description": r.description,
                "sort": r.sort,
                "file_name": r.file_name,
                "synced_at": str(r.synced_at)
            } for r in resources]
        return ok(data)
    except Exception as e:
        logger.error(f"List resources error: {e}")
        return err(str(e))


@router.get("/commands")
async def list_commands(protocol_type: str = None):
    try:
        from models import CloudCommand
        from sqlalchemy import and_
        async with async_session() as session:
            query = select(CloudCommand).order_by(CloudCommand.group_name, CloudCommand.command_id)
            if protocol_type:
                query = select(CloudCommand).where(
                    CloudCommand.protocol_type == protocol_type
                ).order_by(CloudCommand.group_name, CloudCommand.command_id)
            result = await session.execute(query)
            commands = result.scalars().all()
            data = [{
                "id": c.id,
                "command_id": c.command_id,
                "name": c.name,
                "command_type": c.command_type,
                "command_str": c.command_str,
                "encoding": c.encoding,
                "group_name": c.group_name,
                "protocol_type": c.protocol_type,
                "is_hex": c.is_hex,
                "url": c.url,
                "area_id": c.area_id,
                "area_name": c.area_name,
                "synced_at": str(c.synced_at)
            } for c in commands]
        return ok(data)
    except Exception as e:
        logger.error(f"List commands error: {e}")
        return err(str(e))
