import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("wcp_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Try to refresh user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem("wcp_token");
    if (token && !user) {
      api.get("/auth/me").then((r) => {
        setUser(r.data);
        localStorage.setItem("wcp_user", JSON.stringify(r.data));
      }).catch(() => {});
    }
  }, []); // eslint-disable-line

  const login = useCallback(async (employeeId, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { employee_id: employeeId, password });
      localStorage.setItem("wcp_token", data.access_token);
      localStorage.setItem("wcp_user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("wcp_token");
    localStorage.removeItem("wcp_user");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("wcp_user", JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
