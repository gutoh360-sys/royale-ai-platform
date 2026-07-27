export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}
