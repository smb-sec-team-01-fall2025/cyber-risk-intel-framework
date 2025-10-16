from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, JSON, DateTime, func, Enum, ForeignKey
import enum

class Base(DeclarativeBase):
    pass

class AssetTypeEnum(str, enum.Enum):
    HW = "HW"
    SW = "SW"
    DATA = "Data"
    USER = "User"
    SERVICE = "Service"

class DataSensitivityEnum(str, enum.Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"

class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True, unique=True)
    type: Mapped[AssetTypeEnum] = mapped_column(Enum(AssetTypeEnum), default=AssetTypeEnum.SERVICE)
    
    ip: Mapped[str] = mapped_column(String(45), nullable=True, index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    owner: Mapped[str] = mapped_column(String(120), nullable=True)
    business_unit: Mapped[str] = mapped_column(String(120), nullable=True)

    criticality: Mapped[int] = mapped_column(Integer, default=2) # 1..5
    data_sensitivity: Mapped[DataSensitivityEnum] = mapped_column(Enum(DataSensitivityEnum), default=DataSensitivityEnum.LOW)
    
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    intel_links = relationship("AssetIntelLink", back_populates="asset")

class IntelEvent(Base):
    __tablename__ = "intel_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(40), index=True)
    indicator: Mapped[str] = mapped_column(String(255), index=True)
    raw: Mapped[dict] = mapped_column(JSON)
    severity: Mapped[int] = mapped_column(Integer, default=1) # 1..5
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    asset_links = relationship("AssetIntelLink", back_populates="intel_event")

class RiskItem(Base):
    __tablename__ = "risk_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    likelihood: Mapped[int] = mapped_column(Integer) # 1..5
    impact: Mapped[int] = mapped_column(Integer) # 1..5
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

class MatchTypeEnum(str, enum.Enum):
    IP = "ip"
    DOMAIN = "domain"
    HOSTNAME = "hostname"

class AssetIntelLink(Base):
    __tablename__ = "asset_intel_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    intel_event_id: Mapped[int] = mapped_column(ForeignKey("intel_events.id"), index=True)
    match_type: Mapped[MatchTypeEnum] = mapped_column(Enum(MatchTypeEnum))
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    
    asset = relationship("Asset", back_populates="intel_links")
    intel_event = relationship("IntelEvent", back_populates="asset_links")
