"""
Account management API endpoints.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.logging import logger
from app.middleware.cognito_auth import get_current_user, require_admin, get_dev_user, get_dev_admin
from app.schemas.account import (
    AccountCreate,
    AccountResponse,
    BillingAddress,
    BillingAddressUpdate,
    CredentialsResponse,
    QuotaResponse,
)
from app.services.account_service import AccountService

router = APIRouter(prefix="/accounts", tags=["accounts"])

# 🚧 DEVELOPMENT MODE: Use mock authentication
USE_DEV_AUTH = settings.environment == "development"


def get_account_service() -> AccountService:
    """Dependency injection for AccountService."""
    return AccountService()


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create AWS Account",
    description="Create a new AWS account entry (Admin only). Verifies credentials and stores encrypted AKSK.",
)
async def create_account(
    request_data: AccountCreate,
    current_user: dict = Depends(get_dev_admin if USE_DEV_AUTH else require_admin),
    service: AccountService = Depends(get_account_service),
):
    """
    Create a new AWS account (Admin only).

    Steps:
    1. Validates AKSK using AWS STS
    2. Retrieves account information
    3. Encrypts credentials with KMS
    4. Gets billing address (if available)
    5. Gets Bedrock quota
    6. Stores in DynamoDB
    7. Records audit log

    Requires:
        - Admin role
        - Valid AWS credentials

    Returns:
        Created account information (without credentials)
    """
    try:
        account = await service.create_account(
            access_key=request_data.access_key,
            secret_key=request_data.secret_key,
            account_name=request_data.account_name,
            created_by=current_user["user_id"],
            user_role=current_user["role"],
            region=request_data.region,
        )
        return AccountResponse(**account)
    except Exception as e:
        logger.error(f"Error creating account: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=List[AccountResponse],
    status_code=status.HTTP_200_OK,
    summary="List Accounts",
    description="Get list of AWS accounts. Admin sees all, users see only their own.",
)
async def list_accounts(
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
    service: AccountService = Depends(get_account_service),
):
    """
    List AWS accounts.

    Filtering:
    - Admin: Returns all accounts
    - User: Returns only accounts they created

    Returns:
        List of accounts (without credentials)
    """
    accounts = await service.list_accounts(
        user_id=current_user["user_id"],
        user_role=current_user["role"],
    )
    return [AccountResponse(**acc) for acc in accounts]


@router.get(
    "/{account_id}",
    response_model=AccountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Account Details",
    description="Get detailed information about a specific AWS account.",
)
async def get_account(
    account_id: str,
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Get account details.

    Permission check:
    - Admin: Can access any account
    - User: Can only access accounts they created

    Returns:
        Account information (without credentials)
    """
    try:
        account = await service.get_account(account_id)

        # Permission check for non-admin users
        if (
            current_user["role"] != "admin"
            and account.get("created_by") != current_user["user_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this account",
            )

        return AccountResponse(**account)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting account {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account not found: {account_id}",
        )


@router.get(
    "/{account_id}/credentials",
    response_model=CredentialsResponse,
    status_code=status.HTTP_200_OK,
    summary="Export Account Credentials",
    description="Export decrypted AKSK for an account (Admin only). This action is logged.",
)
async def export_credentials(
    account_id: str,
    request: Request,
    current_user: dict = Depends(get_dev_admin if USE_DEV_AUTH else require_admin),
    service: AccountService = Depends(get_account_service),
):
    """
    Export account credentials (Admin only).

    Security:
    - Requires admin role
    - Action is logged with IP address
    - Credentials should be handled securely on frontend

    Returns:
        Decrypted access key and secret key
    """
    try:
        # Get client IP address
        ip_address = request.client.host if request.client else None

        credentials = await service.export_credentials(
            account_id=account_id,
            user_id=current_user["user_id"],
            user_role=current_user["role"],
            ip_address=ip_address,
        )

        return CredentialsResponse(**credentials)
    except Exception as e:
        logger.error(f"Error exporting credentials for {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{account_id}/billing",
    response_model=BillingAddress,
    status_code=status.HTTP_200_OK,
    summary="Get Billing Address",
    description="Get billing address for an AWS account.",
)
async def get_billing_address(
    account_id: str,
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Get billing address.

    Returns:
        Billing address information
    """
    try:
        billing = await service.get_billing_address(account_id)
        return BillingAddress(**billing)
    except Exception as e:
        logger.error(f"Error getting billing address for {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/{account_id}/billing",
    status_code=status.HTTP_200_OK,
    summary="Update Billing Address",
    description="Update billing address for an account (Admin only).",
)
async def update_billing_address(
    account_id: str,
    billing_data: BillingAddressUpdate,
    current_user: dict = Depends(get_dev_admin if USE_DEV_AUTH else require_admin),
    service: AccountService = Depends(get_account_service),
):
    """
    Update billing address (Admin only).

    Returns:
        Success message
    """
    try:
        success = await service.update_billing_address(
            account_id=account_id,
            billing_address=billing_data.model_dump(),
            user_id=current_user["user_id"],
            user_role=current_user["role"],
        )

        if success:
            return {"message": "Billing address updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update billing address",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating billing address for {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{account_id}/quota",
    response_model=QuotaResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Bedrock Quota",
    description="Get Bedrock Claude 4.5 TPM quota for an account.",
)
async def get_quota(
    account_id: str,
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Get Bedrock quota.

    Returns:
        Quota information including Claude 4.5 TPM
    """
    try:
        quota = await service.get_bedrock_quota(account_id)

        # Return all quota data dynamically
        # QuotaResponse has extra="allow" to accept dynamic fields
        return QuotaResponse(**quota)
    except Exception as e:
        logger.error(f"Error getting quota for {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/{account_id}/quota/refresh",
    status_code=status.HTTP_200_OK,
    summary="Refresh Bedrock Quota",
    description="Refresh Bedrock quota by querying AWS (Admin only).",
)
async def refresh_quota(
    account_id: str,
    current_user: dict = Depends(get_dev_admin if USE_DEV_AUTH else require_admin),
    service: AccountService = Depends(get_account_service),
):
    """
    Refresh Bedrock quota (Admin only).

    Queries AWS Service Quotas API to get latest quota information.

    Returns:
        Updated quota information
    """
    try:
        quota = await service.refresh_bedrock_quota(
            account_id=account_id,
            user_id=current_user["user_id"],
            user_role=current_user["role"],
        )

        return {
            "message": "Quota refreshed successfully",
            "quota": quota,
        }
    except Exception as e:
        logger.error(f"Error refreshing quota for {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Account",
    description="Delete an AWS account (Admin only). Performs soft delete by setting status to inactive.",
)
async def delete_account(
    account_id: str,
    current_user: dict = Depends(get_dev_admin if USE_DEV_AUTH else require_admin),
    service: AccountService = Depends(get_account_service),
):
    """
    Delete account (Admin only).

    Performs a soft delete by setting status to 'inactive'.
    The account data is preserved for audit purposes.

    Security:
    - Requires admin role
    - Action is logged

    Returns:
        Success message
    """
    try:
        success = await service.delete_account(
            account_id=account_id,
            user_id=current_user["user_id"],
            user_role=current_user["role"],
        )

        if success:
            return {"message": f"Account {account_id} deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting account {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
