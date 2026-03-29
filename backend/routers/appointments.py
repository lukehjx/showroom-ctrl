from fastapi import APIRouter, HTTPException
from database import async_session
from schemas import ok, err
from typing import Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["appointments"])


@router.get("/appointments")
async def list_appointments(status: Optional[str] = None):
    try:
        from sqlalchemy import text
        async with async_session() as session:
            if status:
                result = await session.execute(
                    text("SELECT * FROM appointments WHERE status=:status ORDER BY visit_time DESC"),
                    {"status": status}
                )
            else:
                result = await session.execute(
                    text("SELECT * FROM appointments ORDER BY visit_time DESC")
                )
            rows = result.mappings().all()
            data = []
            for r in rows:
                d = dict(r)
                for k in ['visit_time', 'created_at', 'updated_at']:
                    if k in d and d[k] is not None:
                        d[k] = str(d[k])
                data.append(d)
        return ok(data)
    except Exception as e:
        logger.error(f"List appointments error: {e}")
        return err(str(e))


@router.post("/appointments")
async def create_appointment(data: dict):
    try:
        from sqlalchemy import text
        visitor_name = data.get("visitor_name", "")
        visit_time = data.get("visit_time")
        notes = data.get("notes", "")
        purpose = data.get("purpose", "")
        creator_name = data.get("creator_name", "")
        creator_userid = data.get("creator_userid", "")
        if not visitor_name:
            raise HTTPException(400, "visitor_name is required")
        async with async_session() as session:
            result = await session.execute(
                text("""INSERT INTO appointments (visitor_name, visit_time, notes, purpose, creator_name, creator_userid, status, created_at, updated_at)
                     VALUES (:visitor_name, :visit_time, :notes, :purpose, :creator_name, :creator_userid, 'pending', NOW(), NOW())
                     RETURNING *"""),
                {"visitor_name": visitor_name, "visit_time": visit_time, "notes": notes,
                 "purpose": purpose, "creator_name": creator_name, "creator_userid": creator_userid}
            )
            row = result.mappings().one()
            await session.commit()
            d = dict(row)
            for k in ['visit_time', 'created_at', 'updated_at']:
                if k in d and d[k] is not None:
                    d[k] = str(d[k])
        return ok(d)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create appointment error: {e}")
        return err(str(e))


@router.patch("/appointments/{apt_id}")
async def update_appointment(apt_id: int, data: dict):
    try:
        from sqlalchemy import text
        fields = []
        values = {"id": apt_id}
        for k in ['status', 'notes', 'visitor_name', 'visit_time', 'purpose', 'attendees']:
            if k in data:
                fields.append(f"{k}=:{k}")
                values[k] = data[k]
        if not fields:
            raise HTTPException(400, "No fields to update")
        fields.append("updated_at=NOW()")
        async with async_session() as session:
            await session.execute(
                text(f"UPDATE appointments SET {', '.join(fields)} WHERE id=:id"),
                values
            )
            await session.commit()
        return ok({"status": "ok"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update appointment error: {e}")
        return err(str(e))


@router.delete("/appointments/{apt_id}")
async def delete_appointment(apt_id: int):
    try:
        from sqlalchemy import text
        async with async_session() as session:
            await session.execute(
                text("DELETE FROM appointments WHERE id=:id"),
                {"id": apt_id}
            )
            await session.commit()
        return ok({"status": "ok"})
    except Exception as e:
        logger.error(f"Delete appointment error: {e}")
        return err(str(e))
