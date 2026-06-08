import React, { createContext, useContext, useEffect, useState } from "react";
import { en, ar } from "@/locales";

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("wcp_lang") || "en");

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("wcp_lang", lang);
  }, [lang]);

  const dict = lang === "ar" ? ar : en;

  // simple key path resolver: t("dashboard.welcome")
  const t = (path, params = {}) => {
    const parts = path.split(".");
    let v = dict;
    for (const p of parts) v = v?.[p];
    if (typeof v !== "string") return path;
    return v.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  };

  const toggle = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
