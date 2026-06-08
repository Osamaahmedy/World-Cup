import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

const blank = { title: "", title_ar: "", description: "", rank_from: 1, rank_to: 1, icon: "trophy" };

export default function AdminRewards() {
  const { t } = useI18n();
  const [prizes, setPrizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const load = async () => {
    const { data } = await api.get("/content/prizes");
    setPrizes(data);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/content/prizes", { ...form, rank_from: Number(form.rank_from), rank_to: Number(form.rank_to) });
      toast.success("Prize added");
      setOpen(false); setForm(blank); load();
    } catch (e) { toast.error("Error"); }
  };

  const del = async (id) => { await api.delete(`/content/prizes/${id}`); load(); };

  const assign = async () => {
    await api.post("/content/prizes/assign-winners");
    toast.success(t("admin.rewards.assigned"));
    load();
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-rewards">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.rewards.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={assign} data-testid="rewards-assign"><Sparkles className="h-4 w-4 me-2" /> {t("admin.rewards.assign")}</Button>
          <Button onClick={() => setOpen(true)} data-testid="rewards-add"><Plus className="h-4 w-4 me-2" /> {t("admin.rewards.add")}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {prizes.map((p) => (
          <Card key={p.id} className="p-5" data-testid={`reward-${p.id}`}>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-accent" />
              <p className="font-display text-lg font-semibold">{p.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">Ranks #{p.rank_from}{p.rank_to !== p.rank_from ? `–${p.rank_to}` : ""}</p>
            {p.description && <p className="text-sm mt-2">{p.description}</p>}
            <div className="mt-3 text-xs text-muted-foreground">{(p.assigned_user_ids || []).length} winner(s)</div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={() => del(p.id)} data-testid={`reward-del-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="reward-dialog">
          <DialogHeader><DialogTitle>{t("admin.rewards.add")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("admin.rewards.title_field")} (EN)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="reward-form-title" /></div>
            <div><Label>{t("admin.rewards.title_field")} (AR)</Label><Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} data-testid="reward-form-title-ar" /></div>
            <div><Label>{t("admin.rewards.descr")}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="reward-form-descr" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.rewards.rankFrom")}</Label><Input type="number" min="1" value={form.rank_from} onChange={(e) => setForm({ ...form, rank_from: e.target.value })} data-testid="reward-form-from" /></div>
              <div><Label>{t("admin.rewards.rankTo")}</Label><Input type="number" min="1" value={form.rank_to} onChange={(e) => setForm({ ...form, rank_to: e.target.value })} data-testid="reward-form-to" /></div>
            </div>
            <div>
              <Label>{t("admin.rewards.icon")}</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger data-testid="reward-form-icon"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trophy">trophy</SelectItem>
                  <SelectItem value="medal">medal</SelectItem>
                  <SelectItem value="award">award</SelectItem>
                  <SelectItem value="star">star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={create} data-testid="reward-form-save">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
