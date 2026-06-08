import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Star } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [me, setMe] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/leaderboard/me").then((r) => setMe(r.data));
    api.get("/content/prizes").then((r) => setPrizes(r.data));
    refresh();
  }, []); // eslint-disable-line

  const myPrizes = prizes.filter((p) => (p.assigned_user_ids || []).includes(user?.id));
  const initials = (user?.full_name || "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const updatePass = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      toast.success(t("profile.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Unable to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="profile-page">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("profile.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-xl font-display">{initials}</AvatarFallback></Avatar>
            <div>
              <p className="font-display text-xl font-semibold">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{t("login.employeeId")}: {user?.employee_id}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">{user?.department} · {user?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Stat label={t("profile.points")} value={me?.total_points ?? 0} />
            <Stat label={t("profile.rank")} value={me?.rank ? `#${me.rank}` : "—"} />
            <Stat label={t("profile.deptRank")} value={me?.department_rank ? `#${me.department_rank}` : "—"} />
            <Stat label={t("profile.accuracy")} value={`${me?.accuracy || 0}%`} />
          </div>
        </Card>

        <Card className="lg:col-span-7 p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">{t("profile.awards")}</h2>
          {myPrizes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <Star className="h-6 w-6 mx-auto mb-2 text-accent" />
              {t("prizes.subtitle")}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myPrizes.map((p) => (
                <div key={p.id} className="rounded-xl border border-accent/40 bg-accent/5 p-4" data-testid={`my-prize-${p.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-accent" />
                    <p className="font-semibold text-sm">{p.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-7 p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">{t("profile.changePassword")}</h2>
          <form onSubmit={updatePass} className="flex flex-col gap-3 max-w-md">
            <div>
              <Label htmlFor="cp" className="sr-only">{t("changePassword.current")}</Label>
              <Input id="cp" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("changePassword.current")} data-testid="profile-current-password" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="np" className="sr-only">{t("profile.newPassword")}</Label>
                <Input id="np" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("profile.newPassword")} data-testid="profile-new-password" />
              </div>
              <Button type="submit" disabled={busy} data-testid="profile-update-password">{t("profile.update")}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("changePassword.hint")}</p>
          </form>
        </Card>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-border p-4">
    <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    <p className="font-display text-2xl font-bold tracking-tight mt-1">{value}</p>
  </div>
);
