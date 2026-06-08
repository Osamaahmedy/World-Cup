import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function News() {
  const { t, lang } = useI18n();
  const [news, setNews] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [standings, setStandings] = useState({});

  useEffect(() => {
    api.get("/content/news").then((r) => setNews(r.data));
    api.get("/tournament/matches").then((r) => setMatches(r.data));
    api.get("/tournament/teams").then((r) => {
      const tm = {}; r.data.forEach((t) => (tm[t.id] = t)); setTeams(tm);
    });
    api.get("/tournament/standings").then((r) => setStandings(r.data));
  }, []);

  const newsByCat = (cat) => cat === "all" ? news : news.filter((n) => n.category === cat);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("news.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("news.subtitle")}</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-testid="news-tab-all">{t("news.tabs.all")}</TabsTrigger>
          <TabsTrigger value="world_cup" data-testid="news-tab-wc">{t("news.tabs.world_cup")}</TabsTrigger>
          <TabsTrigger value="team" data-testid="news-tab-team">{t("news.tabs.team")}</TabsTrigger>
          <TabsTrigger value="stats" data-testid="news-tab-stats">{t("news.tabs.stats")}</TabsTrigger>
          <TabsTrigger value="schedule" data-testid="news-tab-schedule">{t("news.tabs.schedule")}</TabsTrigger>
          <TabsTrigger value="standings" data-testid="news-tab-standings">{t("news.standings")}</TabsTrigger>
        </TabsList>

        {["all", "world_cup", "team", "stats"].map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="grid gap-4 md:grid-cols-2">
              {newsByCat(cat).map((n) => (
                <Card key={n.id} className="overflow-hidden" data-testid={`news-card-${n.id}`}>
                  {n.image_url && <img src={n.image_url} alt="" className="h-44 w-full object-cover" />}
                  <div className="p-5">
                    <Badge variant="outline" className="capitalize text-xs mb-2">{n.category.replace("_", " ")}</Badge>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{lang === "ar" && n.title_ar ? n.title_ar : n.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{lang === "ar" && n.body_ar ? n.body_ar : n.body}</p>
                  </div>
                </Card>
              ))}
              {newsByCat(cat).length === 0 && <p className="text-sm text-muted-foreground col-span-full">—</p>}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="schedule">
          <Card>
            <div className="grid grid-cols-[1fr_1fr_120px_120px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-4 py-3 border-b border-border">
              <div>{t("admin.tournament.home")}</div>
              <div>{t("admin.tournament.away")}</div>
              <div>{t("matches.kickoff")}</div>
              <div className="text-end">{t("matches.scheduled")}</div>
            </div>
            {matches.map((m) => (
              <div key={m.id} className="grid grid-cols-[1fr_1fr_120px_120px] px-4 py-3 border-b border-border last:border-b-0 text-sm">
                <div>{teams[m.home_team_id]?.flag_emoji} {teams[m.home_team_id]?.name}</div>
                <div>{teams[m.away_team_id]?.flag_emoji} {teams[m.away_team_id]?.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.kickoff).toLocaleString(lang === "ar" ? "ar" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
                <div className="text-end">
                  {m.status === "finished" ? (
                    <span className="font-bold">{m.home_score} — {m.away_score}</span>
                  ) : (
                    <Badge variant="outline" className="capitalize">{m.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="standings">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(standings).sort(([a],[b]) => a.localeCompare(b)).map(([group, rows]) => (
              <Card key={group} className="overflow-hidden" data-testid={`standings-group-${group}`}>
                <div className="px-5 py-3 border-b border-border bg-secondary/40">
                  <p className="font-display font-semibold">{t("matches.group")} {group}</p>
                </div>
                <div className="grid grid-cols-[1fr_repeat(6,40px)] text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground px-3 py-2 border-b border-border">
                  <div className="ps-1">Team</div>
                  <div className="text-center">P</div>
                  <div className="text-center">W</div>
                  <div className="text-center">D</div>
                  <div className="text-center">L</div>
                  <div className="text-center">GD</div>
                  <div className="text-center font-bold text-foreground">PTS</div>
                </div>
                {rows.map((r) => (
                  <div key={r.team.id} className="grid grid-cols-[1fr_repeat(6,40px)] px-3 py-2 border-b border-border last:border-b-0 text-sm">
                    <div className="flex items-center gap-2 ps-1">
                      <span>{r.team.flag_emoji}</span>
                      <span className="truncate">{r.team.name}</span>
                    </div>
                    <div className="text-center tabular-nums">{r.p}</div>
                    <div className="text-center tabular-nums">{r.w}</div>
                    <div className="text-center tabular-nums">{r.d}</div>
                    <div className="text-center tabular-nums">{r.l}</div>
                    <div className="text-center tabular-nums">{r.gd > 0 ? "+" : ""}{r.gd}</div>
                    <div className="text-center font-bold tabular-nums">{r.pts}</div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
