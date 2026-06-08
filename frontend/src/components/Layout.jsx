import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useBranding } from "@/contexts/BrandingContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Trophy,
  CalendarDays,
  Newspaper,
  User as UserIcon,
  Gift,
  Shield,
  Bell,
  LogOut,
  Languages,
  Sun,
  Moon,
  Users as UsersIcon,
  Settings,
  BarChart3,
  ScrollText,
  FileText,
  Palette,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const empLinks = (t) => [
  { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/matches", label: t("nav.matches"), icon: CalendarDays, testId: "nav-matches" },
  { to: "/leaderboard", label: t("nav.leaderboard"), icon: Trophy, testId: "nav-leaderboard" },
  { to: "/news", label: t("nav.news"), icon: Newspaper, testId: "nav-news" },
  { to: "/prizes", label: t("nav.prizes"), icon: Gift, testId: "nav-prizes" },
  { to: "/profile", label: t("nav.profile"), icon: UserIcon, testId: "nav-profile" },
];

const adminLinks = (t) => [
  { to: "/admin", label: t("admin.overview"), icon: BarChart3, testId: "nav-admin-overview", end: true },
  { to: "/admin/users", label: t("nav.users"), icon: UsersIcon, testId: "nav-admin-users" },
  { to: "/admin/tournament", label: t("nav.tournament"), icon: Trophy, testId: "nav-admin-tournament" },
  { to: "/admin/predictions", label: t("nav.predictions"), icon: Settings, testId: "nav-admin-predictions" },
  { to: "/admin/rewards", label: t("nav.rewards"), icon: Gift, testId: "nav-admin-rewards" },
  { to: "/admin/content", label: t("nav.content"), icon: FileText, testId: "nav-admin-content" },
  { to: "/admin/branding", label: t("nav.branding"), icon: Palette, testId: "nav-admin-branding" },
  { to: "/admin/reports", label: t("nav.reports"), icon: BarChart3, testId: "nav-admin-reports" },
  { to: "/admin/audit", label: t("nav.audit"), icon: ScrollText, testId: "nav-admin-audit" },
];

function NotificationBell() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/content/notifications").then((r) => setItems(r.data)).catch(() => {});
  }, []);
  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => api.post(`/content/notifications/${n.id}/read`)));
    setItems(items.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="notif-trigger">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span data-testid="notif-unread-badge" className="absolute top-1 end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-1">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t("common.notifications")}</span>
          {unread > 0 && (
            <button data-testid="notif-mark-all" onClick={markAll} className="text-xs text-primary hover:underline">{t("common.markAllRead")}</button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-72">
          {items.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground" data-testid="notif-empty">{t("common.noNotifications")}</div>
          )}
          {items.map((n) => (
            <div key={n.id} data-testid={`notif-item-${n.id}`} className={`px-3 py-2 border-b border-border ${!n.read ? "bg-secondary/40" : ""}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">{n.type}</Badge>
                <p className="text-sm font-medium truncate">{lang === "ar" && n.title_ar ? n.title_ar : n.title}</p>
              </div>
              {(n.body || n.body_ar) && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lang === "ar" && n.body_ar ? n.body_ar : n.body}</p>
              )}
            </div>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppBackground({ branding }) {
  const style = branding?.background_style || "pattern";
  const c = branding?.colors || {};
  const primary = c.primary || "#064E3B";
  const accent = c.accent || "#D4AF37";
  const symbol = branding?.symbol_url;
  const bgImage = branding?.background_image_url;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true" data-testid="app-background">
      {(style === "gradient" || style === "pattern") && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 6% 0%, ${primary}1f, transparent 38%), radial-gradient(circle at 100% 100%, ${accent}26, transparent 42%)`,
          }}
        />
      )}
      {style === "pattern" && symbol && (
        <>
          <img src={symbol} alt="" className="absolute -right-16 -bottom-24 w-[460px] max-w-[55vw] opacity-[0.06] dark:opacity-[0.09]" />
          <img src={symbol} alt="" className="absolute -left-12 -top-16 w-[280px] max-w-[40vw] opacity-[0.05] dark:opacity-[0.07] rotate-12" />
        </>
      )}
      {style === "image" && bgImage && (
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.10]" />
      )}
    </div>
  );
}

function BrandMark({ logoUrl, brandName, size = "h-9 w-9", text = "text-base" }) {
  return logoUrl ? (
    <img src={logoUrl} alt={brandName} className={`${size} rounded-xl object-contain bg-secondary p-1`} data-testid="brand-logo" />
  ) : (
    <div className={`${size} rounded-xl bg-primary text-primary-foreground grid place-items-center font-display font-bold ${text}`}>CW</div>
  );
}

export default function Layout({ adminMode = false }) {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const { branding } = useBranding();
  const [theme, setTheme] = useState(() => localStorage.getItem("wcp_theme") || "light");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("wcp_theme", theme);
  }, [theme]);

  const links = adminMode
    ? adminLinks(t).filter((l) => l.to !== "/admin/branding" || user?.role === "super_admin")
    : empLinks(t);
  const initials = (user?.full_name || "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const logoUrl = branding?.logo_url;
  const brandName = (lang === "ar" ? branding?.name_ar : branding?.name_en) || t("brand");

  return (
    <div className="min-h-screen flex bg-background">
      <AppBackground branding={branding} />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-e border-border bg-card/40 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <BrandMark logoUrl={logoUrl} brandName={brandName} />
            <div className="leading-tight">
              <p className="font-display font-semibold tracking-tight">{adminMode ? t("admin.dashboardTitle") : brandName}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{adminMode ? "Admin Console" : "Employee Portal"}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-testid={l.testId}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              <span>{l.label}</span>
            </NavLink>
          ))}
          {(user?.role === "admin" || user?.role === "super_admin") && !adminMode && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-accent/60 text-accent hover:bg-accent/10 mt-3"
            >
              <Shield className="h-4 w-4" />
              <span>{t("nav.admin")}</span>
            </NavLink>
          )}
          {adminMode && (
            <NavLink
              to="/dashboard"
              data-testid="nav-employee-back"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-secondary mt-3"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{t("nav.dashboard")}</span>
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>v1.0 · secure session</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="md:hidden"><BrandMark logoUrl={logoUrl} brandName={brandName} size="h-8 w-8" text="text-sm" /></div>
              <div>
                <p className="font-display font-semibold tracking-tight text-base md:text-lg">{adminMode ? t("admin.dashboardTitle") : brandName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} title={t("common.switchLang")} data-testid="lang-toggle">
                <Languages className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} data-testid="theme-toggle">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-trigger" className="flex items-center gap-2 ps-2 pe-3 py-1.5 rounded-full hover:bg-secondary transition">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">{user?.full_name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">{user?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{t("login.employeeId")}: {user?.employee_id}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4 me-2" /> {t("nav.profile")}
                  </DropdownMenuItem>
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 me-2" /> {t("nav.admin")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-logout" onClick={logout}>
                    <LogOut className="h-4 w-4 me-2" /> {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="md:hidden border-t border-border overflow-x-auto no-scrollbar">
            <div className="flex gap-1 px-3 py-2 min-w-max">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  data-testid={`mobile-${l.testId}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 bg-secondary/50"
                    }`
                  }
                >
                  <l.icon className="h-3.5 w-3.5" />
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} {brandName}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Enterprise · OWASP-aligned · JWT secured</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
