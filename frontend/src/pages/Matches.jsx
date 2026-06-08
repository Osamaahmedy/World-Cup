import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Lock, MapPin, Clock } from "lucide-react";

export default function Matches() {
  const { t, lang } = useI18n();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [mine, setMine] = useState({}); // by match_id
  const [filter, setFilter] = useState("all");
  const [scores, setScores] = useState({}); // {match_id: {h, a}}

  const load = async () => {
    const [m, ts, ps] = await Promise.all([
      api.get("/tournament/matches"),
      api.get("/tournament/teams"),
      api.get("/predictions/mine"),
    ]);
    setMatches(m.data);
    const tm = {};
    ts.data.forEach((t) => (tm[t.id] = t));
    setTeams(tm);
    const pm = {};
    ps.data.forEach((p) => (pm[p.match_id] = p));
    setMine(pm);
    // initialize scores from existing predictions
    const init = {};
    ps.data.forEach((p) => (init[p.match_id] = { h: p.home_score, a: p.away_score }));
    setScores(init);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return matches;
    return matches.filter((m) => m.status === filter);
  }, [matches, filter]);

  const isLocked = (m) => {
    if (m.status !== "scheduled") return true;
    return new Date(m.kickoff) <= new Date();
  };

  const submit = async (m) => {
    const s = scores[m.id];
    if (!s || s.h === "" || s.a === "" || s.h == null || s.a == null) {
      toast.error("Enter both scores");
      return;
    }
    try {
      const { data } = await api.post("/predictions", {
        match_id: m.id,
        home_score: Number(s.h),
        away_score: Number(s.a),
      });
      setMine({ ...mine, [m.id]: data });
      toast.success(t("matches.saved"));
    } catch (err) {
      if (err?.response?.status === 423) toast.error(t("matches.locked"));
      else if (err?.response?.status === 403) toast.error(t("matches.closed"));
      else toast.error("Unable to save");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("matches.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("matches.subtitle")}</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList data-testid="matches-filter">
            <TabsTrigger value="all" data-testid="filter-all">{t("matches.filterAll")}</TabsTrigger>
            <TabsTrigger value="scheduled" data-testid="filter-scheduled">{t("matches.scheduled")}</TabsTrigger>
            <TabsTrigger value="live" data-testid="filter-live">{t("matches.live")}</TabsTrigger>
            <TabsTrigger value="finished" data-testid="filter-finished">{t("matches.finished")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => {
          const home = teams[m.home_team_id];
          const away = teams[m.away_team_id];
          const locked = isLocked(m);
          const my = mine[m.id];
          const s = scores[m.id] || { h: my?.home_score ?? "", a: my?.away_score ?? "" };
          return (
            <Card key={m.id} className="p-5 flex flex-col gap-4 transition-all hover:shadow-md hover:-translate-y-0.5" data-testid={`match-card-${m.id}`}>
              <div className="flex items-center justify-between text-xs">
                <Badge variant="outline">{m.group ? `${t("matches.group")} ${m.group}` : m.stage}</Badge>
                {m.status === "live" && <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-live">{t("matches.live")}</Badge>}
                {m.status === "finished" && <Badge className="bg-secondary border border-border">{t("matches.finished")}</Badge>}
                {m.status === "scheduled" && <Badge variant="outline">{t("matches.scheduled")}</Badge>}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-center">
                  <div className="text-3xl">{home?.flag_emoji}</div>
                  <p className="font-semibold text-sm truncate mt-1">{home?.name}</p>
                  <p className="text-xs text-muted-foreground">{home?.code}</p>
                </div>
                <div className="text-center">
                  {m.status === "finished" ? (
                    <div className="font-display text-3xl font-bold tracking-tight">{m.home_score} <span className="text-muted-foreground">–</span> {m.away_score}</div>
                  ) : (
                    <div className="font-display text-xl text-muted-foreground">vs</div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl">{away?.flag_emoji}</div>
                  <p className="font-semibold text-sm truncate mt-1">{away?.name}</p>
                  <p className="text-xs text-muted-foreground">{away?.code}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(m.kickoff).toLocaleString(lang === "ar" ? "ar" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                {m.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.venue}</span>}
              </div>

              <div className="border-t border-border pt-3">
                {locked ? (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">{t("matches.yourPick")}</p>
                      {my ? (
                        <p className="font-medium">{my.home_score} — {my.away_score} {my.points_awarded != null && <span className="text-primary ms-2">+{my.points_awarded} {t("matches.points")}</span>}</p>
                      ) : (
                        <p className="text-muted-foreground italic">—</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={s.h}
                        onChange={(e) => setScores({ ...scores, [m.id]: { ...s, h: e.target.value } })}
                        className="w-16 text-center"
                        data-testid={`predict-home-${m.id}`}
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={s.a}
                        onChange={(e) => setScores({ ...scores, [m.id]: { ...s, a: e.target.value } })}
                        className="w-16 text-center"
                        data-testid={`predict-away-${m.id}`}
                      />
                    </div>
                    <Button size="sm" onClick={() => submit(m)} className="ms-auto" data-testid={`predict-submit-${m.id}`}>
                      {my ? t("matches.update") : t("matches.submit")}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
