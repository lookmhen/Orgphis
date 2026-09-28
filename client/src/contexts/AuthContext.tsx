import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ACCESS_TOKEN_KEY = 'phishcentral_access_token';
const REFRESH_TOKEN_KEY = 'phishcentral_refresh_token';
const USER_KEY = 'phishcentral_user';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Install global window.fetch interceptor once so all existing fetch('/api/...') calls
// automatically include Authorization: Bearer <token> and handle 401 refresh transparently.
const originalFetch = window.fetch.bind(window);
let isInterceptorInstalled = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefresh) return null;

  try {
    const res = await originalFetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh })
    });

    if (!res.ok) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event('phishcentral:unauthorized'));
      return null;
    }

    const data = await res.json();
    if (data.accessToken && data.refreshToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function installFetchInterceptor() {
  if (isInterceptorInstalled) return;
  isInterceptorInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');
    const isPublicAuthCall = urlStr.includes('/api/auth/login') || urlStr.includes('/api/auth/refresh');

    if (!isApiCall || isPublicAuthCall) {
      return originalFetch(input, init);
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await originalFetch(input, { ...init, headers });

    // If 401 Unauthorized, try refreshing the token once
    if (response.status === 401 && !urlStr.includes('/api/auth/logout')) {
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        const retryHeaders = new Headers(init?.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        return originalFetch(input, { ...init, headers: retryHeaders });
      }
    }

    return response;
  };
}

installFetchInterceptor();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      clearAuthState();
      setIsLoading(false);
      return;
    }

    try {
      const res = await window.fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setAccessToken(localStorage.getItem(ACCESS_TOKEN_KEY));
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } else {
        clearAuthState();
      }
    } catch {
      // Keep local state if network temporarily unreachable
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      clearAuthState();
    };

    window.addEventListener('phishcentral:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('phishcentral:unauthorized', handleUnauthorized);
  }, [refreshUser, clearAuthState]);

  const login = async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await originalFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          error: data.message || data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        };
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setUser(data.user);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
      };
    }
  };

  const logout = async () => {
    try {
      await window.fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuthState();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
