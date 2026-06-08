import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminTournament() {
  const { t, lang } = useI18n();
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  // Team form
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", code: "", flag_emoji: "", group: "A" });

  // Match form
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchForm, setMatchForm] = useState({ home_team_id: "", away_team_id: "", kickoff: "", stage: "group", venue: "", group: "A" });

  // Result form
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMatch, setResultMatch] = useState(null);
  const [resultForm, setResultForm] = useState({ home_score: 0, away_score: 0 });

  const load = async () => {
    const [ts, ms] = await Promise.all([
      api.get("/tournament/teams"),
      api.get("/tournament/matches"),
    ]);
    setTeams(ts.data); setMatches(ms.data);
  };
  useEffect(() => { load(); }, []);

  const teamById = (id) => teams.find((t) => t.id === id);

  const createTeam = async () => {
    try {
      await api.post("/tournament/teams", teamForm);
      toast.success("Team added");
      setTeamOpen(false); setTeamForm({ name: "", code: "", flag_emoji: "", group: "A" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const delTeam = async (id) => { await api.delete(`/tournament/teams/${id}`); load(); };

  const createMatch = async () => {
    try {
      const payload = { ...matchForm, kickoff: new Date(matchForm.kickoff).toISOString() };
      await api.post("/tournament/matches", payload);
      toast.success("Match added");
      setMatchOpen(false);
      setMatchForm({ home_team_id: "", away_team_id: "", kickoff: "", stage: "group", venue: "", group: "A" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const delMatch = async (id) => { await api.delete(`/tournament/matches/${id}`); load(); };

  const openResult = (m) => {
    setResultMatch(m);
    setResultForm({ home_score: m.home_score ?? 0, away_score: m.away_score ?? 0 });
    setResultOpen(true);
  };

  const saveResult = async () => {
    try {
      await api.patch(`/tournament/matches/${resultMatch.id}/result`, {
        home_score: Number(resultForm.home_score),
        away_score: Number(resultForm.away_score),
      });
      toast.success("Result saved");
      setResultOpen(false);
      load();
    } catch (e) { toast.error("Error"); }
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-tournament">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.tournament.title")}</h1>

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches" data-testid="tour-tab-matches">{t("admin.tournament.matches")}</TabsTrigger>
          <TabsTrigger value="teams" data-testid="tour-tab-teams">{t("admin.tournament.teams")}</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setMatchOpen(true)} data-testid="match-add-btn"><Plus className="h-4 w-4 me-2" /> {t("admin.tournament.addMatch")}</Button>
          </div>
          <Card>
            <div className="grid grid-cols-[1fr_1fr_140px_100px_120px_180px] min-w-[900px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
              <div>{t("admin.tournament.home")}</div>
              <div>{t("admin.tournament.away")}</div>
              <div>{t("admin.tournament.kickoff")}</div>
              <div>Score</div>
              <div>Status</div>
              <div className="text-end">Actions</div>
            </div>
            {matches.map((m) => (
              <div key={m.id} className="grid grid-cols-[1fr_1fr_140px_100px_120px_180px] min-w-[900px] px-3 py-2 border-b border-border last:border-b-0 text-sm items-center" data-testid={`tour-match-${m.id}`}>
                <div>{teamById(m.home_team_id)?.flag_emoji} {teamById(m.home_team_id)?.name}</div>
                <div>{teamById(m.away_team_id)?.flag_emoji} {teamById(m.away_team_id)?.name}</div>
                <div className="text-xs">{new Date(m.kickoff).toLocaleString(lang === "ar" ? "ar" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
                <div className="tabular-nums">{m.home_score != null ? `${m.home_score} – ${m.away_score}` : "—"}</div>
                <div><Badge variant="outline" className="capitalize">{m.status}</Badge></div>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => openResult(m)} data-testid={`tour-result-${m.id}`}>{t("admin.tournament.result")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => delMatch(m.id)} data-testid={`tour-match-del-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setTeamOpen(true)} data-testid="team-add-btn"><Plus className="h-4 w-4 me-2" /> {t("admin.tournament.addTeam")}</Button>
          </div>
          <Card>
            <div className="grid grid-cols-[60px_1fr_100px_100px_100px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
              <div>Flag</div>
              <div>{t("admin.tournament.teamName")}</div>
              <div>{t("admin.tournament.teamCode")}</div>
              <div>{t("admin.tournament.group")}</div>
              <div className="text-end">Actions</div>
            </div>
            {teams.map((t) => (
              <div key={t.id} className="grid grid-cols-[60px_1fr_100px_100px_100px] px-3 py-2 border-b border-border last:border-b-0 text-sm items-center" data-testid={`team-row-${t.id}`}>
                <div className="text-2xl">{t.flag_emoji}</div>
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{t.code}</div>
                <div><Badge variant="outline">{t.group}</Badge></div>
                <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => delTeam(t.id)} data-testid={`team-del-${t.id}`}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Dialog */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent data-testid="team-dialog">
          <DialogHeader><DialogTitle>{t("admin.tournament.addTeam")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("admin.tournament.teamName")}</Label><Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} data-testid="team-form-name" /></div>
            <div><Label>{t("admin.tournament.teamCode")}</Label><Input value={teamForm.code} onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase() })} maxLength={3} data-testid="team-form-code" /></div>
            <div><Label>{t("admin.tournament.flag")}</Label><Input value={teamForm.flag_emoji} onChange={(e) => setTeamForm({ ...teamForm, flag_emoji: e.target.value })} data-testid="team-form-flag" /></div>
            <div><Label>{t("admin.tournament.group")}</Label><Input value={teamForm.group} onChange={(e) => setTeamForm({ ...teamForm, group: e.target.value.toUpperCase() })} maxLength={1} data-testid="team-form-group" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createTeam} data-testid="team-form-save">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent data-testid="match-dialog">
          <DialogHeader><DialogTitle>{t("admin.tournament.addMatch")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("admin.tournament.home")}</Label>
              <Select value={matchForm.home_team_id} onValueChange={(v) => setMatchForm({ ...matchForm, home_team_id: v })}>
                <SelectTrigger data-testid="match-form-home"><SelectValue /></SelectTrigger>
                <SelectContent>{teams.map((tm) => <SelectItem key={tm.id} value={tm.id}>{tm.flag_emoji} {tm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.tournament.away")}</Label>
              <Select value={matchForm.away_team_id} onValueChange={(v) => setMatchForm({ ...matchForm, away_team_id: v })}>
                <SelectTrigger data-testid="match-form-away"><SelectValue /></SelectTrigger>
                <SelectContent>{teams.map((tm) => <SelectItem key={tm.id} value={tm.id}>{tm.flag_emoji} {tm.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("admin.tournament.kickoff")}</Label><Input type="datetime-local" value={matchForm.kickoff} onChange={(e) => setMatchForm({ ...matchForm, kickoff: e.target.value })} data-testid="match-form-kickoff" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{t("admin.tournament.stage")}</Label>
                <Select value={matchForm.stage} onValueChange={(v) => setMatchForm({ ...matchForm, stage: v })}>
                  <SelectTrigger data-testid="match-form-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">group</SelectItem>
                    <SelectItem value="r16">Round of 16</SelectItem>
                    <SelectItem value="qf">Quarter-final</SelectItem>
                    <SelectItem value="sf">Semi-final</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="3rd">3rd Place</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("admin.tournament.group")}</Label><Input value={matchForm.group} onChange={(e) => setMatchForm({ ...matchForm, group: e.target.value })} maxLength={1} data-testid="match-form-group" /></div>
            </div>
            <div><Label>{t("admin.tournament.venue")}</Label><Input value={matchForm.venue} onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })} data-testid="match-form-venue" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createMatch} data-testid="match-form-save">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent data-testid="result-dialog">
          <DialogHeader><DialogTitle>{t("admin.tournament.result")}</DialogTitle></DialogHeader>
          {resultMatch && (
            <div className="space-y-3">
              <p className="text-sm">{teamById(resultMatch.home_team_id)?.name} vs {teamById(resultMatch.away_team_id)?.name}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{teamById(resultMatch.home_team_id)?.name}</Label><Input type="number" min="0" value={resultForm.home_score} onChange={(e) => setResultForm({ ...resultForm, home_score: e.target.value })} data-testid="result-form-home" /></div>
                <div><Label>{teamById(resultMatch.away_team_id)?.name}</Label><Input type="number" min="0" value={resultForm.away_score} onChange={(e) => setResultForm({ ...resultForm, away_score: e.target.value })} data-testid="result-form-away" /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveResult} data-testid="result-form-save">{t("admin.tournament.saveResult")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
