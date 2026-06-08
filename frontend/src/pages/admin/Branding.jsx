import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, RotateCcw, Trophy } from "lucide-react";

const DEFAULTS = {
  name_en: "iLogic World Cup Predictor",
  name_ar: "آيلوجيك - توقعات كأس العالم",
  logo_url: "https://customer-assets.emergentagent.com/job_ba32adbb-ea62-4849-a2c8-c2a8cdda74d8/artifacts/yd9z4os8_icon_ilogic-03-01.png",
  favicon_url: "https://customer-assets.emergentagent.com/job_ba32adbb-ea62-4849-a2c8-c2a8cdda74d8/artifacts/yd9z4os8_icon_ilogic-03-01.png",
  symbol_url: "https://customer-assets.emergentagent.com/job_ba32adbb-ea62-4849-a2c8-c2a8cdda74d8/artifacts/nb00pz2v_%D8%A7%D9%8A%D9%82%D9%88%D9%86%D9%87.png",
  login_image_url: "https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200",
  login_tagline_en: "Predict. Compete. Win.",
  login_tagline_ar: "توقّع. تنافس. اربح.",
  background_style: "pattern",
  background_image_url: "",
  colors: {
    primary: "#064E3B",
    primary_foreground: "#FFFFFF",
    accent: "#D4AF37",
    accent_foreground: "#0F172A",
    background: "#F8FAFC",
    foreground: "#0F172A",
    card: "#FFFFFF",
    secondary: "#F1F5F9",
    border: "#E2E8F0",
  },
};

const BG_STYLES = ["pattern", "gradient", "solid", "image"];

const COLOR_KEYS = [
  ["primary", "colorPrimary"],
  ["primary_foreground", "colorPrimaryFg"],
  ["accent", "colorAccent"],
  ["accent_foreground", "colorAccentFg"],
  ["background", "colorBackground"],
  ["foreground", "colorForeground"],
  ["card", "colorCard"],
  ["secondary", "colorSecondary"],
  ["border", "colorBorder"],
];

function ImageField({ label, value, onChange, testKey }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/branding/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success(t("admin.branding.saved"));
    } catch {
      toast.error(t("admin.branding.uploadError"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-lg border border-border bg-secondary grid place-items-center overflow-hidden">
          {value ? <img src={value} alt={label} className="h-full w-full object-contain p-1" /> : <Trophy className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 space-y-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid={`branding-${testKey}-file`} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()} data-testid={`branding-${testKey}-upload`}>
            <Upload className="h-4 w-4 me-2" />{busy ? t("admin.branding.uploading") : t("admin.branding.upload")}
          </Button>
          <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={t("admin.branding.pasteUrl")} data-testid={`branding-${testKey}-url`} />
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange, testKey }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 rounded-md border border-border bg-transparent cursor-pointer p-0.5"
          data-testid={`branding-color-${testKey}`}
        />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs uppercase" data-testid={`branding-hex-${testKey}`} />
      </div>
    </div>
  );
}

export default function AdminBranding() {
  const { t, lang } = useI18n();
  const { refresh } = useBranding();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings/branding").then((r) => {
      setForm({ ...DEFAULTS, ...r.data, colors: { ...DEFAULTS.colors, ...(r.data?.colors || {}) } });
    });
  }, []);

  if (!form) return <div className="p-6 text-muted-foreground" data-testid="branding-loading">{t("common.loading")}</div>;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setColor = (key, val) => setForm((f) => ({ ...f, colors: { ...f.colors, [key]: val } }));

  const save = async (payload, silent) => {
    const body = payload || form;
    setSaving(true);
    try {
      await api.put("/admin/settings/branding", body);
      await refresh();
      if (!silent) toast.success(t("admin.branding.saved"));
    } catch {
      toast.error(t("admin.branding.uploadError"));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setForm(DEFAULTS);
    await save(DEFAULTS, true);
    toast.success(t("admin.branding.resetDone"));
  };

  const c = form.colors;
  const name = lang === "ar" ? form.name_ar : form.name_en;

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-branding">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.branding.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("admin.branding.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} data-testid="branding-reset">
            <RotateCcw className="h-4 w-4 me-2" />{t("admin.branding.reset")}
          </Button>
          <Button onClick={() => save()} disabled={saving} data-testid="branding-save">
            {saving ? t("common.loading") : t("admin.branding.save")}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card className="p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{t("admin.branding.identity")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t("admin.branding.nameEn")}</Label><Input value={form.name_en || ""} onChange={(e) => set("name_en", e.target.value)} data-testid="branding-name-en" /></div>
              <div className="space-y-1.5"><Label>{t("admin.branding.nameAr")}</Label><Input value={form.name_ar || ""} onChange={(e) => set("name_ar", e.target.value)} dir="rtl" data-testid="branding-name-ar" /></div>
              <div className="space-y-1.5"><Label>{t("admin.branding.loginTaglineEn")}</Label><Input value={form.login_tagline_en || ""} onChange={(e) => set("login_tagline_en", e.target.value)} data-testid="branding-tagline-en" /></div>
              <div className="space-y-1.5"><Label>{t("admin.branding.loginTaglineAr")}</Label><Input value={form.login_tagline_ar || ""} onChange={(e) => set("login_tagline_ar", e.target.value)} dir="rtl" data-testid="branding-tagline-ar" /></div>
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold">{t("admin.branding.images")}</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <ImageField label={t("admin.branding.logo")} value={form.logo_url} onChange={(v) => set("logo_url", v)} testKey="logo" />
              <ImageField label={t("admin.branding.favicon")} value={form.favicon_url} onChange={(v) => set("favicon_url", v)} testKey="favicon" />
              <ImageField label={t("admin.branding.symbol")} value={form.symbol_url} onChange={(v) => set("symbol_url", v)} testKey="symbol" />
              <ImageField label={t("admin.branding.loginImage")} value={form.login_image_url} onChange={(v) => set("login_image_url", v)} testKey="login" />
            </div>
          </Card>

          {/* Page background */}
          <Card className="p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{t("admin.branding.background")}</h2>
            <div className="flex flex-wrap gap-2">
              {BG_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("background_style", s)}
                  data-testid={`branding-bg-${s}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.background_style === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/70 border-border hover:bg-secondary/70"
                  }`}
                >
                  {t(`admin.branding.bg_${s}`)}
                </button>
              ))}
            </div>
            {form.background_style === "image" && (
              <ImageField label={t("admin.branding.bgImage")} value={form.background_image_url} onChange={(v) => set("background_image_url", v)} testKey="bgimage" />
            )}
            {form.background_style === "pattern" && (
              <p className="text-xs text-muted-foreground">{t("admin.branding.bgPatternHint")}</p>
            )}
          </Card>

          {/* Colors */}
          <Card className="p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{t("admin.branding.colors")}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {COLOR_KEYS.map(([key, label]) => (
                <ColorField key={key} label={t(`admin.branding.${label}`)} value={c[key]} onChange={(v) => setColor(key, v)} testKey={key} />
              ))}
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <Card className="p-5 lg:sticky lg:top-24 space-y-4" data-testid="branding-preview">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("admin.branding.preview")}</p>

            {/* Mini app frame */}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: c.border, background: c.background, color: c.foreground }}>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: c.border, background: c.card }}>
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" className="h-7 w-7 rounded-md object-contain" style={{ background: c.secondary }} />
                ) : (
                  <div className="h-7 w-7 rounded-md grid place-items-center text-[10px] font-bold" style={{ background: c.primary, color: c.primary_foreground }}>CW</div>
                )}
                <span className="text-sm font-semibold truncate">{name}</span>
              </div>
              <div className="p-4 space-y-3 relative overflow-hidden">
                {form.background_style === "pattern" && form.symbol_url && (
                  <img src={form.symbol_url} alt="" className="absolute -right-4 -bottom-4 w-24 opacity-[0.08] pointer-events-none" />
                )}
                <div className="flex items-center gap-2 relative z-10">
                  <span className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: c.primary, color: c.primary_foreground }} data-testid="preview-primary-btn">{t("admin.branding.sampleBtn")}</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: c.accent, color: c.accent_foreground }}>{t("admin.branding.sampleBadge")}</span>
                </div>
                <div className="rounded-lg p-3 text-xs" style={{ background: c.secondary, color: c.foreground }}>
                  Aa — {name}
                </div>
              </div>
            </div>

            {/* Mini login hero */}
            <div className="relative rounded-xl overflow-hidden h-32 border" style={{ borderColor: c.border }}>
              {form.login_image_url && <img src={form.login_image_url} alt="hero" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(135deg, ${c.primary}F2, ${c.primary}A6)` }} />
              <div className="relative z-10 p-3 h-full flex flex-col justify-end text-white">
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: c.accent }}>{t("login.hero")}</p>
                <p className="text-sm font-bold leading-tight">{lang === "ar" ? form.login_tagline_ar : form.login_tagline_en}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
