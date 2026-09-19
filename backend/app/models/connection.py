import uuid
from enum import Enum
from sqlalchemy import Column, String, DateTime, UniqueConstraint, Index
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class ConnectionStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Connection(Base):
    __tablename__ = "connections"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    requester_id = Column(GUID, nullable=False, index=True)
    receiver_id = Column(GUID, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=ConnectionStatus.PENDING.value, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("requester_id", "receiver_id", name="uq_connections_requester_receiver"),
        Index("ix_connections_receiver_status", "receiver_id", "status"),
        Index("ix_connections_requester_status", "requester_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Connection id={self.id} from={self.requester_id} to={self.receiver_id} status={self.status}>"
