import React, { createContext, useContext, useEffect, useState } from "react";
import AuthAPI from "../api/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let ignore = false;
    async function fetchMe() {
      try {
        if (!token) return;
        const me = await AuthAPI.me(token);
        if (!ignore) setUser(me);
      } catch {
        if (!ignore) {
          setUser(null);
          setToken("");
          localStorage.removeItem("jwt");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchMe();
    return () => { ignore = true; };
  }, [token]);

  const login = async (email, password) => {
    const { user, token } = await AuthAPI.login({ email, password });
    setUser(user);
    setToken(token);
    localStorage.setItem("jwt", token);
    return user;
  };

  const register = async (name, email, role, password) => {
    const { user, token } = await AuthAPI.register({ name, email, role, password });
    setUser(user);
    setToken(token);
    localStorage.setItem("jwt", token);
    return user;
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("jwt");
  };

  const value = { user, token, loading, login, register, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
