export function getEditorContent(): string | null {
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
