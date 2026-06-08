import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

export default function AdminReports() {
  const { t } = useI18n();
  const [depts, setDepts] = useState([]);
  const [acc, setAcc] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get("/admin/reports/departments").then((r) => setDepts(r.data));
    api.get("/admin/reports/accuracy").then((r) => setAcc(r.data));
    api.get("/admin/reports/overview").then((r) => setOverview(r.data));
  }, []);

  const exportCsv = () => {
    const rows = [["Department", "Members", "Avg Points", "Total Points"], ...depts.map((d) => [d.department, d.members, d.avg_points, d.total_points])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "departments-report.csv"; a.click();
  };

  const COLORS = ["#064E3B", "#D4AF37", "#0EA5E9", "#EF4444"];

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-reports">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.reports.title")}</h1>
        <Button variant="outline" onClick={exportCsv} data-testid="reports-export"><Download className="h-4 w-4 me-2" /> {t("admin.reports.exportExcel")}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">{t("admin.reports.departments")}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="department" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total_points" fill="#064E3B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">{t("admin.reports.accuracy")}</h2>
          {acc && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={[
                      { name: t("admin.reports.exactScores"), value: acc.exact_scores },
                      { name: t("admin.reports.correctOutcome"), value: acc.correct_outcome - acc.exact_scores },
                      { name: "Wrong", value: acc.settled - acc.correct_outcome },
                    ]}
                    outerRadius={90}
                    label
                  >
                    {[0, 1, 2].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Detail</h2>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_100px_120px_120px] min-w-[500px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
              <div>{t("admin.users.department")}</div>
              <div className="text-end">{t("admin.reports.members")}</div>
              <div className="text-end">{t("admin.reports.avgPoints")}</div>
              <div className="text-end">{t("admin.reports.total")}</div>
            </div>
            {depts.map((d, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_120px_120px] min-w-[500px] px-3 py-2 border-b border-border last:border-b-0 text-sm">
                <div className="font-medium">{d.department}</div>
                <div className="text-end tabular-nums">{d.members}</div>
                <div className="text-end tabular-nums">{d.avg_points}</div>
                <div className="text-end tabular-nums font-bold">{d.total_points}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
