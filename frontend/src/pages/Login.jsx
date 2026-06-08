import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Languages } from "lucide-react";

const destFor = (user) => (user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard");

export default function Login() {
  const { login } = useAuth();
  const { t, toggle, lang } = useI18n();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const brandName = (lang === "ar" ? branding?.name_ar : branding?.name_en) || t("brand");
  const heroImage = branding?.login_image_url || "https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";
  const tagline = (lang === "ar" ? branding?.login_tagline_ar : branding?.login_tagline_en) || (lang === "ar" ? "توقّع. تنافس. اربح." : "Predict. Compete. Win.");
  const logoUrl = branding?.logo_url;
  const symbolUrl = branding?.symbol_url;
  const primary = branding?.colors?.primary || "#064E3B";
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(employeeId.trim(), password);
      toast.success(t("login.success"));
      if (u.requires_password_change) {
        navigate("/change-password", { replace: true });
        return;
      }
      const from = location.state?.from?.pathname || destFor(u);
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.response?.status === 429) toast.error(t("login.rateLimited"));
      else toast.error(t("login.invalid"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Hero / Visual side */}
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={heroImage}
          alt="World Cup"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(135deg, ${primary}F2, ${primary}D9 55%, ${primary}A6)` }} />
        <div className="absolute inset-0 grid-pattern opacity-10" />
        {symbolUrl && (
          <img src={symbolUrl} alt="" aria-hidden="true" className="absolute -right-24 -bottom-16 w-[540px] max-w-[70%] opacity-[0.13] select-none pointer-events-none" />
        )}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-11 w-11 rounded-xl object-contain bg-white/10 p-1" data-testid="login-hero-logo" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-accent-gold text-[#0F172A] grid place-items-center font-display font-extrabold">CW</div>
            )}
            <p className="font-display font-semibold tracking-tight">{brandName}</p>
          </div>
          <div className="space-y-6 max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-gold">{t("login.hero")}</p>
            <h1 className="font-display text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              {tagline}
            </h1>
            <p className="text-base text-white/80 leading-relaxed">
              {t("login.subtitle")}
            </p>
          </div>
          <div />
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-9 w-9 rounded-xl object-contain bg-secondary p-1" />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display font-bold">CW</div>
              )}
              <p className="font-display font-semibold tracking-tight">{brandName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} data-testid="lang-toggle-login"><Languages className="h-5 w-5" /></Button>
          </div>
          <div className="hidden lg:flex justify-end mb-6">
            <Button variant="ghost" size="sm" onClick={toggle} data-testid="lang-toggle-login" className="gap-2">
              <Languages className="h-4 w-4" />
              {t("common.switchLang")}
            </Button>
          </div>

          <Card className="p-8 shadow-xl border-border">
            <div className="space-y-1 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("login.hero")}</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">{t("login.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
            </div>

            <form onSubmit={submit} className="space-y-4" data-testid="login-form">
              <div className="space-y-1.5">
                <Label htmlFor="employee-id">{t("login.employeeId")}</Label>
                <Input
                  id="employee-id"
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={t("login.employeeIdPlaceholder")}
                  data-testid="login-employee-id-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("login.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 font-medium" data-testid="login-submit">
                {busy ? t("common.loading") : t("login.submit")}
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-1" data-testid="login-forgot-hint">{t("login.forgotHint")}</p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
