export interface UserInfo {
  user_id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  claims?: Record<string, any>;
}

export interface CognitoConfig {
  user_pool_id: string;
  client_id: string;
  region: string;
}
