import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Users, ListChecks, Trophy, Activity, TrendingUp, Percent } from "lucide-react";

const Stat = ({ icon: Icon, label, value, sub, testId }) => (
  <Card className="p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className="font-display text-3xl font-bold tracking-tight mt-2">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

export default function AdminOverview() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    api.get("/admin/reports/overview").then((r) => setData(r.data));
    api.get("/admin/reports/departments").then((r) => setDepts(r.data));
  }, []);

  if (!data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-overview">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.overview")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time platform metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Stat icon={Users} label={t("admin.totalUsers")} value={data.total_users} sub={`${data.active_users} ${t("admin.activeUsers")}`} testId="ov-users" />
        <Stat icon={Trophy} label={t("admin.totalMatches")} value={data.total_matches} sub={`${data.finished_matches} ${t("admin.finishedMatches")}`} testId="ov-matches" />
        <Stat icon={ListChecks} label={t("admin.totalPredictions")} value={data.total_predictions} sub={`${data.participants} ${t("admin.participants")}`} testId="ov-predictions" />
        <Stat icon={Percent} label={t("admin.participationRate")} value={`${data.participation_rate}%`} testId="ov-participation" />
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> {t("admin.reports.departments")}</h2>
        <div className="grid grid-cols-[1fr_100px_100px_120px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
          <div>{t("admin.users.department")}</div>
          <div className="text-end">{t("admin.reports.members")}</div>
          <div className="text-end">{t("admin.reports.avgPoints")}</div>
          <div className="text-end">{t("admin.reports.total")}</div>
        </div>
        {depts.map((d, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_100px_100px_120px] px-3 py-2 border-b border-border last:border-b-0 text-sm">
            <div className="font-medium">{d.department}</div>
            <div className="text-end tabular-nums">{d.members}</div>
            <div className="text-end tabular-nums">{d.avg_points}</div>
            <div className="text-end tabular-nums font-bold">{d.total_points}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
