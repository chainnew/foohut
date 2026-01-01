import type { APIResponse, APIError } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * API Client for foohut backend
 * Handles authentication, error handling, and request/response transformation
 */

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      return { Authorization: `Bearer ${tokens.accessToken}` };
    }
    return {};
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<APIResponse<T>> {
    const contentType = response.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'Server returned non-JSON response',
          },
        };
      }
      return {
        success: true,
        data: null,
        error: null,
      };
    }

    const json = await response.json();

    if (!response.ok) {
      // Handle 401 - unauthorized
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }

      return {
        success: false,
        data: null,
        error: json.error || {
          code: `HTTP_${response.status}`,
          message: json.message || response.statusText,
        },
      };
    }

    return {
      success: true,
      data: json.data ?? json,
      error: null,
    };
  }

  async request<T>(
    method: string,
    path: string,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const { params, body, headers: customHeaders, ...restConfig } = config;

    const url = this.buildUrl(path, params);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...(customHeaders as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        ...restConfig,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }

  // Convenience methods
  get<T>(path: string, config?: RequestConfig) {
    return this.request<T>('GET', path, config);
  }

  post<T>(path: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>('POST', path, { ...config, body: data as BodyInit });
  }

  put<T>(path: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>('PUT', path, { ...config, body: data as BodyInit });
  }

  patch<T>(path: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>('PATCH', path, { ...config, body: data as BodyInit });
  }

  delete<T>(path: string, config?: RequestConfig) {
    return this.request<T>('DELETE', path, config);
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Type-safe API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },

  // Organizations
  organizations: {
    list: '/organizations',
    get: (id: string) => `/organizations/${id}`,
    create: '/organizations',
    update: (id: string) => `/organizations/${id}`,
    delete: (id: string) => `/organizations/${id}`,
    members: (id: string) => `/organizations/${id}/members`,
  },

  // Collections
  collections: {
    list: (orgId: string) => `/organizations/${orgId}/collections`,
    get: (orgId: string, id: string) => `/organizations/${orgId}/collections/${id}`,
    create: (orgId: string) => `/organizations/${orgId}/collections`,
    update: (orgId: string, id: string) => `/organizations/${orgId}/collections/${id}`,
    delete: (orgId: string, id: string) => `/organizations/${orgId}/collections/${id}`,
  },

  // Spaces
  spaces: {
    list: (collectionId: string) => `/collections/${collectionId}/spaces`,
    get: (id: string) => `/spaces/${id}`,
    create: (collectionId: string) => `/collections/${collectionId}/spaces`,
    update: (id: string) => `/spaces/${id}`,
    delete: (id: string) => `/spaces/${id}`,
  },

  // Pages
  pages: {
    list: (spaceId: string) => `/spaces/${spaceId}/pages`,
    get: (id: string) => `/pages/${id}`,
    create: (spaceId: string) => `/spaces/${spaceId}/pages`,
    update: (id: string) => `/pages/${id}`,
    delete: (id: string) => `/pages/${id}`,
    tree: (spaceId: string) => `/spaces/${spaceId}/pages/tree`,
  },

  // Search
  search: '/search',

  // AI
  ai: {
    chat: '/ai/chat',
    suggest: '/ai/suggest',
    generate: '/ai/generate',
  },
} as const;

// Helper to check if API response is successful
export function isApiError<T>(response: APIResponse<T>): response is APIResponse<T> & { error: APIError } {
  return !response.success && response.error !== null;
}

export default api;
