import { apiClient } from '@/lib/api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  authenticated: boolean;
  tokenType: string;
}

class AuthApi {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/auth/login', credentials, {
      credentials: 'include',
    });
  }
}

export const authApi = new AuthApi();
