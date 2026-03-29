from fastapi import APIRouter, HTTPException
from database import async_session
from schemas import ok, err
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["wecom-users"])


@router.get("/wecom-users")
async def list_wecom_users():
    try:
        from sqlalchemy import text
        async with async_session() as session:
            result = await session.execute(
                text("SELECT * FROM wecom_users ORDER BY id")
            )
            rows = result.mappings().all()
            data = []
            for r in rows:
                d = dict(r)
                for k in ['first_seen_at', 'updated_at']:
                    if k in d and d[k] is not None:
                        d[k] = str(d[k])
                data.append(d)
        return ok(data)
    except Exception as e:
        logger.error(f"List wecom users error: {e}")
        return err(str(e))


@router.put("/wecom-users/{user_id}")
async def update_wecom_user(user_id: int, data: dict):
    try:
        from sqlalchemy import text
        fields = []
        values = {"id": user_id}
        for k in ['display_name', 'self_reported_name', 'name_confirmed']:
            if k in data:
                fields.append(f"{k}=:{k}")
                values[k] = data[k]
        if not fields:
            raise HTTPException(400, "No fields to update")
        fields.append("updated_at=NOW()")
        async with async_session() as session:
            await session.execute(
                text(f"UPDATE wecom_users SET {', '.join(fields)} WHERE id=:id"),
                values
            )
            await session.commit()
        return ok({"status": "ok"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update wecom user error: {e}")
        return err(str(e))
