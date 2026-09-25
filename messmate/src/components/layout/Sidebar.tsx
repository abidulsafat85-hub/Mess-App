import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  Wallet,
  FileSpreadsheet,
  Calendar,
  Settings,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { MessSettings } from '../../types';
import { getTodayString, formatDateShort } from '../../utils/dateUtils';

export type NavTab =
  | 'dashboard'
  | 'meals'
  | 'whatsapp'
  | 'members'
  | 'deposits'
  | 'reports'
  | 'calendar'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  settings: MessSettings;
  mealRate?: number;
  todayMealCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  settings,
  todayMealCount,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'meals', label: 'Meal Entry', icon: UtensilsCrossed, badge: `${todayMealCount} today` },
    { id: 'whatsapp', label: 'WhatsApp Polls', icon: MessageCircle, badge: 'Auto' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'deposits', label: 'Deposits', icon: Wallet },
    { id: 'reports', label: 'Monthly Report', icon: FileSpreadsheet },
    { id: 'calendar', label: 'Daily History', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white shadow-xs select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
            {settings.messName || 'MessMate'}
          </h1>
          <p className="text-xs font-medium text-emerald-600">{settings.subtitle || 'Smart Mess Meal Management'}</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Offline SQLite/Local Engine</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Version 1.0.0 • Production Ready
        </p>
      </div>
    </aside>
  );
};
