import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.requires_password_change) return <Navigate to="/change-password" replace />;
  return children;
};

export const RequireAdmin = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.requires_password_change) return <Navigate to="/change-password" replace />;
  if (user.role !== "admin" && user.role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return children;
};

export const RequireSuperAdmin = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.requires_password_change) return <Navigate to="/change-password" replace />;
  if (user.role !== "super_admin") return <Navigate to="/admin" replace />;
  return children;
};

export const RequirePasswordChange = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};
