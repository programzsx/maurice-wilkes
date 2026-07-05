from typing import Optional

from pydantic import BaseModel, Field


class DictNounCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field("", max_length=20000)
    sort_order: int = Field(0)


class DictNounUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=20000)
    sort_order: Optional[int] = None


class DictNounResponse(BaseModel):
    id: str
    create_time: str
    update_time: str
    sort_order: int
    random_int: int
    name: str
    description: str

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[DictNounResponse]
