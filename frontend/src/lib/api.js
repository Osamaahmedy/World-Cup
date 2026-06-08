import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wcp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login") {
        localStorage.removeItem("wcp_token");
        localStorage.removeItem("wcp_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
