// src/axiosConfig.jsx
import axios from "axios";

const api = axios.create({
  baseURL: "http://15.134.76.220:5001/api",   // << include /api here
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");   // your key is 'jwt'
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;