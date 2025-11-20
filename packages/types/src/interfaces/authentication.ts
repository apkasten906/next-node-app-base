/**
 * Authentication provider interface for OAuth 2.0 + OIDC
 */
export interface IAuthenticationProvider {
  /**
   * Authenticate user with credentials
   */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /**
   * Validate access token
   */
  validateToken(token: string): Promise<TokenPayload>;

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<TokenResult>;

  /**
   * Revoke tokens (logout)
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Verify OAuth callback
   */
  verifyCallback(code: string, state: string): Promise<AuthResult>;
}

export interface AuthCredentials {
  username?: string;
  email?: string;
  password?: string;
  provider?: string;
  oauthToken?: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  tokens?: TokenResult;
  error?: string;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
  verified: boolean;
  provider?: string;
}

/**
 * Authorization service interface for RBAC/ABAC
 */
export interface IAuthorizationService {
  /**
   * Check if user has required role
   */
  hasRole(userId: string, role: string): Promise<boolean>;

  /**
   * Check if user has required permission
   */
  hasPermission(userId: string, permission: string): Promise<boolean>;

  /**
   * Check if user can access resource
   */
  canAccess(userId: string, resource: string, action: string): Promise<boolean>;

  /**
   * Get user roles
   */
  getUserRoles(userId: string): Promise<string[]>;

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): Promise<string[]>;
}

export interface AuthorizationContext {
  userId: string;
  resource: string;
  action: string;
  attributes?: Record<string, any>;
}
