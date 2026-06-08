import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function AdminAudit() {
  const { t, lang } = useI18n();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async (action = "") => {
    const { data } = await api.get("/admin/audit-logs", { params: action ? { action } : {} });
    setLogs(data);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const id = setTimeout(() => load(filter), 300); return () => clearTimeout(id); }, [filter]);

  const colorOf = (a) => {
    if (a.includes("fail")) return "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";
    if (a.includes("login")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    if (a.includes("delete")) return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30";
    return "bg-secondary border border-border";
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-audit">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.audit.title")}</h1>

      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("admin.audit.filterAction")} className="ps-9" data-testid="audit-filter" />
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[180px_1fr_140px_120px_180px] min-w-[800px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
            <div>{t("admin.audit.time")}</div>
            <div>{t("admin.audit.user")}</div>
            <div>{t("admin.audit.action")}</div>
            <div>{t("admin.audit.resource")}</div>
            <div>{t("admin.audit.ip")}</div>
          </div>
          {logs.map((l) => (
            <div key={l.id} className="grid grid-cols-[180px_1fr_140px_120px_180px] min-w-[800px] px-3 py-2 border-b border-border last:border-b-0 text-sm" data-testid={`audit-row-${l.id}`}>
              <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString(lang === "ar" ? "ar" : "en-GB")}</div>
              <div className="truncate">{l.user_email || "—"}</div>
              <div><Badge className={`text-xs ${colorOf(l.action)}`}>{l.action}</Badge></div>
              <div className="text-xs text-muted-foreground">{l.resource || "—"}</div>
              <div className="text-xs text-muted-foreground font-mono">{l.ip || "—"}</div>
            </div>
          ))}
          {logs.length === 0 && <p className="p-6 text-sm text-muted-foreground">—</p>}
        </div>
      </Card>
    </div>
  );
}
