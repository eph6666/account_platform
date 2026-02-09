"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.middleware.cognito_auth import get_current_user, get_dev_user
from app.schemas.dashboard import DashboardStats, DashboardModelQuota, QuotaSummary
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
    - Total TPM quota across all accounts (for models marked as show_in_dashboard)
    - List of accounts with quota information

    Filtering:
    - Admin: Statistics for all accounts
    - User: Statistics for accounts they created
    """
    # Get quota config to determine which models to show in dashboard
    from app.db.quota_config_manager import QuotaConfigManager
    quota_config_manager = QuotaConfigManager()
    quota_config = quota_config_manager.get_config()

    # Get models marked for dashboard display (max 2)
    dashboard_models = []
    if quota_config and quota_config.get("models"):
        dashboard_models = [m for m in quota_config["models"] if m.get("show_in_dashboard", False)][:2]

    # Get accounts based on user role
    accounts = await service.list_accounts(
        user_id=current_user["user_id"],
        user_role=current_user["role"],
    )

    # Calculate statistics
    total_accounts = len(accounts)
    active_accounts = sum(1 for acc in accounts if acc.get("status") == "active")

    # Calculate total TPM quota based on dashboard models only
    total_sonnet_tpm = 0
    total_opus_tpm = 0
    accounts_with_quota = []

    # Initialize model totals for dashboard models
    model_totals = {}
    for model in dashboard_models:
        model_totals[model["model_id"]] = 0

    for account in accounts:
        bedrock_quota = account.get("bedrock_quota", {})

        # Build quota summary with dynamic fields for dashboard models
        quota_summary_data = {
            "account_id": account["account_id"],
            "account_name": account["account_name"],
        }

        # Calculate totals and add fields for dashboard models only
        has_quota = False
        for model in dashboard_models:
            model_id = model["model_id"]
            # Generate field name: claude-sonnet-4.5-v1 -> claude_sonnet_4_5_v1_tpm
            field_name = model_id.replace("-", "_").replace(".", "_") + "_tpm"
            field_name_1m = model_id.replace("-", "_").replace(".", "_") + "_1m_tpm"

            # Get TPM values from bedrock_quota
            tpm_value = bedrock_quota.get(field_name, 0)
            tpm_1m_value = bedrock_quota.get(field_name_1m, 0) if model.get("has_1m_context") else 0

            if tpm_value > 0 or tpm_1m_value > 0:
                has_quota = True

            # Add to summary
            quota_summary_data[field_name] = tpm_value
            if model.get("has_1m_context"):
                quota_summary_data[field_name_1m] = tpm_1m_value

            # Add to model totals
            model_totals[model_id] += tpm_value + tpm_1m_value

            # Categorize for legacy totals
            if "sonnet" in model_id.lower():
                total_sonnet_tpm += tpm_value + tpm_1m_value
            elif "opus" in model_id.lower():
                total_opus_tpm += tpm_value + tpm_1m_value

        # Also populate legacy fields for backward compatibility
        quota_summary_data["claude_sonnet_45_v1_tpm"] = bedrock_quota.get("claude_sonnet_45_v1_tpm") or bedrock_quota.get("claude_sonnet_4_5_v1_tpm", 0)
        quota_summary_data["claude_sonnet_45_v1_1m_tpm"] = bedrock_quota.get("claude_sonnet_45_v1_1m_tpm") or bedrock_quota.get("claude_sonnet_4_5_v1_1m_tpm", 0)
        quota_summary_data["claude_opus_45_tpm"] = bedrock_quota.get("claude_opus_45_tpm") or bedrock_quota.get("claude_opus_4_5_tpm", 0)

        # Include account if it has any quota
        if has_quota:
            accounts_with_quota.append(QuotaSummary(**quota_summary_data))

    # Build model_quotas list with appropriate icons and gradients
    model_quotas = []
    for model in dashboard_models:
        model_id = model["model_id"]
        display_name = model.get("display_name", model_id)

        # Determine icon and gradient based on model name
        model_lower = model_id.lower()
        if "sonnet" in model_lower:
            icon_name = "psychology"
            gradient = "from-blue-500 to-indigo-600"
        elif "opus" in model_lower:
            icon_name = "workspace_premium"  # Premium badge icon for high-end models
            gradient = "from-purple-500 to-purple-600"
        elif "haiku" in model_lower:
            icon_name = "flash_on"  # Lightning icon for fast models
            gradient = "from-emerald-500 to-teal-600"
        else:
            icon_name = "smart_toy"
            gradient = "from-gray-500 to-gray-600"

        model_quotas.append(DashboardModelQuota(
            model_id=model_id,
            display_name=display_name,
            total_tpm=model_totals.get(model_id, 0),
            icon_name=icon_name,
            gradient=gradient,
        ))

    return DashboardStats(
        total_accounts=total_accounts,
        active_accounts=active_accounts,
        total_sonnet_tpm=total_sonnet_tpm,
        total_opus_tpm=total_opus_tpm,
        model_quotas=model_quotas,
        accounts_with_quota=accounts_with_quota,
    )
