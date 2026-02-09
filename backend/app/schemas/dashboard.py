"""
Pydantic schemas for dashboard data.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class QuotaSummary(BaseModel):
    """Summary of quota for an account - supports dynamic quota fields."""

    model_config = {"extra": "allow"}  # Allow dynamic quota fields

    account_id: str
    account_name: str
    # Legacy fields for backward compatibility (will be populated if available)
    claude_sonnet_45_v1_tpm: int = Field(default=0, description="Claude Sonnet 4.5 V1 TPM")
    claude_sonnet_45_v1_1m_tpm: int = Field(default=0, description="Claude Sonnet 4.5 V1 1M Context TPM")
    claude_opus_45_tpm: int = Field(default=0, description="Claude Opus 4.5 TPM")


class DashboardModelQuota(BaseModel):
    """Quota information for a dashboard model."""

    model_id: str = Field(..., description="Model ID")
    display_name: str = Field(..., description="Model display name")
    total_tpm: int = Field(default=0, description="Total TPM quota for this model")
    icon_name: str = Field(default="psychology", description="Material icon name")
    gradient: str = Field(default="from-blue-500 to-indigo-600", description="Tailwind gradient classes")
    bg_color: str = Field(default="bg-blue-50 dark:bg-blue-900/10", description="Background color classes")


class DashboardStats(BaseModel):
    """Dashboard statistics."""

    total_accounts: int = Field(..., description="Total number of accounts")
    active_accounts: int = Field(..., description="Number of active accounts")
    total_sonnet_tpm: int = Field(default=0, description="Total Sonnet TPM quota (legacy)")
    total_opus_tpm: int = Field(default=0, description="Total Opus TPM quota (legacy)")
    model_quotas: List[DashboardModelQuota] = Field(
        default_factory=list, description="Quota information for dashboard models"
    )
    accounts_with_quota: List[QuotaSummary] = Field(
        default_factory=list, description="Accounts with quota information"
    )
