from fastapi import APIRouter, HTTPException
from database import async_session
from schemas import ok, err
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["notify-groups"])


@router.get("/notify-groups")
async def list_notify_groups():
    try:
        from sqlalchemy import text
        async with async_session() as session:
            result = await session.execute(
                text("SELECT * FROM notify_groups ORDER BY id")
            )
            rows = result.mappings().all()
            data = []
            for r in rows:
                d = dict(r)
                for k in ['created_at', 'updated_at']:
                    if k in d and d[k] is not None:
                        d[k] = str(d[k])
                data.append(d)
        return ok(data)
    except Exception as e:
        logger.error(f"List notify groups error: {e}")
        return err(str(e))


@router.post("/notify-groups")
async def create_notify_group(data: dict):
    try:
        from sqlalchemy import text
        name = data.get("name", "")
        chat_id = data.get("chat_id", "")
        if not name or not chat_id:
            raise HTTPException(400, "name and chat_id are required")
        async with async_session() as session:
            result = await session.execute(
                text("""INSERT INTO notify_groups (name, chat_id, enabled, created_at, updated_at)
                     VALUES (:name, :chat_id, TRUE, NOW(), NOW()) RETURNING *"""),
                {"name": name, "chat_id": chat_id}
            )
            row = result.mappings().one()
            await session.commit()
            d = dict(row)
            for k in ['created_at', 'updated_at']:
                if k in d and d[k] is not None:
                    d[k] = str(d[k])
        return ok(d)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create notify group error: {e}")
        return err(str(e))


@router.patch("/notify-groups/{group_id}")
async def update_notify_group(group_id: int, data: dict):
    try:
        from sqlalchemy import text
        fields = []
        values = {"id": group_id}
        for k in ['name', 'chat_id', 'enabled', 'notify_types']:
            if k in data:
                fields.append(f"{k}=:{k}")
                values[k] = data[k]
        if not fields:
            raise HTTPException(400, "No fields to update")
        fields.append("updated_at=NOW()")
        async with async_session() as session:
            await session.execute(
                text(f"UPDATE notify_groups SET {', '.join(fields)} WHERE id=:id"),
                values
            )
            await session.commit()
        return ok({"status": "ok"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update notify group error: {e}")
        return err(str(e))


@router.delete("/notify-groups/{group_id}")
async def delete_notify_group(group_id: int):
    try:
        from sqlalchemy import text
        async with async_session() as session:
            await session.execute(
                text("DELETE FROM notify_groups WHERE id=:id"),
                {"id": group_id}
            )
            await session.commit()
        return ok({"status": "ok"})
    except Exception as e:
        logger.error(f"Delete notify group error: {e}")
        return err(str(e))
