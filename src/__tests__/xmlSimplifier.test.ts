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
    expect(result).toContain('- [1] ユーザー');
    expect(result).toContain('- [2] サーバー');
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
    expect(result).toContain('- [1] Real Node');
    const nodeLines = result.split('\n').filter(l => l.match(/^- \[\d+\]/));
    expect(nodeLines).toHaveLength(1);
  });

  it('includes shape from style attribute', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="User" style="shape=uml-Actor;verticalLabelPosition=bottom;" vertex="1" parent="1"/>
        <mxCell id="3" value="DB" style="shape=cylinder3;size=15;" vertex="1" parent="1"/>
        <mxCell id="4" value="Plain" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('- [1] User [uml-Actor]');
    expect(result).toContain('- [2] DB [cylinder3]');
    expect(result).toContain('- [3] Plain');
    expect(result).not.toContain('Plain [');
  });

  it('detects builtin shapes from style', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Decision" style="rhombus;whiteSpace=wrap;" vertex="1" parent="1"/>
        <mxCell id="3" value="Start" style="ellipse;whiteSpace=wrap;" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('- [1] Decision [rhombus]');
    expect(result).toContain('- [2] Start [ellipse]');
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
    expect(result).toContain('- [1] Lonely');
    expect(result).toMatch(/Lonely\s*→\s*\[99\]/);
  });
});
