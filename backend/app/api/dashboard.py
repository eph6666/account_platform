"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.middleware.cognito_auth import get_current_user, get_dev_user
from app.schemas.dashboard import DashboardStats, QuotaSummary
from app.services.account_service import AccountService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# 🚧 DEVELOPMENT MODE: Use mock authentication
USE_DEV_AUTH = settings.environment == "development"


def get_account_service() -> AccountService:
    """Dependency injection for AccountService."""
    return AccountService()


@router.get(
    "/stats",
    response_model=DashboardStats,
    status_code=status.HTTP_200_OK,
    summary="Get Dashboard Statistics",
    description="Get dashboard statistics including account counts and quota information.",
)
async def get_dashboard_stats(
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Get dashboard statistics.

    Returns:
    - Total number of accounts
    - Number of active accounts
    - Total TPM quota across all accounts
    - List of accounts with quota information

    Filtering:
    - Admin: Statistics for all accounts
    - User: Statistics for accounts they created
    """
    # Get accounts based on user role
    accounts = await service.list_accounts(
        user_id=current_user["user_id"],
        user_role=current_user["role"],
    )

    # Calculate statistics
    total_accounts = len(accounts)
    active_accounts = sum(1 for acc in accounts if acc.get("status") == "active")

    # Calculate total TPM quota dynamically from all models
    total_sonnet_tpm = 0
    total_opus_tpm = 0
    accounts_with_quota = []

    for account in accounts:
        bedrock_quota = account.get("bedrock_quota", {})

        # Calculate total TPM from all TPM fields
        # Sum all *_tpm fields (excluding last_updated and other non-TPM fields)
        total_tpm = 0
        for key, value in bedrock_quota.items():
            if key.endswith("_tpm") and isinstance(value, (int, float)):
                total_tpm += value

        # Include account if it has any quota
        if total_tpm > 0:
            # Try to get legacy field values for backward compatibility in summary
            sonnet_v1_tpm = bedrock_quota.get("claude_sonnet_45_v1_tpm") or bedrock_quota.get("claude_sonnet_4_5_v1_tpm", 0)
            sonnet_v1_1m_tpm = bedrock_quota.get("claude_sonnet_45_v1_1m_tpm") or bedrock_quota.get("claude_sonnet_4_5_v1_1m_tpm", 0)
            opus_tpm = bedrock_quota.get("claude_opus_45_tpm") or bedrock_quota.get("claude_opus_4_5_tpm", 0)

            # Categorize: Sonnet includes models with "sonnet" in name, Opus includes models with "opus"
            sonnet_total = sum(v for k, v in bedrock_quota.items() if k.endswith("_tpm") and "sonnet" in k.lower() and isinstance(v, (int, float)))
            opus_total = sum(v for k, v in bedrock_quota.items() if k.endswith("_tpm") and "opus" in k.lower() and isinstance(v, (int, float)))

            total_sonnet_tpm += sonnet_total
            total_opus_tpm += opus_total

            accounts_with_quota.append(
                QuotaSummary(
                    account_id=account["account_id"],
                    account_name=account["account_name"],
                    claude_sonnet_45_v1_tpm=sonnet_v1_tpm,
                    claude_sonnet_45_v1_1m_tpm=sonnet_v1_1m_tpm,
                    claude_opus_45_tpm=opus_tpm,
                )
            )

    return DashboardStats(
        total_accounts=total_accounts,
        active_accounts=active_accounts,
        total_sonnet_tpm=total_sonnet_tpm,
        total_opus_tpm=total_opus_tpm,
        accounts_with_quota=accounts_with_quota,
    )
