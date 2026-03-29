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
