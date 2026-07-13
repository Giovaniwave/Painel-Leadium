/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Truck,
  HandCoins,
  Radar,
  ChevronDown,
} from "lucide-react";
import { ActiveTab } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenAssistant: () => void;
  theme?: "dark" | "light";
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
  onOpenAssistant,
  theme,
}: SidebarProps) {
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [prospectingOpen, setProspectingOpen] = React.useState(false);
  const logoUrl =
    theme === "light"
      ? "https://i.ibb.co/M5kWMmTJ/logo-para-versao-white-removebg-preview.png"
      : "https://i.ibb.co/k245JhFM/logotipooficialleadium.png";

  const menuItems = [
    {
      id: "dashboard" as ActiveTab,
      label: "Visão geral",
      icon: LayoutDashboard,
    },
    { id: "budgeting" as ActiveTab, label: "Planejamento", icon: Wallet },
    {
      id: "transactions" as ActiveTab,
      label: "Transações",
      icon: ArrowLeftRight,
    },
    { id: "expenses" as ActiveTab, label: "Frota", icon: Truck },
    { id: "reimbursements" as ActiveTab, label: "Reembolsos", icon: HandCoins },
    { id: "clients" as ActiveTab, label: "Clientes", icon: Users },
  ];

  const prospectingItems = [
    {
      id: "prospecting" as ActiveTab,
      label: "Pipeline comercial",
      icon: Radar,
    },
  ];

  const bottomItems = [
    { id: "settings" as ActiveTab, label: "Configurações", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backing - hidden per user request of navigation tabs */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 hidden animate-fadeIn"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 bottom-0 left-0 z-50 flex-col flex-shrink-0 bg-[#080808] border-r border-white/10 transition-all duration-300 overflow-y-auto overflow-x-hidden
          ${isOpenMobile ? "flex w-64" : "hidden md:flex"}
          ${isCollapsed && !isOpenMobile ? "md:w-16" : "md:w-64"}
        `}
        id="main-sidebar"
      >
        {/* Brand Logo & Toggle Header */}
        <div
          className={`px-5 py-6 flex items-center justify-between border-b border-white/5 relative ${isCollapsed ? "justify-center py-5" : ""}`}
        >
          {!isCollapsed || isOpenMobile ? (
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="Leadium Logo"
                className="w-12 h-12 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-[14px] uppercase tracking-[0.24em] font-extrabold text-white leading-none">
                  Leadium
                </span>
                <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-semibold mt-1.5">
                  Operação & finanças
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-9 h-9">
              <img
                src={logoUrl}
                alt="Leadium Logo"
                className="w-9 h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Mobile Close Button */}
          {isOpenMobile && (
            <button
              onClick={() => setIsOpenMobile(false)}
              className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white hover:text-black hover:border-white text-gray-400 border border-white/10 transition-all duration-300 cursor-pointer"
              title="Fechar Menu"
              id="sidebar-close-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Desktop Shrink Button (Absolutely positioned on border, out of flex flow) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`fixed top-8 z-[60] hidden h-8 w-8 items-center justify-center bg-transparent transition-colors duration-200 md:flex ${isCollapsed ? "left-[calc(4rem-1rem)]" : "left-[calc(16rem-1rem)]"} ${theme === "light" ? "text-neutral-400 hover:text-neutral-900" : "text-neutral-600 hover:text-neutral-300"}`}
            title={isCollapsed ? "Expandir" : "Encolher"}
            aria-label={
              isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            id="sidebar-toggle-btn"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Main Navigation Menu */}
        <nav
          className={`flex-1 px-3 space-y-1 mt-4 ${isCollapsed ? "flex flex-col items-center" : ""}`}
          aria-label="Navegação principal"
        >
          {(!isCollapsed || isOpenMobile) && (
            <button
              type="button"
              onClick={() => setWorkspaceOpen((open) => !open)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 transition-colors ${theme === "light" ? "hover:bg-black/[.04]" : "hover:bg-white/[.04]"}`}
              aria-expanded={workspaceOpen}
            >
              <span className="sidebar-section-label !mb-0">Workspace</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-300 ${theme === "light" ? "text-neutral-400" : "text-neutral-600"} ${workspaceOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
          {((isCollapsed && !isOpenMobile) || workspaceOpen) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="w-full space-y-1 overflow-hidden"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDark = theme !== "light";
                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpenMobile(false); // Auto close mobile menu on tab navigation
                    }}
                    className={`relative w-full group flex items-center gap-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
                      isCollapsed && !isOpenMobile
                        ? "justify-center px-0 w-10 h-10"
                        : "px-4"
                    } ${
                      isActive
                        ? isDark
                          ? "text-black"
                          : "text-white keep-white"
                        : isDark
                          ? "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                          : "text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent"
                    }`}
                    title={
                      isCollapsed && !isOpenMobile ? item.label : undefined
                    }
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActivePill"
                        className={`absolute inset-0 rounded-xl ${
                          isDark
                            ? "bg-white shadow-lg shadow-white/5 border border-white"
                            : "bg-black shadow-md border border-black active-tab-light-fix"
                        }`}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                    <Icon
                      className={`relative w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                        isActive
                          ? isDark
                            ? "text-black"
                            : "text-white keep-white"
                          : isDark
                            ? "text-gray-400 group-hover:text-white"
                            : "text-gray-500 group-hover:text-black"
                      }`}
                    />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="relative">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
          <div
            className={`pt-4 mt-3 border-t ${theme === "light" ? "border-black/10" : "border-white/10"} w-full`}
          >
            {(!isCollapsed || isOpenMobile) && (
              <button
                type="button"
                onClick={() => setProspectingOpen((open) => !open)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-2 transition-colors ${theme === "light" ? "hover:bg-black/[.04]" : "hover:bg-white/[.04]"}`}
                aria-expanded={prospectingOpen}
              >
                <span className="sidebar-section-label !mb-0">Prospecção</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-300 ${theme === "light" ? "text-neutral-400" : "text-neutral-600"} ${prospectingOpen ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
          {((isCollapsed && !isOpenMobile) || prospectingOpen) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="w-full space-y-1 overflow-hidden"
            >
              {prospectingItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDark = theme !== "light";
                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpenMobile(false);
                    }}
                    className={`relative w-full group flex items-center gap-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${isCollapsed && !isOpenMobile ? "justify-center px-0 w-10 h-10" : "px-4"} ${isActive ? (isDark ? "text-black" : "text-white keep-white") : isDark ? "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent" : "text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent"}`}
                    title={
                      isCollapsed && !isOpenMobile ? item.label : undefined
                    }
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActivePill"
                        className={`absolute inset-0 rounded-xl ${isDark ? "bg-white border border-white" : "bg-black border border-black active-tab-light-fix"}`}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                    <Icon
                      className={`relative w-3.5 h-3.5 ${isActive ? (isDark ? "text-black" : "text-white keep-white") : isDark ? "text-gray-400" : "text-gray-500"}`}
                    />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="relative">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </nav>

        {/* Bottom Option Menu */}
        <div
          className={`px-3 py-4 space-y-1 border-t border-white/10 shrink-0 ${isCollapsed ? "flex flex-col items-center" : ""}`}
        >
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDark = theme !== "light";
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpenMobile(false); // Auto close mobile menu on tab navigation
                }}
                className={`relative w-full group flex items-center gap-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
                  isCollapsed && !isOpenMobile
                    ? "justify-center px-0 w-10 h-10"
                    : "px-4"
                } ${
                  isActive
                    ? isDark
                      ? "text-black"
                      : "text-white keep-white"
                    : isDark
                      ? "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                      : "text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent"
                }`}
                title={isCollapsed && !isOpenMobile ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className={`absolute inset-0 rounded-xl ${
                      isDark
                        ? "bg-white shadow-lg shadow-white/5 border border-white"
                        : "bg-black shadow-md border border-black active-tab-light-fix"
                    }`}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon
                  className={`relative w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                    isActive
                      ? isDark
                        ? "text-black"
                        : "text-white keep-white"
                      : isDark
                        ? "text-gray-400 group-hover:text-white"
                        : "text-gray-500 group-hover:text-black"
                  }`}
                />
                {(!isCollapsed || isOpenMobile) && (
                  <span className="relative">{item.label}</span>
                )}
              </button>
            );
          })}

          {/* Featured Kairos Assistant CTA - visually distinct so it's always easy to spot */}
          <button
            onClick={() => {
              onOpenAssistant();
              setIsOpenMobile(false);
            }}
            className={`w-full group flex items-center gap-3 py-2.5 mt-1 text-[11px] uppercase tracking-[0.12em] font-semibold rounded-xl border transition-all duration-300 cursor-pointer ${
              isCollapsed && !isOpenMobile
                ? "justify-center px-0 w-10 h-10"
                : "px-4"
            } ${
              theme === "light"
                ? "text-black bg-gray-50 hover:bg-gray-100 border-black/10"
                : "text-white bg-white/[0.04] hover:bg-white/10 border-white/10"
            }`}
            title={
              isCollapsed && !isOpenMobile ? "Assistente Kairos" : undefined
            }
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#AD4F25] animate-pulse transition-transform duration-300 group-hover:scale-110" />
            {(!isCollapsed || isOpenMobile) && <span>Assistente Kairos</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
