from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.dict_noun import DictNoun
from app.schemas.schemas import (
    DictNounCreate,
    DictNounResponse,
    DictNounUpdate,
    PaginatedResponse,
)
from app.utils import generate_snowflake_id, now_timestamp


router = APIRouter(prefix="/api/dict-nouns", tags=["dict-nouns"])


async def _next_random_int(db: AsyncSession) -> int:
    result = await db.execute(select(func.max(DictNoun.random_int)))
    return (result.scalar() or 0) + 1


@router.get("", response_model=PaginatedResponse)
async def list_dict_nouns(
    q: Optional[str] = Query(None, description="按名称或描述搜索"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DictNoun)
    count_stmt = select(func.count()).select_from(DictNoun)

    if q:
        pattern = f"%{q.strip()}%"
        condition = or_(DictNoun.name.like(pattern), DictNoun.description.like(pattern))
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    stmt = (
        stmt.order_by(DictNoun.sort_order.desc(), DictNoun.random_int.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    total_result = await db.execute(count_stmt)
    result = await db.execute(stmt)

    return {
        "total": total_result.scalar() or 0,
        "page": page,
        "page_size": page_size,
        "items": result.scalars().all(),
    }


@router.get("/random", response_model=list[DictNounResponse])
async def random_dict_nouns(
    limit: int = Query(1, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DictNoun).order_by(func.rand()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{noun_id}", response_model=DictNounResponse)
async def get_dict_noun(noun_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DictNoun).where(DictNoun.id == noun_id))
    noun = result.scalar_one_or_none()
    if not noun:
        raise HTTPException(status_code=404, detail="名词不存在")
    return noun


@router.post("", response_model=DictNounResponse, status_code=201)
async def create_dict_noun(body: DictNounCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(DictNoun).where(DictNoun.name == body.name).limit(1))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="名词已存在")

    noun = DictNoun(
        id=generate_snowflake_id(),
        create_time=now_timestamp(),
        update_time=now_timestamp(),
        name=body.name,
        description=body.description,
        sort_order=body.sort_order,
        random_int=await _next_random_int(db),
    )
    db.add(noun)
    await db.flush()
    await db.refresh(noun)
    return noun


@router.put("/{noun_id}", response_model=DictNounResponse)
async def update_dict_noun(
    noun_id: str,
    body: DictNounUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DictNoun).where(DictNoun.id == noun_id))
    noun = result.scalar_one_or_none()
    if not noun:
        raise HTTPException(status_code=404, detail="名词不存在")

    update_data = body.model_dump(exclude_unset=True)
    new_name = update_data.get("name")
    if new_name and new_name != noun.name:
        existing = await db.execute(select(DictNoun).where(DictNoun.name == new_name).limit(1))
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="名词已存在")

    update_data["update_time"] = now_timestamp()
    for key, value in update_data.items():
        setattr(noun, key, value)

    await db.flush()
    await db.refresh(noun)
    return noun


@router.delete("/{noun_id}", status_code=204)
async def delete_dict_noun(noun_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DictNoun).where(DictNoun.id == noun_id))
    noun = result.scalar_one_or_none()
    if not noun:
        raise HTTPException(status_code=404, detail="名词不存在")

    await db.delete(noun)
