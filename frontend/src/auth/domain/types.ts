export type Role = "ADMIN" | "MANAGER" | "SUPERVISOR" | "FINANCE" | "SUPPORT" | "VIEWER";

export interface User {
  id: string;
  login: string;
  name: string;
  role: Role;
}

export interface Session {
  userId: string;
  login: string;
  name: string;
  role: Role;
  permissions: string[];
  expiresAt: number;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  role: Role;
  permissions: string[];
}
