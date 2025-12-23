export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = 'tasky.accessToken';
const REFRESH_TOKEN_KEY = 'tasky.refreshToken';

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const authState = {
  isLoggedIn() {
    return Boolean(authStorage.getAccessToken() && authStorage.getRefreshToken());
  },
};

type JwtPayload = {
  sub?: string;
  email?: string | null;
  iat?: number;
  exp?: number;
};

const decodeBase64Url = (input: string) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return atob(padded);
};

export const authJwt = {
  getPayload(): JwtPayload | null {
    const token = authStorage.getAccessToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = decodeBase64Url(parts[1]);
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  },
  getUserId(): string | null {
    return this.getPayload()?.sub || null;
  },
};
