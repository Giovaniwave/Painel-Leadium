/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  LogOut,
  Settings,
  CheckCheck,
  UserPlus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import InstallAppButton from "./InstallAppButton";
import { sendBrowserNotification } from "../utils/notifications";

interface CrmNotification {
  id: string;
  text: string;
  detail: string;
  createdAt: string;
  read: boolean;
  kind: "created" | "updated" | "deleted";
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAssistant: () => void;
  hasUnreadMessage: boolean;
  onToggleMobileMenu: () => void;
  userProfile: { name: string; avatarUrl: string; email: string };
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
  onNavigateToTab: (
    tab:
      | "dashboard"
      | "budgeting"
      | "transactions"
      | "clients"
      | "settings"
      | "expenses",
  ) => void;
}

export default function Header({
  title,
  subtitle,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  onOpenAssistant,
  hasUnreadMessage,
  onToggleMobileMenu,
  userProfile,
  theme,
  onToggleTheme,
  onLogout,
  onNavigateToTab,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState<CrmNotification[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("leadium_crm_notifications_v1") || "[]",
      );
    } catch {
      return [];
    }
  });
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  useEffect(() => {
    localStorage.setItem(
      "leadium_crm_notifications_v1",
      JSON.stringify(notifications.slice(0, 50)),
    );
  }, [notifications]);

  useEffect(() => {
    const events = new EventSource("/api/realtime");
    const addNotification = (event: Event, kind: CrmNotification["kind"]) => {
      const message = event as MessageEvent;
      try {
        const lead = JSON.parse(message.data || "{}");
        const name = lead.contact || lead.instagram || lead.company || "Lead";
        const labels = {
          created: "Novo lead recebido",
          updated: "Lead atualizado",
          deleted: "Lead removido",
        };
        const detail =
          kind === "created"
            ? `${name}${lead.niche ? ` · ${lead.niche}` : ""}${lead.monthlyRevenueRange ? ` · ${lead.monthlyRevenueRange}` : ""}`
            : kind === "deleted"
              ? "O registro foi removido do pipeline."
              : `${name} teve suas informações ou etapa atualizadas.`;
        const notification: CrmNotification = {
          id: crypto.randomUUID(),
          text: labels[kind],
          detail,
          createdAt: new Date().toISOString(),
          read: false,
          kind,
        };
        setNotifications((current) => [notification, ...current].slice(0, 50));
        if (kind === "created")
          sendBrowserNotification("Novo lead no CRM", detail);
      } catch {
        /* ignora eventos inválidos */
      }
    };
    const created = (event: Event) => addNotification(event, "created");
    const updated = (event: Event) => addNotification(event, "updated");
    const deleted = (event: Event) => addNotification(event, "deleted");
    const generic = (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data || "{}");
        const notification: CrmNotification = {
          id: crypto.randomUUID(),
          text: data.title || "Nova informação adicionada",
          detail: data.detail || "O CRM recebeu uma nova informação.",
          createdAt: new Date().toISOString(),
          read: false,
          kind: data.kind || "created",
        };
        setNotifications((current) => [notification, ...current].slice(0, 50));
        sendBrowserNotification(notification.text, notification.detail);
      } catch {
        /* ignora eventos inválidos */
      }
    };
    events.addEventListener("lead-created", created);
    events.addEventListener("lead-updated", updated);
    events.addEventListener("lead-deleted", deleted);
    events.addEventListener("crm-notification", generic);
    return () => events.close();
  }, []);

  const markAllRead = () =>
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  const relativeTime = (value: string) => {
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(value).getTime()) / 1000),
    );
    if (seconds < 10) return "agora";
    if (seconds < 60) return `há ${seconds}s`;
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
    return new Date(value).toLocaleDateString("pt-BR");
  };

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/10 z-40"
      id="app-header"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Mobile Hamburger menu removed per user request for clean bottom tabs instead */}

        <h1 className="text-lg sm:text-xl font-sans font-semibold text-white tracking-tight truncate">
          {title === "Financial Dashboard" ? (
            <>
              <span className="md:hidden font-sans uppercase font-extrabold tracking-wider text-white">
                LEADIUM
              </span>
              <span className="hidden md:inline">Financial Dashboard</span>
            </>
          ) : (
            title
          )}
        </h1>
        {subtitle && (
          <p className="hidden sm:block text-xs text-gray-500 truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar - actively updates query */}
        <div className="relative group hidden md:block w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 transition-colors group-hover:text-white" />
          <input
            id="global-transaction-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#141414] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs w-full text-white placeholder-gray-500 focus:outline-none focus:border-white/40 tracking-wider transition-all cursor-text animate-fadeIn"
            placeholder={searchPlaceholder || "Buscar transações..."}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <InstallAppButton />
          </div>

          {/* Theme Mode Toggle (Sun/Moon Switcher) */}
          <button
            id="header-theme-toggle"
            onClick={onToggleTheme}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              theme === "light"
                ? "text-gray-900 hover:bg-gray-100"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            title={
              theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"
            }
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-gray-300 hover:text-white transition-colors" />
            ) : (
              <Moon className="w-5 h-5 text-gray-900 hover:text-black transition-colors" />
            )}
          </button>

          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              id="header-notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-lg transition-all cursor-pointer ${
                theme === "light"
                  ? "text-gray-900 hover:bg-gray-100"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <>
                  <span
                    className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full animate-pulse ${
                      theme === "light"
                        ? "bg-black ring-2 ring-white"
                        : "bg-white ring-2 ring-[#0D0D0D]"
                    }`}
                  ></span>
                  <span className="sr-only">
                    {unreadCount} notificações não lidas
                  </span>
                </>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-[-16px] sm:right-0 mt-3 w-80 max-w-[calc(100vw-32px)] bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
                id="notification-dropdown"
              >
                <div className="px-4 py-3 bg-[#111111] border-b border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Notificações
                    </span>
                    <p className="mt-0.5 text-[9px] text-neutral-500">
                      Atualizações em tempo real do CRM
                    </p>
                  </div>
                  <button
                    onClick={markAllRead}
                    disabled={!unreadCount}
                    className="flex items-center gap-1.5 text-[9px] font-semibold text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Marcar como lidas
                  </button>
                </div>
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <Bell className="mx-auto h-5 w-5 text-neutral-700" />
                      <p className="mt-3 text-xs font-semibold text-neutral-400">
                        Nenhuma notificação
                      </p>
                      <p className="mt-1 text-[10px] text-neutral-600">
                        Novas informações aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon =
                        n.kind === "created"
                          ? UserPlus
                          : n.kind === "updated"
                            ? RefreshCw
                            : Trash2;
                      return (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() =>
                            setNotifications((current) =>
                              current.map((item) =>
                                item.id === n.id
                                  ? { ...item, read: true }
                                  : item,
                              ),
                            )
                          }
                          className={`flex w-full gap-3 p-4 text-left hover:bg-white/5 transition-colors ${n.read ? "opacity-60" : "bg-white/[.025]"}`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${n.kind === "created" ? "bg-emerald-500/10 text-emerald-400" : n.kind === "updated" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <strong className="text-[11px] text-white">
                                {n.text}
                              </strong>
                              {!n.read && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                              )}
                            </span>
                            <span className="mt-1 block text-[10px] leading-4 text-neutral-400">
                              {n.detail}
                            </span>
                            <span className="mt-1.5 block text-[9px] text-neutral-600">
                              {relativeTime(n.createdAt)}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HUD Line break before User */}
          <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

          {/* User Profile display with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  onToggleMobileMenu();
                } else {
                  setShowUserDropdown(!showUserDropdown);
                }
              }}
              className="flex items-center gap-3 pl-2 group cursor-pointer text-left focus:outline-none"
              title={userProfile.name}
            >
              <img
                id="user-profile-avatar"
                src={userProfile.avatarUrl || null}
                alt={userProfile.name}
                className="w-8 h-8 rounded-full border border-white/10 object-cover group-hover:border-white transition-all duration-300 shadow-md hover:scale-[1.05]"
                referrerPolicy="no-referrer"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-white group-hover:text-white/80 transition-colors">
                  {userProfile.name}
                </span>
                <span className="text-[8px] text-gray-500 uppercase tracking-widest font-mono font-bold">
                  Sessão Ativa
                </span>
              </div>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-3 w-52 bg-[#161616] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn text-xs">
                <div className="px-4 py-2 border-b border-white/5 text-[10px] text-[#888888] uppercase tracking-wider font-bold">
                  Painel Executivo
                </div>

                {/* CONFIGURAÇÕES Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onNavigateToTab("settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Configurações</span>
                </button>

                {/* ASSISTENTE KAIROS Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAssistant();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-gray-300 hover:bg-[#FFFFFF]/10 hover:text-white transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                  <span>Assistente Kairos</span>
                </button>

                <div className="border-t border-white/5 my-1" />

                <div className="sm:hidden px-2 mb-2 mt-2">
                  <InstallAppButton />
                </div>

                {/* LOGOUT Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-350 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-red-500" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
