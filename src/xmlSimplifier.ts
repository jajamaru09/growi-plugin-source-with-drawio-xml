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

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getAttribute(tag: string, attr: string): string | null {
  // Match attr="value" or attr='value'
  const re = new RegExp(`\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = re.exec(tag);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2];
}

function parseMxCells(xml: string): Array<Record<string, string | null>> {
  const cells: Array<Record<string, string | null>> = [];
  // Match self-closing <mxCell ... /> or <mxCell ...></mxCell>
  const cellRe = /<mxCell\b([^>]*?)(?:\/>|>[\s\S]*?<\/mxCell>)/gi;
  let match: RegExpExecArray | null;
  while ((match = cellRe.exec(xml)) !== null) {
    const attrs = match[1];
    cells.push({
      id: getAttribute(attrs, 'id'),
      value: getAttribute(attrs, 'value'),
      edge: getAttribute(attrs, 'edge'),
      vertex: getAttribute(attrs, 'vertex'),
      source: getAttribute(attrs, 'source'),
      target: getAttribute(attrs, 'target'),
    });
  }
  return cells;
}

export function simplifyDrawioXml(xml: string): string {
  const rawCells = parseMxCells(xml);

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];

  for (const cell of rawCells) {
    const id = cell.id ?? '';
    const rawValue = cell.value ?? '';
    const isEdge = cell.edge === '1';
    const source = cell.source;
    const target = cell.target;

    // Decode XML entities then strip HTML tags
    const decodedValue = decodeXmlEntities(rawValue);
    const cleanValue = stripHtml(decodedValue);

    if (isEdge && source && target) {
      edges.push({
        sourceId: source,
        targetId: target,
        label: cleanValue,
      });
    } else if (cleanValue.length > 0) {
      nodes.push({ id, value: cleanValue });
    }
  }

  const lines: string[] = [];

  if (nodes.length > 0) {
    lines.push('### Nodes');
    nodes.forEach((node) => {
      lines.push(`- [${node.id}] ${node.value}`);
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
