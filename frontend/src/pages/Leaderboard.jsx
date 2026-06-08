import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal } from "lucide-react";

const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent-gold text-[#0F172A] font-bold text-xs"><Crown className="h-3.5 w-3.5" /></span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-zinc-300 text-zinc-800 font-bold text-xs"><Medal className="h-3.5 w-3.5" /></span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-orange-300 text-orange-900 font-bold text-xs"><Medal className="h-3.5 w-3.5" /></span>;
  return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-foreground font-semibold text-xs">{rank}</span>;
};

export default function Leaderboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [department, setDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);

  const load = async (dept) => {
    const params = dept && dept !== "all" ? { department: dept } : {};
    const { data } = await api.get("/leaderboard", { params });
    setRows(data);
  };

  useEffect(() => {
    load();
    // Get departments via leaderboard set
    api.get("/leaderboard").then((r) => {
      const set = new Set(r.data.map((x) => x.department).filter(Boolean));
      setDepartments(Array.from(set));
    });
  }, []);

  useEffect(() => { load(department); }, [department]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("leaderboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("leaderboard.subtitle")}</p>
      </div>

      <Tabs defaultValue="overall">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="overall" data-testid="lb-tab-overall" onClick={() => setDepartment("all")}>{t("leaderboard.overall")}</TabsTrigger>
            <TabsTrigger value="department" data-testid="lb-tab-department">{t("leaderboard.department")}</TabsTrigger>
            <TabsTrigger value="top10" data-testid="lb-tab-top10" onClick={() => setDepartment("all")}>{t("leaderboard.top10")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overall">
          <LeaderboardTable rows={rows} youId={user?.id} t={t} testId="leaderboard-overall" />
        </TabsContent>
        <TabsContent value="department">
          <div className="mb-3 max-w-xs">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger data-testid="lb-dept-select"><SelectValue placeholder={t("leaderboard.filterDept")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leaderboard.all")}</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <LeaderboardTable rows={rows} youId={user?.id} t={t} testId="leaderboard-department" />
        </TabsContent>
        <TabsContent value="top10">
          <LeaderboardTable rows={rows.slice(0, 10)} youId={user?.id} t={t} testId="leaderboard-top10" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const LeaderboardTable = ({ rows, youId, t, testId }) => (
  <Card className="overflow-hidden" data-testid={testId}>
    <div className="grid grid-cols-[60px_1fr_140px_100px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-4 py-3 border-b border-border">
      <div>{t("leaderboard.rank")}</div>
      <div>{t("leaderboard.name")}</div>
      <div className="hidden sm:block">{t("leaderboard.deptCol")}</div>
      <div className="text-end">{t("leaderboard.points")}</div>
    </div>
    {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">—</div>}
    {rows.map((r) => {
      const isYou = r.user_id === youId;
      const initials = r.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
      return (
        <div key={r.user_id} data-testid={`lb-row-${r.rank}`} className={`grid grid-cols-[60px_1fr_140px_100px] items-center gap-2 px-4 py-3 border-b border-border last:border-b-0 ${isYou ? "bg-primary/5" : ""}`}>
          <div><RankBadge rank={r.rank} /></div>
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8 hidden sm:flex"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{r.full_name} {isYou && <Badge className="ms-2 align-middle">{t("leaderboard.you")}</Badge>}</p>
              <p className="text-xs text-muted-foreground sm:hidden">{r.department}</p>
            </div>
          </div>
          <div className="hidden sm:block text-sm text-muted-foreground">{r.department || "—"}</div>
          <div className="text-end font-display font-bold tabular-nums">{r.total_points}</div>
        </div>
      );
    })}
  </Card>
);
