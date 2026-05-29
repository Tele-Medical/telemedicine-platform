const API_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_URL}/api/v1`;

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // FastAPI Validation Errors (422) return an array in the 'detail' field.
    // We need to parse it to a string so it doesn't show as [object Object].
    let errorMessage = 'API request failed';
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail.map((err: { loc: string[]; msg: string }) => `${err.loc.join('.')} - ${err.msg}`).join(', ');
      } else if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      } else {
        errorMessage = JSON.stringify(errorData.detail);
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers?.get?.('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  if (response.ok && typeof response.json === 'function') {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
};
