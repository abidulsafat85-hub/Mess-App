import React, { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Modal } from './Modal';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * Shows an "Install App" button in the header when the browser supports
 * native installation (Chrome/Edge/Android) or, on iOS Safari, opens a
 * quick "Add to Home Screen" guide since iOS has no install prompt API.
 * Renders nothing once the app is already installed / running standalone.
 */
export const InstallAppButton: React.FC = () => {
  const { canInstall, canShowIOSInstructions, isInstalled, promptInstall } = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || (!canInstall && !canShowIOSInstructions)) {
    return null;
  }

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (canShowIOSInstructions) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        id="header-install-app-btn"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm border border-emerald-200 transition-all cursor-pointer"
        title="Install MessMate as an app"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      <Modal
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
        title="Install MessMate"
        subtitle="Add it to your Home Screen for a full-screen, app-like experience"
      >
        <ol className="space-y-4 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">1</span>
            <span className="pt-0.5">
              Tap the <Share className="inline h-4 w-4 -mt-0.5 text-emerald-600" /> Share icon in Safari's toolbar.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">2</span>
            <span className="pt-0.5">
              Scroll down and tap <SquarePlus className="inline h-4 w-4 -mt-0.5 text-emerald-600" /> <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">3</span>
            <span className="pt-0.5">
              Tap <strong>Add</strong> — MessMate will appear on your Home Screen like a normal app.
            </span>
          </li>
        </ol>
      </Modal>
    </>
  );
};
