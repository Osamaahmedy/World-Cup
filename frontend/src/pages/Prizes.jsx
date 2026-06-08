import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star } from "lucide-react";

const iconFor = (icon) => {
  switch (icon) {
    case "medal": return Medal;
    case "award": return Award;
    case "star": return Star;
    default: return Trophy;
  }
};

export default function Prizes() {
  const { t, lang } = useI18n();
  const [prizes, setPrizes] = useState([]);
  const [users, setUsers] = useState({});

  useEffect(() => {
    api.get("/content/prizes").then((r) => setPrizes(r.data));
    api.get("/leaderboard?limit=200").then((r) => {
      const m = {}; r.data.forEach((u) => (m[u.user_id] = u)); setUsers(m);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("prizes.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("prizes.subtitle")}</p>
        </div>
        <img src="https://images.pexels.com/photos/6532362/pexels-photo-6532362.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=360" alt="" className="hidden sm:block h-24 rounded-xl object-cover" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {prizes.map((p) => {
          const Icon = iconFor(p.icon);
          const isTop = p.rank_from === 1;
          return (
            <Card key={p.id} className={`p-6 transition-all hover:-translate-y-0.5 ${isTop ? "border-accent/60 bg-accent/5" : ""}`} data-testid={`prize-${p.id}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${isTop ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{lang === "ar" && p.title_ar ? p.title_ar : p.title}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("prizes.ranks")} #{p.rank_from}{p.rank_to !== p.rank_from ? `–${p.rank_to}` : ""}</p>
                </div>
              </div>
              {p.description && <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">{t("prizes.winners")}</p>
                {(!p.assigned_user_ids || p.assigned_user_ids.length === 0) ? (
                  <p className="text-sm text-muted-foreground italic">—</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.assigned_user_ids.map((uid) => (
                      <Badge key={uid} variant="outline" className="text-xs">
                        {users[uid]?.full_name || uid}
                      </Badge>
                    ))}
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
