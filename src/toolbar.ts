import { getEditorContent } from './editorHelper';
import { showModal } from './modal';

const BUTTON_ID = 'growi-drawio-source-viewer-btn';
const TOOLBAR_SELECTOR = '._codemirror-editor-toolbar_q11bm_1 .simplebar-content .d-flex.gap-2';
const MAX_ATTEMPTS = 20;
const POLL_INTERVAL = 200;

function handleClick(): void {
  const content = getEditorContent();
  if (content === null) {
    alert('Could not access the editor content.');
    return;
  }
  showModal(content);
}

function addButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const toolbar = document.querySelector(TOOLBAR_SELECTOR);
  if (!toolbar) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'btn btn-toolbar-button';
  btn.type = 'button';
  btn.title = 'Drawio Source Viewer';

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined fs-5';
  icon.textContent = 'schema';
  btn.appendChild(icon);

  btn.addEventListener('click', handleClick);
  toolbar.appendChild(btn);
}

export function waitForToolbarAndAddButton(): void {
  let attempts = 0;
  const tryAdd = () => {
    attempts++;
    if (document.getElementById(BUTTON_ID)) return;
    const toolbar = document.querySelector(TOOLBAR_SELECTOR);
    if (toolbar) {
      addButton();
    } else if (attempts < MAX_ATTEMPTS) {
      setTimeout(tryAdd, POLL_INTERVAL);
    }
  };
  tryAdd();
}

export function removeButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}
