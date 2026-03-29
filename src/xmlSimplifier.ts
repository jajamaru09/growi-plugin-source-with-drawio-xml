interface NodeInfo {
  id: string;
  value: string;
  shape: string;
}

interface EdgeInfo {
  sourceId: string;
  targetId: string;
  label: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function extractShape(style: string): string {
  if (!style) return '';
  const shapeMatch = style.match(/shape=([^;]+)/);
  if (shapeMatch) return shapeMatch[1];
  // Common built-in shapes encoded as style keys
  const builtinShapes = ['ellipse', 'rhombus', 'triangle', 'cylinder', 'hexagon', 'parallelogram', 'trapezoid', 'document', 'cloud', 'process', 'swimlane'];
  for (const s of builtinShapes) {
    if (style.includes(s)) return s;
  }
  return '';
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

    const style = cell.getAttribute('style') || '';

    if (isEdge && source && target) {
      edges.push({
        sourceId: source,
        targetId: target,
        label: stripHtml(value),
      });
    } else if (value && stripHtml(value).length > 0) {
      nodes.push({ id, value: stripHtml(value), shape: extractShape(style) });
    }
  });

  const lines: string[] = [];

  if (nodes.length > 0) {
    lines.push('### Nodes');
    nodes.forEach((node, i) => {
      const shapeLabel = node.shape ? ` [${node.shape}]` : '';
      lines.push(`- [${i + 1}] ${node.value}${shapeLabel}`);
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
