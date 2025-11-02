// In services/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  async call(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new ApiError(
          data.error || 'Request failed',
          res.status,
          data
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.message === 'Failed to fetch') {
        throw new ApiError(
          'Network error. Please check your connection.',
          0,
          null
        );
      }
      
      throw new ApiError(
        error.message || 'An unexpected error occurred',
        0,
        null
      );
    }
  }

  async getCurrentUser() {
    return this.call('/auth/me');
  }

  async login(credentials) {
    return this.call('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.call('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
}

export const api = new ApiService();
export { ApiError };