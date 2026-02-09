export interface QuotaSummary {
  account_id: string;
  account_name: string;
  claude_sonnet_45_v1_tpm: number;
  claude_sonnet_45_v1_1m_tpm: number;
  claude_opus_45_tpm: number;
  [key: string]: string | number; // Allow dynamic quota fields
}

export interface DashboardModelQuota {
  model_id: string;
  display_name: string;
  total_tpm: number;
  icon_name: string;
  gradient: string;
}

export interface DashboardStats {
  total_accounts: number;
  active_accounts: number;
  total_sonnet_tpm: number;
  total_opus_tpm: number;
  model_quotas: DashboardModelQuota[];
  accounts_with_quota: QuotaSummary[];
}
