import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Edit2, UserX, UserCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

const blank = { employee_id: "", full_name: "", department: "", role: "employee", password: "" };

export default function AdminUsers() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const isSuper = me?.role === "super_admin";
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const fileRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/users", { params: q ? { q } : {} });
    setUsers(data);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [q]); // eslint-disable-line

  const save = async () => {
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${editing.id}`, payload);
        toast.success(t("admin.users.updated"));
      } else {
        await api.post("/users", form);
        toast.success(t("admin.users.created"));
      }
      setOpen(false);
      setEditing(null);
      setForm(blank);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
  };

  const startEdit = (u) => {
    setEditing(u);
    setForm({ employee_id: u.employee_id, full_name: u.full_name, department: u.department || "", role: u.role, password: "" });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const toggleActive = async (u) => {
    if (u.active) {
      await api.delete(`/users/${u.id}`);
      toast.success(t("admin.users.deactivated"));
    } else {
      await api.patch(`/users/${u.id}`, { active: true });
      toast.success(t("admin.users.updated"));
    }
    load();
  };

  const resetPass = async (u) => {
    if (!window.confirm(t("admin.users.resetConfirm"))) return;
    try {
      await api.post(`/users/${u.id}/reset-password`);
      toast.success(t("admin.users.resetDone"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    }
  };

  const importCsv = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/users/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
    toast.success(`Imported ${data.created} (skipped ${data.skipped})`);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-users">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{t("admin.users.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="users-import-btn"><Upload className="h-4 w-4 me-2" /> {t("admin.users.import")}</Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} data-testid="users-import-input" />
          <Button onClick={startCreate} data-testid="users-add-btn"><Plus className="h-4 w-4 me-2" /> {t("admin.users.add")}</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md mb-4">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.users.search")} className="ps-9" data-testid="users-search-input" />
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1fr_120px_120px_110px_70px_160px] min-w-[820px] text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground px-3 py-2 border-b border-border">
            <div>{t("admin.users.name")}</div>
            <div>{t("login.employeeId")}</div>
            <div>{t("admin.users.department")}</div>
            <div>{t("admin.users.role")}</div>
            <div>{t("admin.users.active")}</div>
            <div className="text-end">{t("admin.users.actions")}</div>
          </div>
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-[1fr_120px_120px_110px_70px_160px] min-w-[820px] px-3 py-3 border-b border-border last:border-b-0 text-sm items-center" data-testid={`user-row-${u.id}`}>
              <div className="font-medium truncate">{u.full_name}</div>
              <div className="truncate text-muted-foreground font-mono">{u.employee_id}</div>
              <div className="truncate">{u.department || "—"}</div>
              <div><Badge variant={u.role === "employee" ? "outline" : "default"} className="capitalize whitespace-nowrap">{u.role.replace("_", " ")}</Badge></div>
              <div>{u.active ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">●</Badge> : <Badge variant="outline">○</Badge>}</div>
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(u)} title={t("admin.users.edit")} data-testid={`user-edit-${u.id}`}><Edit2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => resetPass(u)} title={t("admin.users.resetPassword")} data-testid={`user-reset-${u.id}`}><KeyRound className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(u)} title={u.active ? t("admin.users.deactivate") : t("admin.users.activate")} data-testid={`user-toggle-${u.id}`}>
                  {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="p-6 text-sm text-muted-foreground">{t("admin.users.empty")}</p>}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="user-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? t("admin.users.edit") : t("admin.users.add")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("login.employeeId")}</Label>
              <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} data-testid="user-form-employee-id" />
            </div>
            <div>
              <Label>{t("admin.users.name")}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="user-form-name" />
            </div>
            <div>
              <Label>{t("admin.users.department")}</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} data-testid="user-form-dept" />
            </div>
            <div>
              <Label>{t("admin.users.role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="user-form-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">employee</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  {isSuper && <SelectItem value="super_admin">super_admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.users.password")} <span className="text-xs text-muted-foreground">({editing ? t("common.optional") : t("admin.users.passwordHint")})</span></Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "" : "123456"} data-testid="user-form-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="user-form-cancel">{t("common.cancel")}</Button>
            <Button onClick={save} data-testid="user-form-save">{t("admin.users.saveBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
