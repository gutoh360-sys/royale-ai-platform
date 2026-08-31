from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.di import get_db_session
from backend.core.security.deps import require_admin_auth
from backend.database.models.sales_channel import SalesChannel
from backend.modules.sales_channel.schemas import SalesChannelResponse

router = APIRouter(prefix="/sales-channels", tags=["sales-channels"])


@router.get(
    "",
    response_model=list[SalesChannelResponse],
    dependencies=[Depends(require_admin_auth)],
)
async def list_sales_channels(
    session: AsyncSession = Depends(get_db_session),
) -> list[SalesChannel]:
    result = await session.execute(select(SalesChannel).order_by(SalesChannel.name, SalesChannel.id))
    return list(result.scalars().all())
