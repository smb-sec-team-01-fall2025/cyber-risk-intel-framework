from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, JSON, DateTime, func

class Base(DeclarativeBase): pass

class Asset(Base):
  __tablename__ = "assets"
  id: Mapped[int] = mapped_column(primary_key=True)
  name: Mapped[str] = mapped_column(String(120), index=True)
  type: Mapped[str] = mapped_column(String(40)) # HW/SW/Data/User/Service
  criticality: Mapped[int] = mapped_column(Integer, default=2) # 1..5

class IntelEvent(Base):
  __tablename__ = "intel_events"
  id: Mapped[int] = mapped_column(primary_key=True)
  source: Mapped[str] = mapped_column(String(40), index=True) # shodan/otx/...
  indicator: Mapped[str] = mapped_column(String(255), index=True)
  raw: Mapped[dict] = mapped_column(JSON)
  severity: Mapped[int] = mapped_column(Integer, default=1) # 1..5
  created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class RiskItem(Base):
  __tablename__ = "risk_items"
  id: Mapped[int] = mapped_column(primary_key=True)
  asset_id: Mapped[int] = mapped_column(Integer, index=True)
  title: Mapped[str] = mapped_column(String(200))
  likelihood: Mapped[int] = mapped_column(Integer) # 1..5
  impact: Mapped[int] = mapped_column(Integer) # 1..5
  