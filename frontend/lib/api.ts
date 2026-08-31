// File: frontend/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

// Create a custom Axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

// Intercept requests to inject the JWT token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;