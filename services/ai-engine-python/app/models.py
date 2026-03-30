from sqlalchemy import Column, BigInt, String, JSON, DECIMAL, DateTime, Enum, ForeignKey
from .database import Base
import enum

class MatchStatus(str, enum.Enum):
    pushed = "pushed"
    viewed = "viewed"
    confirmed = "confirmed"
    done = "done"
    invalid = "invalid"

class ResourceStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    inactive = "inactive"
    rejected = "rejected"

class Resource(Base):
    __tablename__ = "resources"
    resource_id = Column(BigInt, primary_key=True, index=True)
    user_id = Column(BigInt)
    tags = Column(JSON)
    area_code = Column(String(20))
    price_range = Column(JSON)
    status = Column(String(20), default="pending")

class Match(Base):
    __tablename__ = "matches"
    match_id = Column(BigInt, primary_key=True, index=True)
    need_id = Column(BigInt)
    resource_id = Column(BigInt, ForeignKey("resources.resource_id"))
    match_score = Column(DECIMAL(5, 2))
    status = Column(String(20))
    push_time = Column(DateTime)
