import { waitForToolbarAndAddButton, removeButton } from './src/toolbar';
import { closeModal } from './src/modal';

declare global {
  interface Window {
    pluginActivators: Record<string, { activate: () => void; deactivate: () => void }>;
    navigation?: EventTarget;
  }
}

function onNavigate(): void {
  const hash = window.location.hash;
  if (hash.includes('edit')) {
    waitForToolbarAndAddButton();
  } else {
    removeButton();
  }
}

const activate = (): void => {
  if (window.navigation) {
    (window.navigation as any).addEventListener('navigatesuccess', onNavigate);
  }
  // Check current page on activation
  onNavigate();
};

const deactivate = (): void => {
  if (window.navigation) {
    (window.navigation as any).removeEventListener('navigatesuccess', onNavigate);
  }
  removeButton();
  closeModal();
};

if (!window.pluginActivators) {
  window.pluginActivators = {} as any;
}
window.pluginActivators['growi-plugin-source-with-drawio-xml'] = { activate, deactivate };
