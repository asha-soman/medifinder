import { apiFetch } from "./client";

const AuthAPI = {
  register: (payload) =>
    apiFetch("/auth/register", { method: "POST", body: payload }),

  login: (payload) =>
    apiFetch("/auth/login", { method: "POST", body: payload }),

  me: (token) =>
    apiFetch("/auth/me", { token }),
};

export default AuthAPI;
