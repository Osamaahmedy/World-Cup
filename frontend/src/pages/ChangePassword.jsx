import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Eye, EyeOff, ShieldCheck, Check, X } from "lucide-react";

const rules = [
  { key: "len", test: (p) => p.length >= 8 },
  { key: "upper", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", test: (p) => /[a-z]/.test(p) },
  { key: "number", test: (p) => /[0-9]/.test(p) },
  { key: "special", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ChangePassword() {
  const { user, logout, refresh } = useAuth();
  const { t, lang } = useI18n();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const brandName = (lang === "ar" ? branding?.name_ar : branding?.name_en) || t("brand");
  const logoUrl = branding?.logo_url;
  const forced = !!user?.requires_password_change;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const allPass = rules.every((r) => r.test(next));
  const match = next.length > 0 && next === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!allPass) { toast.error(t("changePassword.weak")); return; }
    if (!match) { toast.error(t("changePassword.mismatch")); return; }
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success(t("changePassword.success"));
      const u = await refresh();
      const dest = (u?.role === "admin" || u?.role === "super_admin") ? "/admin" : "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : t("changePassword.error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6" data-testid="change-password-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-6">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-10 w-10 rounded-xl object-contain bg-secondary p-1" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display font-bold">CW</div>
          )}
          <p className="font-display font-semibold tracking-tight">{brandName}</p>
        </div>

        <Card className="p-8 shadow-xl border-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">{t("changePassword.title")}</h2>
              <p className="text-sm text-muted-foreground">{forced ? t("changePassword.forcedSubtitle") : t("changePassword.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4" data-testid="change-password-form">
            <div className="space-y-1.5">
              <Label htmlFor="cur">{t("changePassword.current")}</Label>
              <Input id="cur" type={show ? "text" : "password"} required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={forced ? "123456" : ""} data-testid="cp-current-input" />
            </div>
            <div className="space-y-1.5">
              <div className="relative">
                <Label htmlFor="np">{t("changePassword.new")}</Label>
                <Input id="np" type={show ? "text" : "password"} required value={next} onChange={(e) => setNext(e.target.value)} className="mt-1.5" data-testid="cp-new-input" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-7 end-3 text-muted-foreground" tabIndex={-1}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf">{t("changePassword.confirm")}</Label>
              <Input id="cf" type={show ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="cp-confirm-input" />
            </div>

            <div className="rounded-lg border border-border p-3 space-y-1.5" data-testid="cp-rules">
              {rules.map((r) => {
                const ok = r.test(next);
                return (
                  <div key={r.key} className={`flex items-center gap-2 text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    <span>{t(`changePassword.rules.${r.key}`)}</span>
                  </div>
                );
              })}
            </div>

            <Button type="submit" disabled={busy} className="w-full h-11 font-medium" data-testid="cp-submit">
              {busy ? t("common.loading") : t("changePassword.submit")}
            </Button>
            {forced && (
              <button type="button" onClick={logout} className="w-full text-xs text-muted-foreground hover:underline" data-testid="cp-logout">
                {t("common.logout")}
              </button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
