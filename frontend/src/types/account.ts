export interface BillingAddress {
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  postal_code?: string;
}

export interface BedrockQuota {
  claude_sonnet_45_v1_tpm: number;
  claude_sonnet_45_v1_1m_tpm: number;
  claude_opus_45_tpm: number;
  last_updated: number;
}

export interface AWSAccount {
  account_id: string;
  account_name: string;
  account_email?: string;
  region: string;
  status: 'active' | 'inactive';
  billing_address?: BillingAddress;
  bedrock_quota?: BedrockQuota;
  created_at: number;
  updated_at: number;
  created_by: string;
  encryption_key_id: string;
  metadata?: Record<string, any>;
}

export interface AccountCreateRequest {
  account_name: string;
  access_key: string;
  secret_key: string;
  region?: string;
}

export interface CredentialsResponse {
  account_id: string;
  access_key: string;
  secret_key: string;
}

export interface BillingAddressUpdate {
  billing_address: BillingAddress;
}
