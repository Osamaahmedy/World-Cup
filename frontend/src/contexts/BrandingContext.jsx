import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, API } from "@/lib/api";

const BrandingContext = createContext(null);

// "#RRGGBB" -> "H S% L%" (CSS hsl channels, no commas)
export function hexToHsl(hex) {
  if (!hex) return null;
  let c = hex.replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return null;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const VAR_MAP = {
  primary: ["--primary", "--ring"],
  primary_foreground: ["--primary-foreground"],
  accent: ["--accent"],
  accent_foreground: ["--accent-foreground"],
  background: ["--background"],
  foreground: ["--foreground", "--card-foreground", "--popover-foreground", "--secondary-foreground"],
  card: ["--card", "--popover"],
  secondary: ["--secondary", "--muted"],
  border: ["--border", "--input"],
};

export function applyThemeColors(colors) {
  if (!colors) return;
  const rules = [];
  Object.entries(VAR_MAP).forEach(([key, vars]) => {
    const hsl = hexToHsl(colors[key]);
    if (hsl) vars.forEach((v) => rules.push(`${v}:${hsl};`));
  });
  if (!rules.length) return;
  let tag = document.getElementById("branding-theme");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "branding-theme";
    document.head.appendChild(tag);
  }
  // html:not(.dark) keeps dark-mode palette intact
  tag.innerHTML = `html:not(.dark){${rules.join("")}}`;
}

function setFavicon(url) {
  if (!url) return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);

  const apply = useCallback((b) => {
    if (!b) return;
    applyThemeColors(b.colors);
    setFavicon(b.favicon_url);
    const title = b.name_en || "World Cup Predictor";
    if (title) document.title = title;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/branding");
      setBranding(data);
      apply(data);
      return data;
    } catch {
      return null;
    }
  }, [apply]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/branding");
        if (!active) return;
        setBranding(data);
        apply(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [apply]);

  return (
    <BrandingContext.Provider value={{ branding, refresh, API }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
};
