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
