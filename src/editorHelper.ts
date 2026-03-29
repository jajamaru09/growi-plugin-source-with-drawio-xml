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
