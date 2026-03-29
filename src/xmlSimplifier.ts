interface NodeInfo {
  id: string;
  value: string;
  shape: string;
  parentId: string;
  x: number;
  y: number;
  fillColor: string;
  dashed: boolean;
}

interface EdgeInfo {
  sourceId: string;
  targetId: string;
  label: string;
  dashed: boolean;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function extractShape(style: string): string {
  if (!style) return '';
  const shapeMatch = style.match(/shape=([^;]+)/);
  if (shapeMatch) return shapeMatch[1];
  const builtinShapes = ['ellipse', 'rhombus', 'triangle', 'cylinder', 'hexagon', 'parallelogram', 'trapezoid', 'document', 'cloud', 'process', 'swimlane'];
  for (const s of builtinShapes) {
    if (style.includes(s)) return s;
  }
  return '';
}

function extractStyleValue(style: string, key: string): string {
  if (!style) return '';
  const match = style.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : '';
}

function getGeometry(cell: Element): { x: number; y: number } {
  const geo = cell.querySelector('mxGeometry');
  if (!geo) return { x: 0, y: 0 };
  return {
    x: parseFloat(geo.getAttribute('x') || '0'),
    y: parseFloat(geo.getAttribute('y') || '0'),
  };
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
  // Track containers (cells with value that are parents of other cells)
  const allParentIds = new Set<string>();

  // First pass: collect all parent IDs
  cells.forEach((cell) => {
    const parentId = cell.getAttribute('parent') || '';
    if (parentId) allParentIds.add(parentId);
  });

  // Second pass: extract nodes and edges
  cells.forEach((cell) => {
    const id = cell.getAttribute('id') || '';
    const value = cell.getAttribute('value') || '';
    const isEdge = cell.getAttribute('edge') === '1';
    const source = cell.getAttribute('source');
    const target = cell.getAttribute('target');
    const style = cell.getAttribute('style') || '';
    const parentId = cell.getAttribute('parent') || '';

    if (isEdge && source && target) {
      edges.push({
        sourceId: source,
        targetId: target,
        label: stripHtml(value),
        dashed: style.includes('dashed=1'),
      });
    } else if (value && stripHtml(value).length > 0) {
      const { x, y } = getGeometry(cell);
      nodes.push({
        id,
        value: stripHtml(value),
        shape: extractShape(style),
        parentId,
        x,
        y,
        fillColor: extractStyleValue(style, 'fillColor'),
        dashed: style.includes('dashed=1'),
      });
    }
  });

  // Build group map: parentId -> child nodes
  const nodeMap = new Map<string, NodeInfo>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const groups = new Map<string, NodeInfo[]>();
  nodes.forEach((node) => {
    // If parent is a node with a value (container/swimlane)
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId)!;
      if (!groups.has(parentNode.id)) {
        groups.set(parentNode.id, []);
      }
      groups.get(parentNode.id)!.push(node);
    }
  });

  // Sort nodes by position (top-to-bottom, then left-to-right)
  const sortedNodes = [...nodes].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 20) return yDiff;
    return a.x - b.x;
  });

  const lines: string[] = [];

  // Nodes section
  if (sortedNodes.length > 0) {
    lines.push('### Nodes');
    sortedNodes.forEach((node, i) => {
      const attrs: string[] = [];
      if (node.shape) attrs.push(node.shape);
      if (node.fillColor && node.fillColor !== 'none') attrs.push(`color:${node.fillColor}`);
      if (node.dashed) attrs.push('dashed');
      const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
      lines.push(`- [${i + 1}] ${node.value}${attrStr}`);
    });
  }

  // Groups section
  if (groups.size > 0) {
    lines.push('');
    lines.push('### Groups');
    groups.forEach((children, parentId) => {
      const parent = nodeMap.get(parentId)!;
      const childNames = children.map((c) => c.value).join(', ');
      lines.push(`- ${parent.value}: { ${childNames} }`);
    });
  }

  // Build id -> display number map from sorted nodes
  const idToNum = new Map<string, number>();
  sortedNodes.forEach((node, i) => idToNum.set(node.id, i + 1));

  // Connections section
  if (edges.length > 0) {
    lines.push('');
    lines.push('### Connections');

    const nameMap = new Map<string, string>();
    nodes.forEach((n) => nameMap.set(n.id, n.value));

    edges.forEach((edge) => {
      const sourceNum = idToNum.get(edge.sourceId);
      const targetNum = idToNum.get(edge.targetId);
      const sourceName = sourceNum
        ? `[${sourceNum}] ${nameMap.get(edge.sourceId)}`
        : `[?] ${edge.sourceId}`;
      const targetName = targetNum
        ? `[${targetNum}] ${nameMap.get(edge.targetId)}`
        : `[?] ${edge.targetId}`;
      const parts: string[] = [];
      if (edge.label) parts.push(edge.label);
      if (edge.dashed) parts.push('dashed');
      const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      lines.push(`- ${sourceName} → ${targetName}${suffix}`);
    });
  }

  // Flow order section
  if (sortedNodes.length > 1) {
    lines.push('');
    lines.push('### Layout Order (top→bottom, left→right)');
    lines.push(sortedNodes.map((n) => n.value).join(' → '));
  }

  return lines.join('\n');
}
