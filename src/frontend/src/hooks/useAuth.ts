import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api, endpoints } from '@/lib/api';
import type { User, LoginCredentials, RegisterData, AuthTokens } from '@/types';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
    setUser,
    tokens,
  } = useAuthStore();

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (tokens?.accessToken && !user) {
        setLoading(true);
        const response = await api.get<User>(endpoints.auth.me);

        if (response.success && response.data) {
          setUser(response.data);
        } else {
          storeLogout();
        }
        setLoading(false);
      } else if (!tokens?.accessToken) {
        setLoading(false);
      }
    };

    checkSession();
  }, [tokens?.accessToken, user, setLoading, setUser, storeLogout]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);

      const response = await api.post<{ user: User; tokens: AuthTokens }>(
        endpoints.auth.login,
        credentials
      );

      if (response.success && response.data) {
        storeLogin(response.data.user, response.data.tokens);
        navigate('/');
        return { success: true };
      }

      setLoading(false);
      return {
        success: false,
        error: response.error?.message || 'Login failed',
      };
    },
    [navigate, setLoading, storeLogin]
  );

  const register = useCallback(
    async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);

      const response = await api.post<{ user: User; tokens: AuthTokens }>(
        endpoints.auth.register,
        data
      );

      if (response.success && response.data) {
        storeLogin(response.data.user, response.data.tokens);
        navigate('/');
        return { success: true };
      }

      setLoading(false);
      return {
        success: false,
        error: response.error?.message || 'Registration failed',
      };
    },
    [navigate, setLoading, storeLogin]
  );

  const logout = useCallback(async () => {
    // Call logout endpoint
    await api.post(endpoints.auth.logout);

    // Clear local state
    storeLogout();

    // Redirect to login
    navigate('/login');
  }, [navigate, storeLogout]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) {
      return false;
    }

    const response = await api.post<{ tokens: AuthTokens }>(endpoints.auth.refresh, {
      refreshToken: tokens.refreshToken,
    });

    if (response.success && response.data) {
      useAuthStore.getState().setTokens(response.data.tokens);
      return true;
    }

    storeLogout();
    return false;
  }, [tokens?.refreshToken, storeLogout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshSession,
  };
}

// Re-export the hook for convenience
export default useAuth;
