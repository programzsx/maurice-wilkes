from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dict_catalog import WORD_TYPE_BY_KEY, WORD_TYPES
from app.models.dict_entries import DICT_MODEL_BY_KEY, DictNoun
from app.schemas.schemas import DictEntryCreate, DictEntryResponse, DictEntryUpdate, PaginatedResponse
from app.utils import generate_snowflake_id, now_timestamp


router = APIRouter(prefix="/api/dict", tags=["dict"])
compat_router = APIRouter(prefix="/api/dict-nouns", tags=["dict-nouns"])


def _get_model(word_type: str):
    model = DICT_MODEL_BY_KEY.get(word_type)
    if not model:
        raise HTTPException(status_code=404, detail="词性不存在")
    return model


async def _next_random_int(model, db: AsyncSession) -> int:
    result = await db.execute(select(func.max(model.random_int)))
    return (result.scalar() or 0) + 1


async def _list_entries(
    model,
    q: Optional[str],
    page: int,
    page_size: int,
    db: AsyncSession,
):
    stmt = select(model)
    count_stmt = select(func.count()).select_from(model)

    if q:
        pattern = f"%{q.strip()}%"
        condition = or_(model.name.like(pattern), model.description.like(pattern))
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    stmt = (
        stmt.order_by(model.sort_order.desc(), model.random_int.desc())
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


async def _get_entry(model, entry_id: str, db: AsyncSession):
    result = await db.execute(select(model).where(model.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="词条不存在")
    return entry


async def _create_entry(model, body: DictEntryCreate, db: AsyncSession):
    existing = await db.execute(select(model).where(model.name == body.name).limit(1))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="词条已存在")

    entry = model(
        id=generate_snowflake_id(),
        create_time=now_timestamp(),
        update_time=now_timestamp(),
        name=body.name,
        description=body.description,
        sort_order=body.sort_order,
        random_int=await _next_random_int(model, db),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def _update_entry(model, entry_id: str, body: DictEntryUpdate, db: AsyncSession):
    entry = await _get_entry(model, entry_id, db)

    update_data = body.model_dump(exclude_unset=True)
    new_name = update_data.get("name")
    if new_name and new_name != entry.name:
        existing = await db.execute(select(model).where(model.name == new_name).limit(1))
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="词条已存在")

    update_data["update_time"] = now_timestamp()
    for key, value in update_data.items():
        setattr(entry, key, value)

    await db.flush()
    await db.refresh(entry)
    return entry


async def _delete_entry(model, entry_id: str, db: AsyncSession):
    entry = await _get_entry(model, entry_id, db)
    await db.delete(entry)


@router.get("/types")
async def list_word_types():
    return WORD_TYPES


@router.get("/{word_type}", response_model=PaginatedResponse)
async def list_entries(
    word_type: str,
    q: Optional[str] = Query(None, description="按名称或描述搜索"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await _list_entries(_get_model(word_type), q, page, page_size, db)


@router.get("/{word_type}/random", response_model=list[DictEntryResponse])
async def random_entries(
    word_type: str,
    limit: int = Query(1, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    model = _get_model(word_type)
    stmt = select(model).order_by(func.rand()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{word_type}/{entry_id}", response_model=DictEntryResponse)
async def get_entry(word_type: str, entry_id: str, db: AsyncSession = Depends(get_db)):
    return await _get_entry(_get_model(word_type), entry_id, db)


@router.post("/{word_type}", response_model=DictEntryResponse, status_code=201)
async def create_entry(word_type: str, body: DictEntryCreate, db: AsyncSession = Depends(get_db)):
    return await _create_entry(_get_model(word_type), body, db)


@router.put("/{word_type}/{entry_id}", response_model=DictEntryResponse)
async def update_entry(
    word_type: str,
    entry_id: str,
    body: DictEntryUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await _update_entry(_get_model(word_type), entry_id, body, db)


@router.delete("/{word_type}/{entry_id}", status_code=204)
async def delete_entry(word_type: str, entry_id: str, db: AsyncSession = Depends(get_db)):
    await _delete_entry(_get_model(word_type), entry_id, db)


@compat_router.get("", response_model=PaginatedResponse)
async def list_dict_nouns(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await _list_entries(DictNoun, q, page, page_size, db)


@compat_router.get("/random", response_model=list[DictEntryResponse])
async def random_dict_nouns(limit: int = Query(1, ge=1, le=20), db: AsyncSession = Depends(get_db)):
    stmt = select(DictNoun).order_by(func.rand()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@compat_router.get("/{entry_id}", response_model=DictEntryResponse)
async def get_dict_noun(entry_id: str, db: AsyncSession = Depends(get_db)):
    return await _get_entry(DictNoun, entry_id, db)


@compat_router.post("", response_model=DictEntryResponse, status_code=201)
async def create_dict_noun(body: DictEntryCreate, db: AsyncSession = Depends(get_db)):
    return await _create_entry(DictNoun, body, db)


@compat_router.put("/{entry_id}", response_model=DictEntryResponse)
async def update_dict_noun(entry_id: str, body: DictEntryUpdate, db: AsyncSession = Depends(get_db)):
    return await _update_entry(DictNoun, entry_id, body, db)


@compat_router.delete("/{entry_id}", status_code=204)
async def delete_dict_noun(entry_id: str, db: AsyncSession = Depends(get_db)):
    await _delete_entry(DictNoun, entry_id, db)
