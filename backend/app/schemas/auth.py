"""
Pydantic schemas for authentication.
"""
from typing import Dict, Optional

from pydantic import BaseModel, Field


class CognitoConfig(BaseModel):
    """Cognito configuration for frontend."""

    user_pool_id: str = Field(..., description="Cognito User Pool ID")
    client_id: str = Field(..., description="Cognito Client ID")
    region: str = Field(..., description="AWS Region")


class UserInfo(BaseModel):
    """Current user information."""

    user_id: str = Field(..., description="User ID (Cognito sub)")
    email: str = Field(..., description="User email")
    username: str = Field(..., description="Username")
    role: str = Field(..., description="User role (admin/user)")
    claims: Optional[Dict] = Field(default=None, description="Full JWT claims")
