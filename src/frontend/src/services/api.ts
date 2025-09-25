/**
 * API service for making requests to the backend
 */

const BASE_URL = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// Health-specific function
export interface HealthData {
  status: string;
  env: string;
}

export async function getHealth(): Promise<ApiResponse<HealthData>> {
  return fetchApi<HealthData>('/health');
}

// Add more API functions here as your application grows
