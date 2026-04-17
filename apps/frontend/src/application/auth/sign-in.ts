import {
  authApi,
  type AuthenticatedUser,
  type LoginCredentials,
  type LoginResponse,
} from '@/lib/api/auth-api';

export interface SignInResult {
  authenticated: boolean;
  tokenType: string;
  user: AuthenticatedUser;
}

class AuthApplicationService {
  async signIn(credentials: LoginCredentials): Promise<SignInResult> {
    const response: LoginResponse = await authApi.login(credentials);

    return {
      authenticated: response.authenticated,
      tokenType: response.tokenType,
      user: response.user,
    };
  }
}

export const authApplicationService = new AuthApplicationService();
