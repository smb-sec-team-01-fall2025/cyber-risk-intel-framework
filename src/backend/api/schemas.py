from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from ipaddress import ip_address
from datetime import datetime
from db.models import AssetTypeEnum, DataSensitivityEnum

class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    type: AssetTypeEnum
    ip: Optional[str] = None
    hostname: Optional[str] = None
    owner: Optional[str] = None
    business_unit: Optional[str] = None
    criticality: int = Field(default=2, ge=1, le=5)
    data_sensitivity: DataSensitivityEnum

    @field_validator('ip')
    def validate_ip(cls, v):
        if v is None:
            return v
        try:
            ip_address(v)
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IP address")
        return v

class AssetCreate(AssetBase):
    pass

class AssetUpdate(AssetBase):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    type: Optional[AssetTypeEnum] = None
    criticality: Optional[int] = Field(None, ge=1, le=5)
    data_sensitivity: Optional[DataSensitivityEnum] = None


class RiskInfo(BaseModel):
    score: int
    explanation: str

class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    recent_intel: List = []
    risk: RiskInfo

    class Config:
        from_attributes = True
