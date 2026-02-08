"""
Pydantic schemas for AWS account management.
"""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ===================================================================
# Request Models
# ===================================================================


class AccountCreate(BaseModel):
    """Schema for creating a new AWS account."""

    access_key: str = Field(..., min_length=16, max_length=128, description="AWS Access Key ID")
    secret_key: str = Field(..., min_length=40, description="AWS Secret Access Key")
    account_name: str = Field(..., min_length=1, max_length=255, description="Account display name")
    region: str = Field(default="us-east-1", description="AWS region for Bedrock quota (default: us-east-1)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_key": "AKIAIOSFODNN7EXAMPLE",
                "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                "account_name": "Production Account",
                "region": "us-east-1",
            }
        }
    )


class BillingAddressUpdate(BaseModel):
    """Schema for updating billing address."""

    country: str
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None


# ===================================================================
# Response Models
# ===================================================================


class BillingAddress(BaseModel):
    """Billing address information."""

    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None


class BedrockQuota(BaseModel):
    """Bedrock quota information."""

    claude_sonnet_45_v1_tpm: int = Field(default=0, description="Claude Sonnet 4.5 V1 TPM quota")
    claude_sonnet_45_v1_1m_tpm: int = Field(default=0, description="Claude Sonnet 4.5 V1 1M Context TPM quota")
    claude_opus_45_tpm: int = Field(default=0, description="Claude Opus 4.5 TPM quota")
    last_updated: int = Field(..., description="Last updated timestamp")


class AccountResponse(BaseModel):
    """Schema for AWS account response (without credentials)."""

    account_id: str
    account_name: str
    account_email: Optional[str] = None
    region: str = "us-east-1"
    status: str = "active"
    billing_address: Optional[BillingAddress] = None
    bedrock_quota: Optional[BedrockQuota] = None
    created_at: int
    updated_at: int
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class CredentialsResponse(BaseModel):
    """Schema for credential export response."""

    account_id: str
    access_key: str
    secret_key: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "account_id": "123456789012",
                "access_key": "AKIAIOSFODNN7EXAMPLE",
                "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            }
        }
    )


class QuotaResponse(BaseModel):
    """Schema for quota information response."""

    claude_sonnet_45_tpm: int = Field(default=0, description="Claude Sonnet 4.5 TPM quota")
    claude_opus_45_tpm: int = Field(default=0, description="Claude Opus 4.5 TPM quota")
    last_updated: int
