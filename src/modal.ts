import { extractAllDrawioBlocks, type DrawioBlock } from './drawioDecoder';
import { simplifyDrawioXml } from './xmlSimplifier';
import { insertAtCursor } from './editorHelper';

let modalElement: HTMLElement | null = null;
let backdropElement: HTMLElement | null = null;
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

interface ProcessedContent {
  simplifiedText: string;
  xmlText: string;
  blocks: DrawioBlock[];
}

function processContent(markdown: string): ProcessedContent {
  const blocks = extractAllDrawioBlocks(markdown);

  let simplifiedText = markdown;
  let xmlText = markdown;

  // Replace from last to first to preserve positions
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const simplifiedReplacement = `--- Diagram ${block.index} ---\n${simplifyDrawioXml(block.xml)}\n--- /Diagram ${block.index} ---`;
    const xmlReplacement = `--- Diagram ${block.index} ---\n${block.xml}\n--- /Diagram ${block.index} ---`;

    simplifiedText =
      simplifiedText.substring(0, block.startPos) +
      simplifiedReplacement +
      simplifiedText.substring(block.endPos);

    xmlText =
      xmlText.substring(0, block.startPos) +
      xmlReplacement +
      xmlText.substring(block.endPos);
  }

  return { simplifiedText, xmlText, blocks };
}

async function copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = original; }, 1500);
  } catch {
    const original = button.textContent;
    button.textContent = 'Failed';
    setTimeout(() => { button.textContent = original; }, 1500);
  }
}

function createBlockButtons(blocks: DrawioBlock[], activeTab: 'simplified' | 'xml'): HTMLElement {
  const container = document.createElement('div');
  container.className = 'd-flex flex-wrap gap-2 mb-2';

  blocks.forEach((block) => {
    const group = document.createElement('div');
    group.className = 'btn-group btn-group-sm';

    const label = document.createElement('span');
    label.className = 'btn btn-outline-secondary disabled';
    label.textContent = `Diagram ${block.index}`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-outline-primary';
    copyBtn.textContent = 'Copy';
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => {
      const text = activeTab === 'simplified' ? simplifyDrawioXml(block.xml) : block.xml;
      copyToClipboard(text, copyBtn);
    });

    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn btn-outline-success';
    insertBtn.textContent = 'Insert';
    insertBtn.type = 'button';
    insertBtn.addEventListener('click', () => {
      const text = activeTab === 'simplified' ? simplifyDrawioXml(block.xml) : block.xml;
      insertAtCursor(text);
    });

    group.appendChild(label);
    group.appendChild(copyBtn);
    group.appendChild(insertBtn);
    container.appendChild(group);
  });

  return container;
}

export function showModal(markdown: string): void {
  closeModal();

  const { simplifiedText, xmlText, blocks } = processContent(markdown);

  if (blocks.length === 0) {
    alert('No drawio blocks found in the editor.');
    return;
  }

  let activeTab: 'simplified' | 'xml' = 'simplified';

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';

  // Modal
  const modal = document.createElement('div');
  modal.className = 'modal fade show d-block';
  modal.setAttribute('tabindex', '-1');
  modal.style.zIndex = '10500';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog modal-xl modal-dialog-scrollable';

  const content = document.createElement('div');
  content.className = 'modal-content';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h5 class="modal-title">Drawio Source Viewer</h5>
    <button type="button" class="btn-close" aria-label="Close"></button>
  `;
  header.querySelector('.btn-close')!.addEventListener('click', closeModal);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  // Tabs
  const tabNav = document.createElement('ul');
  tabNav.className = 'nav nav-tabs mb-3';
  tabNav.innerHTML = `
    <li class="nav-item">
      <button class="nav-link active" data-tab="simplified" type="button">Simplified Text</button>
    </li>
    <li class="nav-item">
      <button class="nav-link" data-tab="xml" type="button">XML</button>
    </li>
  `;

  // Block buttons container
  const blockButtonsContainer = document.createElement('div');
  blockButtonsContainer.appendChild(createBlockButtons(blocks, activeTab));

  // Textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'form-control';
  textarea.readOnly = true;
  textarea.style.height = '60vh';
  textarea.style.fontFamily = 'monospace';
  textarea.style.fontSize = '0.85rem';
  textarea.value = simplifiedText;

  // Tab switching
  tabNav.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const tab = target.getAttribute('data-tab');
    if (!tab) return;

    activeTab = tab as 'simplified' | 'xml';
    textarea.value = activeTab === 'simplified' ? simplifiedText : xmlText;

    tabNav.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));
    target.classList.add('active');

    blockButtonsContainer.innerHTML = '';
    blockButtonsContainer.appendChild(createBlockButtons(blocks, activeTab));
  });

  body.appendChild(tabNav);
  body.appendChild(blockButtonsContainer);
  body.appendChild(textarea);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const copyAllBtn = document.createElement('button');
  copyAllBtn.className = 'btn btn-primary';
  copyAllBtn.textContent = 'Copy All';
  copyAllBtn.type = 'button';
  copyAllBtn.addEventListener('click', () => {
    copyToClipboard(textarea.value, copyAllBtn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Close';
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', closeModal);

  footer.appendChild(copyAllBtn);
  footer.appendChild(closeBtn);

  // Assemble
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  dialog.appendChild(content);
  modal.appendChild(dialog);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  modalElement = modal;
  backdropElement = backdrop;

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escapeHandler);
}

export function closeModal(): void {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
  }
  if (backdropElement) {
    backdropElement.remove();
    backdropElement = null;
  }
}
