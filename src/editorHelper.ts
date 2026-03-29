function getPageId(): string | null {
  // Growi URL format: /{pageId}#edit or /path/to/page#edit
  const pathname = window.location.pathname.substring(1);
  if (!pathname) return null;
  return pathname;
}

export async function getEditorContent(): Promise<string | null> {
  const pageId = getPageId();
  if (!pageId) return null;

  // Try pageId first, then path
  for (const param of [`pageId=${pageId}`, `path=${encodeURIComponent('/' + pageId)}`]) {
    try {
      const res = await fetch(`/_api/v3/page?${param}`);
      if (!res.ok) continue;
      const data = await res.json();
      const body = data.page?.revision?.body;
      if (body) return body;
    } catch {
      continue;
    }
  }

  // Fallback: read from DOM (may be incomplete if code blocks are folded)
  const lines = document.querySelectorAll('.cm-content .cm-line');
  if (lines.length === 0) return null;
  return Array.from(lines).map(l => l.textContent || '').join('\n');
}

export function insertAtCursor(text: string): boolean {
  const cmContent = document.querySelector('.cm-content') as HTMLElement | null;
  if (!cmContent) return false;
  cmContent.focus();
  return document.execCommand('insertText', false, text);
}
