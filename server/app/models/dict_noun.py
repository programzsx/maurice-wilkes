from sqlalchemy import Column, Integer, String, Text

from app.database import Base
from app.utils import now_timestamp


class DictNoun(Base):
    __tablename__ = "dict_noun"

    # 基础字段
    id = Column(String(64), primary_key=True, comment="雪花ID")
    create_time = Column(String(32), nullable=False, default=now_timestamp, comment="创建时间")
    update_time = Column(String(32), nullable=False, default=now_timestamp, onupdate=now_timestamp, comment="更新时间")

    # 统计字段
    sort_order = Column(Integer, nullable=False, default=0, comment="排序值，数值越大越靠前")
    random_int = Column(Integer, nullable=False, autoincrement=True, unique=True, comment="随机值，自增")

    # 业务字段
    name = Column(String(255), nullable=False, unique=True, comment="名词")
    description = Column(Text, nullable=False, default="", comment="描述")
