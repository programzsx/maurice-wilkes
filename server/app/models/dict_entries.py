from sqlalchemy import Column, Integer, String, Text

from app.database import Base
from app.dict_catalog import WORD_TYPES
from app.utils import now_timestamp


class DictEntryMixin:
    # 基础字段
    id = Column(String(64), primary_key=True, comment="雪花ID")
    create_time = Column(String(32), nullable=False, default=now_timestamp, comment="创建时间")
    update_time = Column(String(32), nullable=False, default=now_timestamp, onupdate=now_timestamp, comment="更新时间")

    # 统计字段
    sort_order = Column(Integer, nullable=False, default=0, comment="排序值，数值越大越靠前")
    random_int = Column(Integer, nullable=False, unique=True, comment="随机值，应用层顺序自增")

    # 业务字段
    name = Column(String(255), nullable=False, unique=True, comment="词条名称")
    description = Column(Text, nullable=False, default="", comment="描述")


class DictNoun(DictEntryMixin, Base):
    __tablename__ = "dict_noun"


class DictVerb(DictEntryMixin, Base):
    __tablename__ = "dict_verb"


class DictAdjective(DictEntryMixin, Base):
    __tablename__ = "dict_adjective"


class DictNumeral(DictEntryMixin, Base):
    __tablename__ = "dict_numeral"


class DictClassifier(DictEntryMixin, Base):
    __tablename__ = "dict_classifier"


class DictPronoun(DictEntryMixin, Base):
    __tablename__ = "dict_pronoun"


class DictAdverb(DictEntryMixin, Base):
    __tablename__ = "dict_adverb"


class DictPreposition(DictEntryMixin, Base):
    __tablename__ = "dict_preposition"


class DictConjunction(DictEntryMixin, Base):
    __tablename__ = "dict_conjunction"


class DictParticle(DictEntryMixin, Base):
    __tablename__ = "dict_particle"


class DictInterjection(DictEntryMixin, Base):
    __tablename__ = "dict_interjection"


class DictOnomatopoeia(DictEntryMixin, Base):
    __tablename__ = "dict_onomatopoeia"


DICT_MODEL_BY_KEY = {
    "noun": DictNoun,
    "verb": DictVerb,
    "adjective": DictAdjective,
    "numeral": DictNumeral,
    "classifier": DictClassifier,
    "pronoun": DictPronoun,
    "adverb": DictAdverb,
    "preposition": DictPreposition,
    "conjunction": DictConjunction,
    "particle": DictParticle,
    "interjection": DictInterjection,
    "onomatopoeia": DictOnomatopoeia,
}

DICT_MODELS = [DICT_MODEL_BY_KEY[item["key"]] for item in WORD_TYPES]
