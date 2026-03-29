# Growi Plugin: Source with Drawio XML - Design Spec

## Overview

Growiのeditモードにボタンを追加し、ページ内の ```` ```drawio ``` ```` ブロックをデコードして閲覧できるプラグイン。生成AIでページを要約する際、drawioの図表情報も含めることで要約精度を向上させる目的で作成する。

## 要件

### 機能要件

1. editモードのツールバーにボタンを1つ追加する
2. ボタンクリックでモーダルを表示する
3. モーダルにはページ全体のマークダウンを表示し、drawioブロック部分のみデコード済みの内容に置換する
4. 2つのタブで表示フォーマットを切り替えられる:
   - **簡略化テキスト**: drawioブロックをノード一覧+接続関係のテキストに変換
   - **XML**: drawioブロックをmxGraphXMLに変換
5. 各drawioブロックに連番を付与し、個別コピーとエディタ挿入ができる
6. モーダルフッターに全文コピーボタンを配置する
7. エディタへの挿入はカーソル位置に追記する（元のマークダウンは置き換えない）

### 非機能要件

- GrowiのBootstrap CSSクラスを利用してUI統一感を保つ
- vanilla JSでReact依存なし（Growi内部のReactとの衝突回避）
- 単一IIFEバンドルとしてビルド

## アーキテクチャ

### ファイル構成

```
growi-plugin-source-with-drawio-xml/
├── client-entry.tsx          # activate/deactivate エントリポイント
├── src/
│   ├── toolbar.ts            # ツールバーボタンの追加・削除
│   ├── modal.ts              # モーダルUI生成・表示・非表示
│   ├── drawioDecoder.ts      # Base64 → XML デコード
│   ├── xmlSimplifier.ts      # mxGraphXML → 簡略化テキスト変換
│   └── editorHelper.ts       # CodeMirrorエディタからの取得・挿入
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.app.json
```

### 処理フロー

```
activate()
  └→ window.navigation 'navigatesuccess' イベント監視開始
      └→ edit画面遷移を検知 (hash.includes('edit'))
          └→ ツールバー要素を待機（ポーリング）
              └→ ボタンを追加

ボタンクリック
  └→ editorHelper: CodeMirrorからマークダウン全文取得
  └→ drawioDecoder: 全drawioブロックを検出・デコード
  └→ xmlSimplifier: mxGraphXML → 簡略化テキスト生成
  └→ modal: 変換済み全文をモーダルに表示

モーダル操作
  ├→ タブ切り替え: 簡略化テキスト / XML 表示切替
  ├→ 個別コピー: 各drawioブロックの変換結果をクリップボードへ
  ├→ 個別挿入: 各drawioブロックの変換結果をエディタカーソル位置に挿入
  └→ 全文コピー: 表示中タブの全テキストをクリップボードへ
```

## コンポーネント詳細

### 1. client-entry.tsx

```typescript
// グローバル型定義
declare global {
  var pluginActivators: Record<string, { activate: () => void; deactivate: () => void }>;
}

// activate: ナビゲーションイベント監視開始、edit検知でツールバーボタン追加
// deactivate: イベント監視解除、DOM要素のクリーンアップ
```

### 2. toolbar.ts

- edit画面遷移を検知し、ツールバー要素(`.\_codemirror-editor-toolbar_q11bm_1 .simplebar-content .d-flex.gap-2`)を待機
- Material Symbolsアイコンのボタンを追加
- ボタンクリックでモーダル表示処理を呼び出し

### 3. drawioDecoder.ts

`drawio_translator` の `drawioDecoder.ts` ロジックを移植:

- `decodeDrawioContent(base64: string): string` - Base64 → inflate(pako) → URLデコード → mxGraphXML
- `extractAllDrawioBlocks(content: string): DrawioBlock[]` - マークダウン全文から全drawioブロックを抽出

```typescript
interface DrawioBlock {
  index: number;        // 連番（1始まり）
  base64: string;       // 元のBase64文字列
  xml: string;          // デコード済みmxGraphXML
  startPos: number;     // マークダウン内の開始位置
  endPos: number;       // マークダウン内の終了位置
  fullMatch: string;    // ```drawio ... ``` 全体のマッチ文字列
}
```

### 4. xmlSimplifier.ts

mxGraphXMLをパースし、人間/AI が読みやすいテキストに変換:

- DOMParserでXMLをパース
- mxCellのvalue属性からノード（テキストを持つセル）を抽出
- source/target属性からエッジ（接続関係）を解析
- エッジのvalue属性があればラベルとして表示

**出力フォーマット:**

```
## Diagram 1

### Nodes
- [1] ユーザー
- [2] サーバー
- [3] データベース

### Connections
- ユーザー → サーバー (リクエスト)
- サーバー → データベース (クエリ)
- データベース → サーバー (結果)
```

### 5. modal.ts

Bootstrap CSSクラスを使用したモーダルUI:

- **サイズ**: `modal-xl` で大きめに表示
- **ヘッダー**: 「Drawio Source Viewer」タイトル + 閉じるボタン
- **タブ**: Bootstrap `nav-tabs` で「簡略化テキスト」/「XML」を切り替え
- **本文**: `<textarea readonly>` でテキスト表示（選択・コピーしやすい）
- **各drawioブロック操作**: テキストエリアの外側に、各drawioブロック対応の「コピー」ボタン + 「エディタに挿入」ボタンを連番ラベル付きで配置
- **フッター**: 「全文コピー」ボタン + 「閉じる」ボタン

**テキスト生成ロジック:**
- マークダウン全文を走査
- drawioブロック部分を検出位置で特定し、変換結果で置換
- drawioブロック以外のマークダウンはそのまま残す
- 各drawioブロックにはコメント形式で連番ヘッダーを付与

### 6. editorHelper.ts

CodeMirrorエディタとの連携:

- `.cm-editor` DOM要素の `cmView` プロパティ経由で `EditorView` インスタンスを取得
- `view.state.doc.toString()` でマークダウン全文取得
- `view.state.selection.main.head` でカーソル位置取得
- `view.dispatch({ changes: { from, insert } })` でカーソル位置にテキスト挿入

## 依存関係とビルド

### package.json

```json
{
  "name": "growi-plugin-source-with-drawio-xml",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "growiPlugin": {
    "schemaVersion": "4",
    "types": ["script"]
  },
  "dependencies": {
    "pako": "^2.1.0"
  },
  "devDependencies": {
    "@growi/pluginkit": "^1.1.0",
    "@types/pako": "^2.0.3",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      input: [resolve(__dirname, 'client-entry.tsx')],
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        format: 'iife',
      },
    },
  },
});
```

## テスト方針

- **ユニットテスト (vitest)**:
  - `drawioDecoder.ts`: Base64デコード、ブロック抽出
  - `xmlSimplifier.ts`: ノード抽出、接続関係解析、フォーマット出力
- **手動テスト**:
  - モーダルUI表示・タブ切り替え
  - エディタ連携（テキスト取得・挿入）
  - 実際のGrowiインスタンスでの動作確認

## スコープ外

- drawio図のプレビュー表示（画像としてのレンダリング）
- drawioブロックの編集・エンコード機能
- drawioブロック以外のコードブロック変換
