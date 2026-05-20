const BASE_URL = '/api/v1';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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

  return response.json();
};
