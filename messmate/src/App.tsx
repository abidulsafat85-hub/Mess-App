/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
  PollVoteStatus,
} from './types';
import { StorageService } from './services/storage';
import { calculateMonthlySummary } from './services/calculations';
import { getCurrentMonthString, getTodayString } from './utils/dateUtils';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { MealEntryView } from './components/meals/MealEntryView';
import { MembersView } from './components/members/MembersView';
import { BazarView } from './components/bazar/BazarView';
import { DepositsView } from './components/deposits/DepositsView';
import { MonthlyReportView } from './components/reports/MonthlyReportView';
import { CalendarHistoryView } from './components/history/CalendarHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { WhatsAppPollView } from './components/whatsapp/WhatsAppPollView';

export default function App() {
  // Navigation: 1st Meal Entry then Dashboard
  const [currentTab, setCurrentTab] = useState<NavTab>('meals');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthString());
  const [todayStr, setTodayStr] = useState<string>(() => getTodayString());

  // Quick Action Modal states (e.g. from header button)
  const [openQuickBazar, setOpenQuickBazar] = useState(false);
  const [openQuickDeposit, setOpenQuickDeposit] = useState(false);

  // Auto-update live date and synchronize automatically on rollover, interval, or focus
  useEffect(() => {
    const syncLiveDate = () => {
      const nowToday = getTodayString();
      setTodayStr(nowToday);
    };

    const interval = setInterval(syncLiveDate, 30000);
    const handleFocus = () => syncLiveDate();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Core Data loaded from persistent offline storage
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [meals, setMeals] = useState<MealRecord[]>(() => StorageService.getMeals());
  const [bazar, setBazar] = useState<BazarExpense[]>(() => StorageService.getBazar());
  const [deposits, setDeposits] = useState<Deposit[]>(() => {
    const rawDeps = StorageService.getDeposits();
    const rawMembers = StorageService.getMembers();
    let hasAdditions = false;
    const synced = [...rawDeps];
    rawMembers.forEach((m) => {
      const initDep = Number(m.initialDeposit) || 0;
      if (initDep > 0) {
        const hasDep = synced.some((d) => d.memberId === m.id);
        if (!hasDep) {
          synced.push({
            id: `dep-init-${m.id}`,
            memberId: m.id,
            date: `2026-09-01`,
            amount: initDep,
            paymentMethod: 'Cash',
            note: 'Initial Deposit',
            createdAt: new Date().toISOString(),
          });
          hasAdditions = true;
        }
      }
    });
    if (hasAdditions) {
      StorageService.saveDeposits(synced);
    }
    return synced;
  });
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() =>
    StorageService.getFixedExpenses()
  );
  const [settings, setSettings] = useState<MessSettings>(() => StorageService.getSettings());

  // Real-time Monthly Accounting Calculation
  const monthlySummary = useMemo(() => {
    return calculateMonthlySummary(
      selectedMonth,
      members,
      meals,
      bazar,
      deposits,
      fixedExpenses,
      settings
    );
  }, [selectedMonth, members, meals, bazar, deposits, fixedExpenses, settings]);

  // Today's meals for badges and status
  const todayMeals = useMemo(() => {
    return meals.filter((m) => m.date === todayStr);
  }, [meals, todayStr]);

  const todayMealCount = useMemo(() => {
    return todayMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  }, [todayMeals]);

  // Quick Action trigger from Header
  const handleHeaderQuickAction = (action: 'meal' | 'deposit') => {
    if (action === 'meal') {
      setCurrentTab('meals');
    } else if (action === 'deposit') {
      setCurrentTab('deposits');
      setOpenQuickDeposit(true);
    }
  };

  // Save Day Meals
  const handleSaveDayMeals = (
    date: string,
    mealEntries: { memberId: string; count: number; lunch?: boolean; dinner?: boolean }[]
  ) => {
    // Filter out existing records for this date
    const otherMeals = meals.filter((m) => m.date !== date);
    const newRecords: MealRecord[] = mealEntries.map((entry) => ({
      id: `meal-${date}-${entry.memberId}`,
      date,
      memberId: entry.memberId,
      mealCount: entry.count,
      lunch: entry.lunch,
      dinner: entry.dinner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const updated = [...otherMeals, ...newRecords];
    setMeals(updated);
    StorageService.saveMeals(updated);
  };

  // Sync WhatsApp Poll votes to Mess Daily Meals for today
  const handleApplyPollToMeals = (slot: 'lunch' | 'dinner', votes: Record<string, PollVoteStatus>) => {
    const today = new Date().toISOString().split('T')[0];
    const existingTodayMeals = meals.filter((m) => m.date === today);
    const otherMeals = meals.filter((m) => m.date !== today);

    // Map existing records or create new for each member
    const updatedTodayRecords: MealRecord[] = members
      .filter((m) => m.isActive)
      .map((member) => {
        const existing = existingTodayMeals.find((m) => m.memberId === member.id);
        const vote = votes[member.id];
        const isYes = vote === 'YES' || vote === 'AUTO_YES';

        let currentLunch = existing ? (existing.lunch ?? (existing.mealCount >= 1)) : false;
        let currentDinner = existing ? (existing.dinner ?? (existing.mealCount >= 2)) : false;

        if (slot === 'lunch') {
          currentLunch = isYes;
        } else {
          currentDinner = isYes;
        }

        const mealCount = (currentLunch ? 1 : 0) + (currentDinner ? 1 : 0);

        return {
          id: existing ? existing.id : `meal-${today}-${member.id}`,
          date: today,
          memberId: member.id,
          mealCount,
          lunch: currentLunch,
          dinner: currentDinner,
          createdAt: existing ? existing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

    const updatedMeals = [...otherMeals, ...updatedTodayRecords];
    setMeals(updatedMeals);
    StorageService.saveMeals(updatedMeals);
  };

  // Member CRUD with Total Deposit sync
  const handleSaveMember = (member: Member, totalDepositAmount?: number) => {
    const exists = members.some((m) => m.id === member.id);
    let updated: Member[];
    if (exists) {
      updated = members.map((m) => (m.id === member.id ? member : m));
    } else {
      updated = [...members, member];
    }
    setMembers(updated);
    StorageService.saveMembers(updated);

    if (totalDepositAmount !== undefined) {
      const currentMonthDeps = deposits.filter(
        (d) => d.memberId === member.id && d.date.startsWith(selectedMonth)
      );

      let updatedDeposits: Deposit[];
      if (currentMonthDeps.length === 0) {
        if (totalDepositAmount > 0) {
          const newDep: Deposit = {
            id: `dep-${Date.now()}`,
            memberId: member.id,
            date: `${selectedMonth}-01`,
            amount: totalDepositAmount,
            paymentMethod: 'Cash',
            note: 'Total Deposit',
            createdAt: new Date().toISOString(),
          };
          updatedDeposits = [newDep, ...deposits];
        } else {
          updatedDeposits = deposits;
        }
      } else if (currentMonthDeps.length === 1) {
        updatedDeposits = deposits.map((d) =>
          d.id === currentMonthDeps[0].id ? { ...d, amount: totalDepositAmount } : d
        );
      } else {
        // If multiple records exist for this member in this month, update the first and remove the others so the total matches exactly
        const firstDepId = currentMonthDeps[0].id;
        const otherDepIds = new Set(currentMonthDeps.slice(1).map((d) => d.id));
        updatedDeposits = deposits
          .filter((d) => !otherDepIds.has(d.id))
          .map((d) => (d.id === firstDepId ? { ...d, amount: totalDepositAmount } : d));
      }
      setDeposits(updatedDeposits);
      StorageService.saveDeposits(updatedDeposits);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);
    StorageService.saveMembers(updated);

    // Also remove any meals and deposits associated with this member to keep calculations clean
    const updatedMeals = meals.filter((m) => m.memberId !== memberId);
    setMeals(updatedMeals);
    StorageService.saveMeals(updatedMeals);

    const updatedDeposits = deposits.filter((d) => d.memberId !== memberId);
    setDeposits(updatedDeposits);
    StorageService.saveDeposits(updatedDeposits);
  };

  const handleToggleMemberActive = (memberId: string) => {
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, isActive: !m.isActive } : m
    );
    setMembers(updated);
    StorageService.saveMembers(updated);
  };

  // Bazar CRUD
  const handleSaveBazar = (item: BazarExpense) => {
    const exists = bazar.some((b) => b.id === item.id);
    let updated: BazarExpense[];
    if (exists) {
      updated = bazar.map((b) => (b.id === item.id ? item : b));
    } else {
      updated = [item, ...bazar];
    }
    setBazar(updated);
    StorageService.saveBazar(updated);
  };

  const handleDeleteBazar = (id: string) => {
    const updated = bazar.filter((b) => b.id !== id);
    setBazar(updated);
    StorageService.saveBazar(updated);
  };

  // Deposit CRUD
  const handleSaveDeposit = (item: Deposit) => {
    const exists = deposits.some((d) => d.id === item.id);
    let updated: Deposit[];
    if (exists) {
      updated = deposits.map((d) => (d.id === item.id ? item : d));
    } else {
      updated = [item, ...deposits];
    }
    setDeposits(updated);
    StorageService.saveDeposits(updated);
  };

  const handleDeleteDeposit = (id: string) => {
    const updated = deposits.filter((d) => d.id !== id);
    setDeposits(updated);
    StorageService.saveDeposits(updated);
  };

  // Settings Save
  const handleSaveSettings = (updated: MessSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Excel Import Completion
  const handleImportComplete = (imported: {
    members?: Member[];
    meals?: MealRecord[];
    bazar?: BazarExpense[];
    deposits?: Deposit[];
  }) => {
    if (imported.members) {
      setMembers(imported.members);
      StorageService.saveMembers(imported.members);
    }
    if (imported.meals) {
      setMeals(imported.meals);
      StorageService.saveMeals(imported.meals);
    }
    if (imported.bazar) {
      setBazar(imported.bazar);
      StorageService.saveBazar(imported.bazar);
    }
    if (imported.deposits) {
      setDeposits(imported.deposits);
      StorageService.saveDeposits(imported.deposits);
    }
  };

  // Reset to Sample Data
  const handleResetSampleData = () => {
    StorageService.resetToSampleData();
    setMembers(StorageService.getMembers());
    setMeals(StorageService.getMeals());
    setBazar(StorageService.getBazar());
    setDeposits(StorageService.getDeposits());
    setFixedExpenses(StorageService.getFixedExpenses());
    setSettings(StorageService.getSettings());
  };

  // Clear All Data
  const handleClearAllData = () => {
    StorageService.clearAllData();
    setMembers([]);
    setMeals([]);
    setBazar([]);
    setDeposits([]);
    setFixedExpenses([]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900 font-sans">
      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        settings={settings}
        todayMealCount={todayMealCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Top Header */}
        <Header
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          settings={settings}
          onOpenQuickAction={handleHeaderQuickAction}
          onNavigateTab={setCurrentTab}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                summary={monthlySummary}
                members={members}
                todayMeals={todayMeals}
                allMeals={meals}
                allDeposits={deposits}
                settings={settings}
                onNavigateTab={setCurrentTab}
                onOpenQuickAction={handleHeaderQuickAction}
              />
            )}

            {currentTab === 'meals' && (
              <MealEntryView
                members={members}
                allMeals={meals}
                onSaveDayMeals={handleSaveDayMeals}
                settings={settings}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'whatsapp' && (
              <WhatsAppPollView
                members={members}
                settings={settings}
                onUpdateSettings={handleSaveSettings}
                onApplyPollToMeals={handleApplyPollToMeals}
              />
            )}

            {currentTab === 'members' && (
              <MembersView
                members={members}
                onSaveMember={handleSaveMember}
                onDeleteMember={handleDeleteMember}
                onToggleActive={handleToggleMemberActive}
                meals={meals}
                deposits={deposits}
                summary={monthlySummary}
                settings={settings}
              />
            )}

            {currentTab === 'deposits' && (
              <DepositsView
                deposits={deposits}
                members={members}
                onSaveDeposit={handleSaveDeposit}
                onDeleteDeposit={handleDeleteDeposit}
                selectedMonth={selectedMonth}
                settings={settings}
                isOpenAddModalDirectly={openQuickDeposit}
                onCloseAddModalDirectly={() => setOpenQuickDeposit(false)}
              />
            )}

            {currentTab === 'reports' && (
              <MonthlyReportView
                summary={monthlySummary}
                meals={meals}
                deposits={deposits}
                settings={settings}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarHistoryView
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                members={members}
                meals={meals}
                settings={settings}
                onNavigateToDateMeal={(date) => {
                  setCurrentTab('meals');
                }}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                members={members}
                meals={meals}
                bazar={bazar}
                deposits={deposits}
                onImportComplete={handleImportComplete}
                onResetSampleData={handleResetSampleData}
                onClearAllData={handleClearAllData}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          todayMealCount={todayMealCount}
          settings={settings}
        />
      </div>
    </div>
  );
}
