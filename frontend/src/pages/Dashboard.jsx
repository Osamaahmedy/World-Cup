import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, Hash, Building2, TrendingUp, ArrowRight, Pin } from "lucide-react";

const Stat = ({ icon: Icon, label, value, sub, testId }) => (
  <Card className="p-5 flex flex-col gap-2 hover:shadow-md transition-all hover:-translate-y-0.5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="font-display text-3xl font-bold tracking-tight">{value}</div>
    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
  </Card>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const me = data.me || {};
  return (
    <div className="space-y-6 animate-fade-up" data-testid="employee-dashboard">
      {/* Welcome strip */}
      <div className="rounded-2xl p-6 sm:p-8 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-gold">{t("login.hero")}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-2">{t("dashboard.welcome")}, {user?.full_name?.split(" ")[0]}</h1>
            <p className="text-sm text-white/75 mt-1">{user?.department} · {user?.email}</p>
          </div>
          <Link to="/matches" data-testid="cta-predict-matches" className="inline-flex items-center gap-2 rounded-full bg-accent-gold text-[#0F172A] px-5 py-2.5 font-semibold text-sm hover:brightness-110 transition">
            {t("dashboard.predictNow")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Hash} label={t("dashboard.yourRank")} value={me.rank ? `#${me.rank}` : "—"} sub={`${t("dashboard.of")} ${me.total_users || 0}`} testId="stat-rank" />
        <Stat icon={Trophy} label={t("dashboard.totalPoints")} value={me.total_points ?? 0} testId="stat-points" />
        <Stat icon={Target} label={t("dashboard.accuracy")} value={`${me.accuracy || 0}%`} sub={`${me.settled_count || 0} ${t("profile.settled")}`} testId="stat-accuracy" />
        <Stat icon={Building2} label={t("dashboard.departmentRank")} value={me.department_rank ? `#${me.department_rank}` : "—"} sub={user?.department} testId="stat-dept-rank" />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Upcoming matches */}
        <Card className="lg:col-span-7 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t("dashboard.upcoming")}</h2>
            <Link to="/matches" className="text-xs text-primary hover:underline" data-testid="link-view-all-matches">{t("dashboard.viewAll")}</Link>
          </div>
          <div className="space-y-3">
            {data.upcoming_matches.length === 0 && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {data.upcoming_matches.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 transition" data-testid={`upcoming-${m.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{m.home_team?.flag_emoji}</span>
                    <span className="truncate">{m.home_team?.name}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span>{m.away_team?.flag_emoji}</span>
                    <span className="truncate">{m.away_team?.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(m.kickoff).toLocaleString(lang === "ar" ? "ar" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · {m.venue || "—"}
                  </div>
                </div>
                {m.status === "live" ? (
                  <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-live">{t("matches.live")}</Badge>
                ) : (
                  <Badge variant="outline">{m.group ? `${t("matches.group")} ${m.group}` : t("matches.scheduled")}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-5 p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">{t("dashboard.announcements")}</h2>
          <div className="space-y-3">
            {data.announcements.length === 0 && <p className="text-sm text-muted-foreground">{t("dashboard.noAnnouncements")}</p>}
            {data.announcements.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-border bg-accent/5" data-testid={`announcement-${a.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
                  <p className="font-semibold text-sm">{lang === "ar" && a.title_ar ? a.title_ar : a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{lang === "ar" && a.body_ar ? a.body_ar : a.body}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent predictions */}
        <Card className="lg:col-span-7 p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">{t("dashboard.recent")}</h2>
          <div className="space-y-2">
            {data.recent_predictions.length === 0 && <p className="text-sm text-muted-foreground">{t("dashboard.noPredictions")}</p>}
            {data.recent_predictions.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border" data-testid={`recent-pred-${p.id}`}>
                <div className="text-sm">
                  <span className="font-medium">{p.home_score} — {p.away_score}</span>
                  <span className="text-muted-foreground ms-2">{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
                {p.points_awarded != null ? (
                  <Badge className="bg-primary/10 text-primary border border-primary/30">+{p.points_awarded} {t("matches.points")}</Badge>
                ) : (
                  <Badge variant="outline">{t("matches.pickWillLock")}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* News */}
        <Card className="lg:col-span-5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t("dashboard.latestNews")}</h2>
            <Link to="/news" className="text-xs text-primary hover:underline" data-testid="link-view-news">{t("dashboard.viewAll")}</Link>
          </div>
          <div className="space-y-2">
            {data.news.length === 0 && <p className="text-sm text-muted-foreground">{t("dashboard.noNews")}</p>}
            {data.news.slice(0, 4).map((n) => (
              <div key={n.id} className="p-3 rounded-xl border border-border" data-testid={`news-${n.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize text-xs">{n.category.replace("_", " ")}</Badge>
                </div>
                <p className="font-medium text-sm">{lang === "ar" && n.title_ar ? n.title_ar : n.title}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
