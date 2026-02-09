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


class DashboardStats(BaseModel):
    """Dashboard statistics."""

    total_accounts: int = Field(..., description="Total number of accounts")
    active_accounts: int = Field(..., description="Number of active accounts")
    total_sonnet_tpm: int = Field(default=0, description="Total Sonnet TPM quota")
    total_opus_tpm: int = Field(default=0, description="Total Opus TPM quota")
    accounts_with_quota: List[QuotaSummary] = Field(
        default_factory=list, description="Accounts with quota information"
    )
