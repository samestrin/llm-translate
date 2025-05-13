import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// Add request interceptor for handling requests
api.interceptors.request.use(
  (config) => {
    // You can add authentication headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { config, response } = error;
    
    // Don't retry if we've already tried or if it's a 4xx error (client error)
    if (
      config._retry || 
      (response && response.status >= 400 && response.status < 500)
    ) {
      return Promise.reject(formatError(error));
    }
    
    // If the error is a network error or the status code is 5xx, retry the request
    if (!response || (response && response.status >= 500)) {
      config._retry = true;
      return api(config);
    }
    
    return Promise.reject(formatError(error));
  }
);

/**
 * Format error response for consistent error handling
 * @param {Error} error - The error object from axios
 * @returns {Error} - Formatted error object
 */
const formatError = (error) => {
  // Create a new error object with formatted message and details
  const formattedError = new Error(
    error.response?.data?.detail || 
    error.message || 
    'An unknown error occurred'
  );
  
  // Add additional properties for debugging
  formattedError.status = error.response?.status;
  formattedError.statusText = error.response?.statusText;
  formattedError.data = error.response?.data;
  formattedError.originalError = error;
  
  return formattedError;
};

export default api;