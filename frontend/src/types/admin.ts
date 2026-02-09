export interface ModelConfig {
  model_id: string;
  display_name: string;
  quota_code_tpm: string;
  quota_code_rpm?: string;
  enabled: boolean;
  show_in_dashboard: boolean;
  has_1m_context: boolean;
  quota_code_tpm_1m?: string;
  quota_code_rpm_1m?: string;
}

export interface QuotaConfig {
  config_id: string;
  models: ModelConfig[];
  updated_at: number;
  updated_by?: string;
}

export interface QuotaConfigUpdate {
  models: ModelConfig[];
}
