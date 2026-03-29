import { waitForToolbarAndAddButton, removeButton } from './src/toolbar';
import { closeModal } from './src/modal';

declare global {
  interface Window {
    pluginActivators: Record<string, { activate: () => void; deactivate: () => void }>;
  }
}

function handleNavigation(url: URL): void {
  if (url.hash === '#edit') {
    waitForToolbarAndAddButton();
  } else {
    removeButton();
    closeModal();
  }
}

function onNavigate(e: any): void {
  handleNavigation(new URL(e.destination.url));
}

let isListening = false;

const activate = (): void => {
  const nav = (window as any).navigation;
  if (!nav || isListening) return;
  isListening = true;
  nav.addEventListener('navigate', onNavigate);
  handleNavigation(new URL(location.href));
};

const deactivate = (): void => {
  const nav = (window as any).navigation;
  if (nav) {
    nav.removeEventListener('navigate', onNavigate);
  }
  isListening = false;
  removeButton();
  closeModal();
};

if (!window.pluginActivators) {
  window.pluginActivators = {} as any;
}
window.pluginActivators['growi-plugin-source-with-drawio-xml'] = { activate, deactivate };
