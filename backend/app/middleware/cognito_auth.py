"""
Cognito JWT authentication middleware.
"""
from typing import Any, Dict, Optional

import boto3
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt, jwk

from app.core.config import settings
from app.core.logging import logger

# HTTP Bearer token scheme
security = HTTPBearer()


class CognitoJWTValidator:
    """Validator for Cognito JWT tokens."""

    def __init__(self):
        """Initialize Cognito JWT validator."""
        self.user_pool_id = settings.cognito_user_pool_id
        self.region = settings.cognito_region
        self.jwks: Optional[Dict[str, Any]] = None

        # Build issuer URL
        self.issuer = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"

        logger.info(f"Cognito JWT validator initialized for pool: {self.user_pool_id}")

    def _get_jwks(self) -> Dict[str, Any]:
        """Get JSON Web Key Set (JWKS) from Cognito."""
        if self.jwks:
            return self.jwks

        import httpx

        jwks_url = f"{self.issuer}/.well-known/jwks.json"

        try:
            with httpx.Client() as client:
                response = client.get(jwks_url, timeout=10.0)
                response.raise_for_status()
                self.jwks = response.json()
            logger.debug("Retrieved JWKS from Cognito")
            return self.jwks
        except Exception as e:
            logger.error(f"Failed to retrieve JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify authentication",
            )

    def _get_public_key(self, token: str) -> Any:
        """Get public key for token verification."""
        try:
            # Decode header without verification
            headers = jwt.get_unverified_header(token)
            kid = headers.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format",
                )

            # Get JWKS
            jwks = self._get_jwks()

            # Find matching key
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    # Construct the public key using jwk.construct
                    return jwk.construct(key, algorithm='RS256')

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Public key not found",
            )

        except JWTError as e:
            logger.error(f"JWT error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
            )

    def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate JWT token and extract claims.

        Args:
            token: JWT token string

        Returns:
            Dict with token claims

        Raises:
            HTTPException: If token is invalid
        """
        try:
            # Get public key
            public_key = self._get_public_key(token)

            # Decode and verify token
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={"verify_aud": False},  # Cognito tokens don't have audience
            )

            logger.debug(f"Token validated for user: {claims.get('sub')}")
            return claims

        except JWTError as e:
            logger.error(f"Token validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"Unexpected error validating token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Global validator instance
_validator = None


def get_validator() -> CognitoJWTValidator:
    """Get or create Cognito JWT validator."""
    global _validator
    if _validator is None:
        _validator = CognitoJWTValidator()
    return _validator


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user.

    Args:
        credentials: HTTP Bearer credentials from request

    Returns:
        Dict with user information:
        - user_id: Cognito sub (user ID)
        - email: User email
        - role: User role (from custom:role attribute)
        - username: Cognito username

    Raises:
        HTTPException: If authentication fails
    """
    validator = get_validator()
    token = credentials.credentials

    # Validate token and get claims
    claims = validator.validate_token(token)

    # Extract user information
    user_id = claims.get("sub")
    email = claims.get("email", "")
    username = claims.get("cognito:username", email)

    # Get custom role attribute (default to 'user' if not set)
    role = claims.get("custom:role", "user")

    user_info = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "role": role,
        "claims": claims,  # Keep full claims for advanced use cases
    }

    logger.debug(f"Authenticated user: {user_id} (role: {role})")
    return user_info


async def require_admin(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Dependency to require admin role.

    Args:
        current_user: Current authenticated user

    Returns:
        User information

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.get("role") != "admin":
        logger.warning(
            f"Admin access denied for user: {current_user.get('user_id')}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user


# Development mode bypass functions
async def get_dev_user() -> Dict[str, Any]:
    """
    Get mock user for development mode (bypasses authentication).

    Returns a mock admin user for local testing.
    """
    logger.warning("🚧 DEVELOPMENT MODE: Using mock user (authentication bypassed)")
    return {
        "user_id": "dev-user-123",
        "email": "admin@example.com",
        "username": "admin",
        "role": "admin",
        "claims": {
            "sub": "dev-user-123",
            "email": "admin@example.com",
            "cognito:username": "admin",
            "custom:role": "admin",
        },
    }


async def get_dev_admin() -> Dict[str, Any]:
    """
    Get mock admin user for development mode.

    Returns the same as get_dev_user since we're always using admin in dev mode.
    """
    return await get_dev_user()
