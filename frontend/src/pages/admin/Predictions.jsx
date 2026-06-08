import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminPredictions() {
  const { t } = useI18n();
  const [rules, setRules] = useState({ exact: 10, outcome_and_diff: 5, outcome_only: 3, wrong: 0 });
  const [window, setWindow] = useState({ open: true });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/settings/scoring").then((r) => setRules(r.data));
    api.get("/admin/settings/window").then((r) => setWindow(r.data));
    api.get("/admin/reports/overview").then((r) => setStats(r.data));
  }, []);

  const saveRules = async () => {
    await api.put("/admin/settings/scoring", {
      exact: Number(rules.exact),
      outcome_and_diff: Number(rules.outcome_and_diff),
      outcome_only: Number(rules.outcome_only),
      wrong: Number(rules.wrong),
    });
    toast.success(t("admin.predictions.saved"));
  };

  const saveWindow = async (open) => {
    setWindow({ open });
    await api.put("/admin/settings/window", { open });
    toast.success(t("admin.predictions.saved"));
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-predictions">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.predictions.title")}</h1>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("admin.predictions.window")}</h2>
            <p className="text-xs text-muted-foreground">{window.open ? t("admin.predictions.open") : t("admin.predictions.closed")}</p>
          </div>
          <Switch checked={window.open} onCheckedChange={saveWindow} data-testid="window-toggle" />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold mb-4">{t("admin.predictions.scoring")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><Label>{t("admin.predictions.exact")}</Label><Input type="number" value={rules.exact} onChange={(e) => setRules({ ...rules, exact: e.target.value })} data-testid="rule-exact" /></div>
          <div><Label>{t("admin.predictions.outcomeDiff")}</Label><Input type="number" value={rules.outcome_and_diff} onChange={(e) => setRules({ ...rules, outcome_and_diff: e.target.value })} data-testid="rule-outcome-diff" /></div>
          <div><Label>{t("admin.predictions.outcome")}</Label><Input type="number" value={rules.outcome_only} onChange={(e) => setRules({ ...rules, outcome_only: e.target.value })} data-testid="rule-outcome" /></div>
          <div><Label>{t("admin.predictions.wrong")}</Label><Input type="number" value={rules.wrong} onChange={(e) => setRules({ ...rules, wrong: e.target.value })} data-testid="rule-wrong" /></div>
        </div>
        <div className="mt-4"><Button onClick={saveRules} data-testid="rules-save">{t("admin.predictions.save")}</Button></div>
      </Card>

      {stats && (
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Participation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">{t("admin.totalPredictions")}</p><p className="font-display text-2xl font-bold">{stats.total_predictions}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("admin.participants")}</p><p className="font-display text-2xl font-bold">{stats.participants}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("admin.totalUsers")}</p><p className="font-display text-2xl font-bold">{stats.total_users}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("admin.participationRate")}</p><p className="font-display text-2xl font-bold">{stats.participation_rate}%</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}
