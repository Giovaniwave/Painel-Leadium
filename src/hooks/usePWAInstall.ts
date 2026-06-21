import { useState, useEffect } from 'react';

// Interfaces for BeforeInstallPromptEvent as it's not a standard DOM event type yet in TS
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PWAInstallStatus = 'available' | 'installing' | 'installed' | 'not-supported';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<PWAInstallStatus>('not-supported');
  const [browserDetails, setBrowserDetails] = useState<{
    name: string;
    os: string;
    isIOS: boolean;
    isSafari: boolean;
    isFirefox: boolean;
  }>({
    name: 'Unknown',
    os: 'Unknown',
    isIOS: false,
    isSafari: false,
    isFirefox: false,
  });

  useEffect(() => {
    // Basic UserAgent sniffing for non-chromium browsers
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isFirefox = /firefox/i.test(ua);

    setBrowserDetails(prev => ({
      ...prev,
      isIOS,
      isSafari,
      isFirefox
    }));

    // Detect if already installed based on display mode or standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    
    if (isStandalone) {
      setStatus('installed');
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setStatus('available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App was successfully installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setStatus('installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // If we don't have the prompt, the user might be on a browser that doesn't support it (e.g. Safari)
      return;
    }
    
    setStatus('installing');
    
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    
    if (outcome === 'accepted') {
      setStatus('installed');
    } else {
      setStatus('available');
    }
  };

  return {
    status,
    installApp,
    browserDetails
  };
}
