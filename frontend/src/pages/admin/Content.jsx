import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";

const newsBlank = { title: "", title_ar: "", body: "", body_ar: "", category: "world_cup", image_url: "" };
const annBlank = { title: "", title_ar: "", body: "", body_ar: "", pinned: false };

export default function AdminContent() {
  const { t } = useI18n();
  const [news, setNews] = useState([]);
  const [ann, setAnn] = useState([]);

  const [newsOpen, setNewsOpen] = useState(false);
  const [newsForm, setNewsForm] = useState(newsBlank);
  const [annOpen, setAnnOpen] = useState(false);
  const [annForm, setAnnForm] = useState(annBlank);

  const load = async () => {
    const [n, a] = await Promise.all([api.get("/content/news"), api.get("/content/announcements")]);
    setNews(n.data); setAnn(a.data);
  };
  useEffect(() => { load(); }, []);

  const createNews = async () => {
    try { await api.post("/content/news", newsForm); toast.success("Published"); setNewsOpen(false); setNewsForm(newsBlank); load(); }
    catch { toast.error("Error"); }
  };
  const delNews = async (id) => { await api.delete(`/content/news/${id}`); load(); };

  const createAnn = async () => {
    try { await api.post("/content/announcements", annForm); toast.success("Posted"); setAnnOpen(false); setAnnForm(annBlank); load(); }
    catch { toast.error("Error"); }
  };
  const delAnn = async (id) => { await api.delete(`/content/announcements/${id}`); load(); };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-content">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.content.title")}</h1>

      <Tabs defaultValue="news">
        <TabsList>
          <TabsTrigger value="news" data-testid="content-tab-news">{t("admin.content.news")}</TabsTrigger>
          <TabsTrigger value="announcements" data-testid="content-tab-ann">{t("admin.content.announcements")}</TabsTrigger>
        </TabsList>

        <TabsContent value="news">
          <div className="flex justify-end mb-3"><Button onClick={() => setNewsOpen(true)} data-testid="news-add-btn"><Plus className="h-4 w-4 me-2" /> {t("admin.content.addNews")}</Button></div>
          <div className="grid gap-4 md:grid-cols-2">
            {news.map((n) => (
              <Card key={n.id} className="p-5" data-testid={`admin-news-${n.id}`}>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{n.category}</p>
                <h3 className="font-display text-lg font-semibold mt-1">{n.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{n.body}</p>
                <div className="flex justify-end mt-3"><Button variant="ghost" size="sm" onClick={() => delNews(n.id)} data-testid={`news-del-${n.id}`}><Trash2 className="h-4 w-4" /></Button></div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="flex justify-end mb-3"><Button onClick={() => setAnnOpen(true)} data-testid="ann-add-btn"><Plus className="h-4 w-4 me-2" /> {t("admin.content.addAnnouncement")}</Button></div>
          <div className="grid gap-4 md:grid-cols-2">
            {ann.map((a) => (
              <Card key={a.id} className="p-5" data-testid={`admin-ann-${a.id}`}>
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="h-4 w-4 text-accent" />}
                  <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.body}</p>
                <div className="flex justify-end mt-3"><Button variant="ghost" size="sm" onClick={() => delAnn(a.id)} data-testid={`ann-del-${a.id}`}><Trash2 className="h-4 w-4" /></Button></div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* News Dialog */}
      <Dialog open={newsOpen} onOpenChange={setNewsOpen}>
        <DialogContent data-testid="news-dialog">
          <DialogHeader><DialogTitle>{t("admin.content.addNews")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("admin.content.ttl")}</Label><Input value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} data-testid="news-form-title" /></div>
            <div><Label>{t("admin.content.ttlAr")}</Label><Input value={newsForm.title_ar} onChange={(e) => setNewsForm({ ...newsForm, title_ar: e.target.value })} data-testid="news-form-title-ar" /></div>
            <div><Label>{t("admin.content.body")}</Label><Textarea rows={3} value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} data-testid="news-form-body" /></div>
            <div><Label>{t("admin.content.bodyAr")}</Label><Textarea rows={3} value={newsForm.body_ar} onChange={(e) => setNewsForm({ ...newsForm, body_ar: e.target.value })} data-testid="news-form-body-ar" /></div>
            <div><Label>{t("admin.content.image")}</Label><Input value={newsForm.image_url} onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })} data-testid="news-form-image" /></div>
            <div>
              <Label>{t("admin.content.category")}</Label>
              <Select value={newsForm.category} onValueChange={(v) => setNewsForm({ ...newsForm, category: v })}>
                <SelectTrigger data-testid="news-form-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="world_cup">world_cup</SelectItem>
                  <SelectItem value="team">team</SelectItem>
                  <SelectItem value="stats">stats</SelectItem>
                  <SelectItem value="schedule">schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewsOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createNews} data-testid="news-form-save">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={annOpen} onOpenChange={setAnnOpen}>
        <DialogContent data-testid="ann-dialog">
          <DialogHeader><DialogTitle>{t("admin.content.addAnnouncement")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("admin.content.ttl")}</Label><Input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} data-testid="ann-form-title" /></div>
            <div><Label>{t("admin.content.ttlAr")}</Label><Input value={annForm.title_ar} onChange={(e) => setAnnForm({ ...annForm, title_ar: e.target.value })} data-testid="ann-form-title-ar" /></div>
            <div><Label>{t("admin.content.body")}</Label><Textarea rows={3} value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} data-testid="ann-form-body" /></div>
            <div><Label>{t("admin.content.bodyAr")}</Label><Textarea rows={3} value={annForm.body_ar} onChange={(e) => setAnnForm({ ...annForm, body_ar: e.target.value })} data-testid="ann-form-body-ar" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={annForm.pinned} onCheckedChange={(v) => setAnnForm({ ...annForm, pinned: v })} data-testid="ann-form-pinned" />
              <Label>{t("admin.content.pinned")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createAnn} data-testid="ann-form-save">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
