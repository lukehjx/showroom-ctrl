from fastapi import APIRouter
from database import async_session
from schemas import ok, err
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["visitor-logs"])


@router.get("/visitor-logs")
async def list_visitor_logs():
    try:
        from sqlalchemy import text
        async with async_session() as session:
            result = await session.execute(
                text("SELECT * FROM visitor_logs ORDER BY arrived_at DESC LIMIT 200")
            )
            rows = result.mappings().all()
            data = []
            for r in rows:
                d = dict(r)
                for k in ['arrived_at', 'left_at']:
                    if k in d and d[k] is not None:
                        d[k] = str(d[k])
                data.append(d)
        return ok(data)
    except Exception as e:
        logger.error(f"List visitor logs error: {e}")
        return err(str(e))
