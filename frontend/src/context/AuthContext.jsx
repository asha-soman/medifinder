// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AuthAPI from "../api/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // hydrate user from token (and clear if token invalid)
  useEffect(() => {
    let ignore = false;

    async function fetchMe() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
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

  // ✨ Do NOT auto-login after register (so we can redirect to /login)
  // If you ever want auto-login, call register(..., { autoLogin: true })
  const register = async (name, email, role, password, opts = {}) => {
    const { user, token } = await AuthAPI.register({ name, email, role, password });
    if (opts.autoLogin) {
      setUser(user);
      setToken(token);
      localStorage.setItem("jwt", token);
    }
    return user;
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("jwt");
  };

  const isAuthed = Boolean(token);

  const value = { user, token, loading, isAuthed, login, register, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
