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
    const nodeLines = result.split('\n').filter(l => l.match(/^- \[\d+\]/));
    expect(nodeLines).toHaveLength(1);
  });

  it('includes shape from style attribute', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="User" style="shape=umlActor;verticalLabelPosition=bottom;" vertex="1" parent="1"/>
        <mxCell id="3" value="Plain" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('User [umlActor]');
    expect(result).not.toContain('Plain [');
  });

  it('detects builtin shapes from style', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Decision" style="rhombus;whiteSpace=wrap;" vertex="1" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('Decision [rhombus]');
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
    expect(result).toMatch(/Lonely\s*→\s*\[99\]/);
  });

  it('shows group/container relationships', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Swimlane" style="swimlane;" vertex="1" parent="1"/>
        <mxCell id="3" value="Task A" vertex="1" parent="2"/>
        <mxCell id="4" value="Task B" vertex="1" parent="2"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('### Groups');
    expect(result).toContain('Swimlane: { Task A, Task B }');
  });

  it('sorts nodes by position and shows layout order', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Bottom" vertex="1" parent="1">
          <mxGeometry x="100" y="200"/>
        </mxCell>
        <mxCell id="3" value="Top" vertex="1" parent="1">
          <mxGeometry x="100" y="10"/>
        </mxCell>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('### Layout Order');
    expect(result).toContain('Top → Bottom');
    // Top should be listed first in Nodes
    const nodeLines = result.split('\n').filter(l => l.match(/^- \[\d+\]/));
    expect(nodeLines[0]).toContain('Top');
    expect(nodeLines[1]).toContain('Bottom');
  });

  it('includes fillColor and dashed attributes', () => {
    const xml = `<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Error" style="fillColor=#FF0000;" vertex="1" parent="1"/>
        <mxCell id="3" value="Optional" style="dashed=1;" vertex="1" parent="1"/>
        <mxCell id="4" value="Normal" vertex="1" parent="1"/>
        <mxCell id="5" edge="1" source="2" target="3" style="dashed=1;" parent="1"/>
      </root>
    </mxGraphModel>`;
    const result = simplifyDrawioXml(xml);
    expect(result).toContain('Error [color:#FF0000]');
    expect(result).toContain('Optional [dashed]');
    expect(result).not.toContain('Normal [');
    expect(result).toMatch(/Error\s*→\s*Optional\s*\(dashed\)/);
  });
});
