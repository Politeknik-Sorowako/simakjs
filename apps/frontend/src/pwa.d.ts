/// <reference types="vite-plugin-pwa/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  __pwaAlerted?: boolean;
}

interface Navigator {
  standalone?: boolean;
}
