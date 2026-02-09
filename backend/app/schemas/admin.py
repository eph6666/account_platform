"""
Admin configuration schemas.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class ModelConfig(BaseModel):
    """Schema for a single model configuration."""

    model_id: str = Field(..., description="Model identifier (e.g., claude-sonnet-4.5-v1)")
    display_name: str = Field(..., description="Display name for the model")
    quota_code_tpm: str = Field(..., description="QuotaCode for TPM (Tokens Per Minute)")
    quota_code_rpm: Optional[str] = Field(None, description="QuotaCode for RPM (Requests Per Minute)")
    enabled: bool = Field(True, description="Whether this model is enabled for display")
    has_1m_context: bool = Field(False, description="Whether this model has a 1M context variant")
    quota_code_tpm_1m: Optional[str] = Field(None, description="QuotaCode for 1M context TPM")
    quota_code_rpm_1m: Optional[str] = Field(None, description="QuotaCode for 1M context RPM")


class QuotaConfigResponse(BaseModel):
    """Schema for quota configuration response."""

    config_id: str = Field(..., description="Configuration ID")
    models: List[ModelConfig] = Field(..., description="List of model configurations")
    updated_at: int = Field(..., description="Last update timestamp")
    updated_by: Optional[str] = Field(None, description="User who last updated the config")


class QuotaConfigUpdate(BaseModel):
    """Schema for updating quota configuration."""

    models: List[ModelConfig] = Field(..., description="List of model configurations to update")
