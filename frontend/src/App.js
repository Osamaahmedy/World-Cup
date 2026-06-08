import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { RequireAuth, RequireAdmin, RequireSuperAdmin, RequirePasswordChange } from "@/components/Guards";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import Dashboard from "@/pages/Dashboard";
import Matches from "@/pages/Matches";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import News from "@/pages/News";
import Prizes from "@/pages/Prizes";

import AdminOverview from "@/pages/admin/Overview";
import AdminUsers from "@/pages/admin/Users";
import AdminTournament from "@/pages/admin/Tournament";
import AdminPredictions from "@/pages/admin/Predictions";
import AdminRewards from "@/pages/admin/Rewards";
import AdminContent from "@/pages/admin/Content";
import AdminReports from "@/pages/admin/Reports";
import AdminAudit from "@/pages/admin/Audit";
import AdminBranding from "@/pages/admin/Branding";

function App() {
  return (
    <div className="App">
      <I18nProvider>
        <BrandingProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/change-password" element={<RequirePasswordChange><ChangePassword /></RequirePasswordChange>} />

                {/* Employee */}
                <Route element={<RequireAuth><Layout /></RequireAuth>}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/prizes" element={<Prizes />} />
                </Route>

                {/* Admin */}
                <Route element={<RequireAdmin><Layout adminMode /></RequireAdmin>}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/tournament" element={<AdminTournament />} />
                  <Route path="/admin/predictions" element={<AdminPredictions />} />
                  <Route path="/admin/rewards" element={<AdminRewards />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="/admin/branding" element={<RequireSuperAdmin><AdminBranding /></RequireSuperAdmin>} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/audit" element={<AdminAudit />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </BrandingProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
