import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari exposes this non-standard flag when launched from the home screen.
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneMedia || isIOSStandalone);
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Tracks whether the app can be installed as a PWA and provides a trigger
 * to show the native install prompt (Chrome/Edge/Android). On iOS Safari,
 * which has no install prompt event, callers should fall back to showing
 * "Add to Home Screen" instructions when `isIOS` is true.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay());
  const isIOS = isIOSDevice();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const canInstall = Boolean(deferredPrompt) && !isInstalled;
  // iOS never fires beforeinstallprompt, so offer manual instructions there
  // as long as the app isn't already running in standalone mode.
  const canShowIOSInstructions = isIOS && !isInstalled;

  return { canInstall, canShowIOSInstructions, isInstalled, promptInstall };
}
