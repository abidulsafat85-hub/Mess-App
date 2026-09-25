import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileUp,
  Sliders,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { MessSettings, MealRateMode, Member, MealRecord, BazarExpense, Deposit, FixedExpense } from '../../types';
import { StorageService } from '../../services/storage';
import { ExcelService, ImportPreviewData } from '../../services/excelService';
import { Modal } from '../common/Modal';

interface SettingsViewProps {
  settings: MessSettings;
  onSaveSettings: (settings: MessSettings) => void;
  members: Member[];
  meals: MealRecord[];
  bazar: BazarExpense[];
  deposits: Deposit[];
  onImportComplete: (data: {
    members?: Member[];
    meals?: MealRecord[];
    bazar?: BazarExpense[];
    deposits?: Deposit[];
  }) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  members,
  meals,
  bazar,
  deposits,
  onImportComplete,
  onResetSampleData,
  onClearAllData,
}) => {
  // Form states
  const [messName, setMessName] = useState(settings.messName);
  const [currency] = useState(settings.currency);
  const [fixedMealRate, setFixedMealRate] = useState<number>(settings.fixedMealRate ?? 50);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Excel Import states
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonRestoreInputRef = useRef<HTMLInputElement>(null);

  // Dangerous action modals
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Save Settings
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MessSettings = {
      ...settings,
      messName: messName.trim() || 'Our Home',
      currency: currency.trim() || '৳',
      fixedMealRate: Number(fixedMealRate) || 0,
    };

    onSaveSettings(updated);
    setSaveMessage('Settings updated successfully!');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  // Download Backup JSON
  const handleBackupDownload = () => {
    const jsonStr = StorageService.createBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MessMate_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Restore JSON
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = StorageService.restoreBackup(content);
        if (result.success) {
          alert('Backup restored successfully! The page will now reload.');
          window.location.reload();
        } else {
          alert(`Restore failed: ${result.message}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle Excel File Selected for Import
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const preview = await ExcelService.parseExcelFile(file, members);
      setImportPreview(preview);
    } catch (err) {
      alert(`Error reading spreadsheet: ${(err as Error).message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm Excel Import
  const handleConfirmImport = () => {
    if (!importPreview) return;

    const newMembers: Member[] = (importPreview.members as Member[]) || [];
    const newMeals: MealRecord[] = (importPreview.meals as MealRecord[]) || [];
    const newBazar: BazarExpense[] = (importPreview.bazar as BazarExpense[]) || [];
    const newDeposits: Deposit[] = (importPreview.deposits as Deposit[]) || [];

    if (importMode === 'replace') {
      onImportComplete({
        members: newMembers,
        meals: newMeals,
        bazar: newBazar,
        deposits: newDeposits,
      });
    } else {
      // Append mode: merge avoiding duplicates
      const mergedMembers = [...members];
      newMembers.forEach((nm) => {
        if (!mergedMembers.some((m) => m.fullName.toLowerCase() === nm.fullName.toLowerCase())) {
          mergedMembers.push(nm);
        }
      });

      const mergedMeals = [...meals, ...newMeals];
      const mergedBazar = [...bazar, ...newBazar];
      const mergedDeposits = [...deposits, ...newDeposits];

      onImportComplete({
        members: mergedMembers,
        meals: mergedMeals,
        bazar: mergedBazar,
        deposits: mergedDeposits,
      });
    }

    setImportPreview(null);
    alert('Import completed successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure mess parameters, calculation rules, backup database, and import Excel data.
        </p>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <Sliders className="h-5 w-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-lg">General & Mess Info</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mess Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="settings-messname"
              value={messName}
              onChange={(e) => setMessName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Meal Rate ({currency})</label>
            <input
              type="number"
              id="settings-meal-rate"
              value={fixedMealRate}
              onChange={(e) => setFixedMealRate(Math.max(0, Number(e.target.value)))}
              min="0"
              step="any"
              placeholder="e.g. 50"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Cost per meal ({currency} per meal)</span>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            id="btn-save-settings-submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Excel Import & Template Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <FileSpreadsheet className="h-5 w-5 text-teal-600" />
          <h3 className="font-extrabold text-slate-900 text-lg">Excel Spreadsheet Import & Templates</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600">
          Import your existing mess Excel workbook (.xlsx, .xls, .csv). The smart parser extracts Members, Meals, Bazar expenses, and Deposits with preview verification before saving.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upload Excel Card */}
          <div className="p-5 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <FileUp className="h-5 w-5 text-emerald-600" />
                <span>Upload Excel File</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select an Excel spreadsheet to auto-import historical meals, bazar, and member records.
              </p>
            </div>

            <div className="mt-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelFileSelect}
                className="hidden"
                id="excel-import-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-colors cursor-pointer"
              >
                {isImporting ? 'Parsing Excel...' : 'Choose Excel File (.xlsx)'}
              </button>
            </div>
          </div>

          {/* Download Template Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Download className="h-5 w-5 text-slate-600" />
                <span>Download Sample Template</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Get a pre-formatted Excel workbook template formatted with Members, Meals, Bazar, and Deposits sheets.
              </p>
            </div>

            <div className="mt-4">
              <button
                type="button"
                id="btn-download-excel-template"
                onClick={() => ExcelService.downloadTemplate()}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs sm:text-sm text-center shadow-xs transition-colors cursor-pointer"
              >
                Download Template (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="font-extrabold text-slate-900 text-lg">Backup & Restore Offline Database</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600">
          Save an offline copy of your entire mess database or restore from a previous JSON backup file anytime.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            id="btn-backup-json"
            onClick={handleBackupDownload}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Download Database Backup (JSON)</span>
          </button>

          <div>
            <input
              type="file"
              ref={jsonRestoreInputRef}
              accept=".json"
              onChange={handleRestoreFileSelect}
              className="hidden"
              id="json-restore-file-input"
            />
            <button
              type="button"
              id="btn-restore-json"
              onClick={() => jsonRestoreInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Restore Database from File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset / Clear */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
          <AlertTriangle className="h-5 w-5" />
          <span>Danger Zone (Reset Operations)</span>
        </div>
        <p className="text-xs text-slate-500">
          These operations overwrite or erase existing entries. Make sure you have downloaded a backup first.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            id="btn-reset-sample-data"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset to Realistic Sample Data</span>
          </button>

          <button
            type="button"
            id="btn-clear-all-data"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All Data (Start Fresh)</span>
          </button>
        </div>
      </div>

      {/* Excel Import Preview Modal */}
      {importPreview && (
        <Modal
          isOpen={!!importPreview}
          onClose={() => setImportPreview(null)}
          title="Spreadsheet Import Preview"
          subtitle="Confirm detected spreadsheet records before applying"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-sm">
              {importPreview.summaryText}
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <label className="font-bold text-slate-800 block">Import Mode:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    importMode === 'append'
                      ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-950'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>Append / Merge</div>
                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                    Preserves current records and adds newly detected ones.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    importMode === 'replace'
                      ? 'bg-rose-50 border-rose-500 font-bold text-rose-950'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>Replace Existing</div>
                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                    Clears existing data and replaces with this spreadsheet.
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-excel-import"
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Confirm & Import
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <Modal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          title="Reset to Realistic Sample Data?"
          subtitle="This will replace current entries with standard Bangladeshi bachelor mess data."
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              This will populate sample members (Safat, Rahim, Karim, Hasan, Tanvir, Shakil), meals for September 2026, bazar records, and deposits.
            </p>
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-sample-reset"
                onClick={() => {
                  onResetSampleData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <Modal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title="Clear All Database Records?"
          subtitle="Are you sure you want to completely erase all data?"
        >
          <div className="space-y-4">
            <p className="text-xs text-rose-600 font-semibold">
              Warning: All members, meals, bazar expenses, and deposits will be wiped. This action cannot be undone unless you have a JSON backup.
            </p>
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-clear-all"
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                Yes, Erase Everything
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
