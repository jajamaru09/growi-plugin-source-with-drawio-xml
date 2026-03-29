# Drawio Source Viewer Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Growiのeditモードにボタンを追加し、drawioブロックをデコードしてモーダルで閲覧できるプラグインを構築する。

**Architecture:** vanilla JS + Bootstrap CSS によるGrowiスクリプトプラグイン。client-entry.tsxがactivate/deactivateを提供し、ナビゲーションイベントでedit画面を検知してツールバーにボタンを追加する。ボタンクリックでCodeMirrorからマークダウン全文を取得し、drawioブロックをデコード後モーダルに表示する。

**Tech Stack:** TypeScript, Vite (IIFE build), pako (inflate), vitest, Bootstrap CSS (Growi既存)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | プロジェクト定義、依存関係、growiPlugin設定 |
| `tsconfig.json` | TypeScript共通設定 |
| `tsconfig.app.json` | アプリ用TypeScript設定 |
| `vite.config.ts` | Viteビルド設定（IIFE, manifest） |
| `client-entry.tsx` | プラグインエントリポイント（activate/deactivate） |
| `src/drawioDecoder.ts` | Base64デコード、drawioブロック抽出 |
| `src/xmlSimplifier.ts` | mxGraphXML → 簡略化テキスト変換 |
| `src/editorHelper.ts` | CodeMirrorからのテキスト取得・カーソル挿入 |
| `src/toolbar.ts` | ツールバーボタンの追加・削除 |
| `src/modal.ts` | モーダルUI生成・表示・操作 |
| `src/__tests__/drawioDecoder.test.ts` | drawioDecoderのテスト |
| `src/__tests__/xmlSimplifier.test.ts` | xmlSimplifierのテスト |

---

### Task 1: .gitignore and Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `vite.config.ts`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
```

Note: `dist/` is NOT ignored because Growi plugins need the built output in the repository for installation.

- [ ] **Step 2: Create package.json**

```json
{
  "name": "growi-plugin-source-with-drawio-xml",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "growiPlugin": {
    "schemaVersion": "4",
    "types": ["script"]
  },
  "dependencies": {
    "pako": "^2.1.0"
  },
  "devDependencies": {
    "@growi/pluginkit": "^1.1.0",
    "@types/pako": "^2.0.3",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" }
  ]
}
```

- [ ] **Step 4: Create tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["client-entry.tsx", "src"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      input: [resolve(__dirname, 'client-entry.tsx')],
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        format: 'iife',
      },
    },
  },
});
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, `package-lock.json` generated

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json vite.config.ts
git commit -m "chore: scaffold project with vite, typescript, pako"
```

---

### Task 2: drawioDecoder

**Files:**
- Create: `src/drawioDecoder.ts`
- Create: `src/__tests__/drawioDecoder.test.ts`

- [ ] **Step 1: Write failing tests for decodeDrawioContent**

Create `src/__tests__/drawioDecoder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { decodeDrawioContent, extractAllDrawioBlocks } from '../drawioDecoder';
import { deflateRaw } from 'pako';

// Helper: encode a known XML string the same way drawio does
function encodeTestXml(xml: string): string {
  const urlEncoded = encodeURIComponent(xml);
  const compressed = deflateRaw(urlEncoded);
  let binaryString = '';
  for (let i = 0; i < compressed.length; i++) {
    binaryString += String.fromCharCode(compressed[i]);
  }
  return btoa(binaryString);
}

describe('decodeDrawioContent', () => {
  it('decodes a Base64-encoded drawio string to mxGraphXML', () => {
    const originalXml = '<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
    const encoded = encodeTestXml(originalXml);
    const decoded = decodeDrawioContent(encoded);
    expect(decoded).toBe(originalXml);
  });

  it('handles XML with Japanese characters', () => {
    const originalXml = '<mxGraphModel><root><mxCell id="1" value="ユーザー"/></root></mxGraphModel>';
    const encoded = encodeTestXml(originalXml);
    const decoded = decodeDrawioContent(encoded);
    expect(decoded).toBe(originalXml);
  });
});

describe('extractAllDrawioBlocks', () => {
  it('returns empty array when no drawio blocks exist', () => {
    const content = '# Hello\nSome text\n';
    const blocks = extractAllDrawioBlocks(content);
    expect(blocks).toEqual([]);
  });

  it('extracts a single drawio block', () => {
    const xml = '<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
    const encoded = encodeTestXml(xml);
    const content = `# Title\n\n\`\`\` drawio\n${encoded}\n\`\`\`\n\nSome text`;
    const blocks = extractAllDrawioBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].index).toBe(1);
    expect(blocks[0].base64).toBe(encoded);
    expect(blocks[0].xml).toBe(xml);
    expect(blocks[0].fullMatch).toContain('``` drawio');
  });

  it('extracts multiple drawio blocks with correct indices', () => {
    const xml1 = '<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
    const xml2 = '<mxGraphModel><root><mxCell id="1" value="test"/></root></mxGraphModel>';
    const encoded1 = encodeTestXml(xml1);
    const encoded2 = encodeTestXml(xml2);
    const content = `# Title\n\n\`\`\` drawio\n${encoded1}\n\`\`\`\n\nMiddle text\n\n\`\`\`drawio\n${encoded2}\n\`\`\`\n`;
    const blocks = extractAllDrawioBlocks(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].index).toBe(1);
    expect(blocks[0].xml).toBe(xml1);
    expect(blocks[1].index).toBe(2);
    expect(blocks[1].xml).toBe(xml2);
  });

  it('captures startPos and endPos correctly', () => {
    const xml = '<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
    const encoded = encodeTestXml(xml);
    const prefix = '# Title\n\n';
    const drawioBlock = `\`\`\` drawio\n${encoded}\n\`\`\``;
    const content = `${prefix}${drawioBlock}\n\nSuffix`;
    const blocks = extractAllDrawioBlocks(content);
    expect(blocks[0].startPos).toBe(prefix.length);
    expect(blocks[0].endPos).toBe(prefix.length + drawioBlock.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/drawioDecoder.test.ts`
Expected: FAIL — module `../drawioDecoder` not found

- [ ] **Step 3: Implement drawioDecoder.ts**

Create `src/drawioDecoder.ts`:

```typescript
import { inflateRaw } from 'pako';

export interface DrawioBlock {
  index: number;
  base64: string;
  xml: string;
  startPos: number;
  endPos: number;
  fullMatch: string;
}

export function decodeDrawioContent(base64Content: string): string {
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const inflated = inflateRaw(bytes, { to: 'string' });
  return decodeURIComponent(inflated);
}

export function extractAllDrawioBlocks(content: string): DrawioBlock[] {
  const blocks: DrawioBlock[] = [];
  const regex = /```\s*drawio\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(content)) !== null) {
    const base64 = match[1].trim();
    const xml = decodeDrawioContent(base64);
    blocks.push({
      index,
      base64,
      xml,
      startPos: match.index,
      endPos: match.index + match[0].length,
      fullMatch: match[0],
    });
    index++;
  }

  return blocks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/drawioDecoder.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/drawioDecoder.ts src/__tests__/drawioDecoder.test.ts
git commit -m "feat: add drawio Base64 decoder and block extractor"
```

---

### Task 3: xmlSimplifier

**Files:**
- Create: `src/xmlSimplifier.ts`
- Create: `src/__tests__/xmlSimplifier.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/xmlSimplifier.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { simplifyDrawioXml } from '../xmlSimplifier';

describe('simplifyDrawioXml', () => {
  it('extracts nodes with value attributes', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="ユーザー" vertex="1" parent="1"/>
        <mxCell id="3" value="サーバー" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('ユーザー');
    expect(result).toContain('サーバー');
  });

  it('extracts connections between nodes', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="A" vertex="1" parent="1"/>
        <mxCell id="3" value="B" vertex="1" parent="1"/>
        <mxCell id="4" edge="1" source="2" target="3" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toMatch(/A\s*→\s*B/);
  });

  it('includes edge labels when present', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Client" vertex="1" parent="1"/>
        <mxCell id="3" value="Server" vertex="1" parent="1"/>
        <mxCell id="4" value="HTTP Request" edge="1" source="2" target="3" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toMatch(/Client\s*→\s*Server\s*\(HTTP Request\)/);
  });

  it('skips cells with empty or HTML-only values', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="" vertex="1" parent="1"/>
        <mxCell id="3" value="&lt;br&gt;" vertex="1" parent="1"/>
        <mxCell id="4" value="Real Node" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('Real Node');
    expect(result).not.toContain('[1]');
    // "Real Node" should be the only node listed
    const nodeLines = result.split('\n').filter(l => l.match(/^- \[\d+\]/));
    expect(nodeLines).toHaveLength(1);
  });

  it('handles edges with unknown source/target gracefully', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Lonely" vertex="1" parent="1"/>
        <mxCell id="3" edge="1" source="2" target="99" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('Lonely');
    // Edge with unknown target should use ID fallback
    expect(result).toMatch(/Lonely\s*→\s*\[99\]/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/xmlSimplifier.test.ts`
Expected: FAIL — module `../xmlSimplifier` not found

- [ ] **Step 3: Implement xmlSimplifier.ts**

Create `src/xmlSimplifier.ts`:

```typescript
interface NodeInfo {
  id: string;
  value: string;
}

interface EdgeInfo {
  sourceId: string;
  targetId: string;
  label: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

export function simplifyDrawioXml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return `[XML Parse Error: ${parserError.textContent}]`;
  }

  const cells = doc.querySelectorAll('mxCell');
  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];

  cells.forEach((cell) => {
    const id = cell.getAttribute('id') || '';
    const value = cell.getAttribute('value') || '';
    const isEdge = cell.getAttribute('edge') === '1';
    const source = cell.getAttribute('source');
    const target = cell.getAttribute('target');

    if (isEdge && source && target) {
      edges.push({
        sourceId: source,
        targetId: target,
        label: stripHtml(value),
      });
    } else if (value && stripHtml(value).length > 0) {
      nodes.push({ id, value: stripHtml(value) });
    }
  });

  const lines: string[] = [];

  if (nodes.length > 0) {
    lines.push('### Nodes');
    nodes.forEach((node, i) => {
      lines.push(`- [${i + 1}] ${node.value}`);
    });
  }

  if (edges.length > 0) {
    lines.push('');
    lines.push('### Connections');

    const nodeMap = new Map<string, string>();
    nodes.forEach((n) => nodeMap.set(n.id, n.value));

    edges.forEach((edge) => {
      const sourceName = nodeMap.get(edge.sourceId) || `[${edge.sourceId}]`;
      const targetName = nodeMap.get(edge.targetId) || `[${edge.targetId}]`;
      if (edge.label) {
        lines.push(`- ${sourceName} → ${targetName} (${edge.label})`);
      } else {
        lines.push(`- ${sourceName} → ${targetName}`);
      }
    });
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/xmlSimplifier.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/xmlSimplifier.ts src/__tests__/xmlSimplifier.test.ts
git commit -m "feat: add XML simplifier for drawio diagrams"
```

---

### Task 4: editorHelper

**Files:**
- Create: `src/editorHelper.ts`

- [ ] **Step 1: Implement editorHelper.ts**

Create `src/editorHelper.ts`:

```typescript
interface EditorView {
  state: {
    doc: { toString(): string };
    selection: { main: { head: number } };
  };
  dispatch(tr: { changes: { from: number; insert: string } }): void;
}

function getEditorView(): EditorView | null {
  const cmEditor = document.querySelector('.cm-editor') as HTMLElement | null;
  if (!cmEditor) return null;
  // Access CodeMirror's EditorView via the cmView property
  const cmView = (cmEditor as any).cmView;
  if (!cmView?.view) return null;
  return cmView.view as EditorView;
}

export function getEditorContent(): string | null {
  const view = getEditorView();
  if (!view) return null;
  return view.state.doc.toString();
}

export function insertAtCursor(text: string): boolean {
  const view = getEditorView();
  if (!view) return false;
  const pos = view.state.selection.main.head;
  view.dispatch({ changes: { from: pos, insert: text } });
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/editorHelper.ts
git commit -m "feat: add CodeMirror editor helper for text get/insert"
```

---

### Task 5: Modal UI

**Files:**
- Create: `src/modal.ts`

- [ ] **Step 1: Implement modal.ts**

Create `src/modal.ts`:

```typescript
import { extractAllDrawioBlocks, type DrawioBlock } from './drawioDecoder';
import { simplifyDrawioXml } from './xmlSimplifier';
import { insertAtCursor } from './editorHelper';

let modalElement: HTMLElement | null = null;

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

async function copyToClipboard(text: string, button: HTMLButtonElement): void {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = original; }, 1500);
  } catch {
    // Fallback: select textarea content
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

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKeydown);
    }
  };
  document.addEventListener('keydown', onKeydown);
}

export function closeModal(): void {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
  }
  document.querySelector('.modal-backdrop')?.remove();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modal.ts
git commit -m "feat: add modal UI with tabs, block buttons, and clipboard"
```

---

### Task 6: Toolbar Button

**Files:**
- Create: `src/toolbar.ts`

- [ ] **Step 1: Implement toolbar.ts**

Create `src/toolbar.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/toolbar.ts
git commit -m "feat: add toolbar button for edit mode"
```

---

### Task 7: Plugin Entry Point

**Files:**
- Create: `client-entry.tsx`

- [ ] **Step 1: Implement client-entry.tsx**

Create `client-entry.tsx`:

```typescript
import { waitForToolbarAndAddButton, removeButton } from './src/toolbar';

declare global {
  interface Window {
    pluginActivators: Record<string, { activate: () => void; deactivate: () => void }>;
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
};

if (!window.pluginActivators) {
  window.pluginActivators = {} as any;
}
window.pluginActivators['growi-plugin-source-with-drawio-xml'] = { activate, deactivate };
```

- [ ] **Step 2: Commit**

```bash
git add client-entry.tsx
git commit -m "feat: add plugin entry point with activate/deactivate"
```

---

### Task 8: Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: `dist/` directory created with `client-entry-*.js` and `.vite/manifest.json`

- [ ] **Step 4: Verify manifest.json exists**

Run: `cat dist/.vite/manifest.json`
Expected: JSON with entry for `client-entry.tsx` pointing to the built JS file

- [ ] **Step 5: Commit dist if needed for deployment**

```bash
git add dist/
git commit -m "chore: add initial build output"
```

