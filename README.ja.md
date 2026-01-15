# youtube-transcript-downloader

[English](README.md)

YouTube動画の字幕（キャプション）をダウンロードするCLIツールです。
字幕取得に外部依存関係は不要です。

## 機能

- 字幕が利用可能な任意のYouTube動画から字幕をダウンロード
- 複数の出力形式をサポート: プレーンテキスト、SRT字幕、JSON
- 複数の字幕トラックがある動画での言語選択
- 手動字幕と自動生成字幕の両方に対応
- Bunによる単一バイナリ配布
- クロスプラットフォーム対応（Linux、macOS、Windows）

## インストール

### 前提条件

- [Bun](https://bun.sh/) v1.0以降

### 環境設定

`YOUTUBE_INNERTUBE_API_KEY`環境変数を設定してください。これはYouTubeのWebクライアントに埋め込まれている公開Innertube APIキーです（ユーザーが作成するキーではありません）:

```bash
export YOUTUBE_INNERTUBE_API_KEY=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8
```

永続化するには、シェル設定ファイル（`~/.bashrc`、`~/.zshrc`など）に追加してください。

### ソースから

```bash
git clone https://github.com/user/youtube-transcript-downloader.git
cd youtube-transcript-downloader
bun install
```

### スタンドアロンバイナリのビルド

現在のプラットフォーム用にビルド:

```bash
bun run build
```

これにより`dist/youtube-transcript-downloader`にスタンドアロン実行ファイルが作成されます。

### クロスプラットフォームビルド

特定のプラットフォーム用にビルド:

```bash
# Linux (x64)
bun run build:linux-x64

# Linux (ARM64)
bun run build:linux-arm64

# macOS (Intel)
bun run build:darwin-x64

# macOS (Apple Silicon)
bun run build:darwin-arm64

# Windows (x64)
bun run build:windows-x64
```

全プラットフォーム向けに一括ビルド:

```bash
bun run build:all
```

出力ファイルは`dist/`ディレクトリに作成されます:

| プラットフォーム     | 出力ファイル                                    |
|----------------------|-------------------------------------------------|
| Linux (x64)          | `youtube-transcript-downloader-linux-x64`       |
| Linux (ARM64)        | `youtube-transcript-downloader-linux-arm64`     |
| macOS (Intel)        | `youtube-transcript-downloader-darwin-x64`      |
| macOS (Apple Silicon)| `youtube-transcript-downloader-darwin-arm64`    |
| Windows (x64)        | `youtube-transcript-downloader-windows-x64.exe` |

## 使い方

### 基本的な使い方

```bash
# bunを直接使用
bun run src/index.ts <URL>

# コンパイル済みバイナリを使用
./dist/youtube-transcript-downloader <URL>
```

### 例

デフォルトのファイル（video-id.txt）に字幕をダウンロード:

```bash
youtube-transcript-downloader https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

出力ファイル名を指定:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -o transcript.txt
```

SRT形式でダウンロード:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -f srt
```

特定の言語でダウンロード:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -l ja
```

利用可能な言語を一覧表示:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ --list-langs
```

テキスト出力にタイムスタンプを含める:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -t
```

### オプション

| オプション            | 説明                                                 |
|-----------------------|------------------------------------------------------|
| `-o, --output <file>` | 出力ファイル名（デフォルト: `<video-id>.<format>`）  |
| `-l, --lang <code>`   | 言語コード（例: `ja`、`en`、`ko`）                   |
| `--list-langs`        | 動画で利用可能な言語を一覧表示                       |
| `-f, --format <fmt>`  | 出力形式: `txt`、`srt`、`json`（デフォルト: `txt`）  |
| `-t, --timestamps`    | タイムスタンプを含める（txt形式用）                  |
| `-h, --help`          | ヘルプメッセージを表示                               |
| `-v, --version`       | バージョンを表示                                     |

### URL形式

以下のYouTube URL形式がサポートされています:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `VIDEO_ID`（動画IDのみ）

## 出力形式

### プレーンテキスト（txt）

各キャプションが新しい行に出力されるシンプルなテキスト:

```text
Hello world
This is a transcript
```

タイムスタンプ付き（`-t`フラグ）:

```text
[00:01] Hello world
[00:03] This is a transcript
```

### SRT字幕（srt）

標準的なSRT字幕形式:

```srt
1
00:00:01,360 --> 00:00:03,040
Hello world

2
00:00:03,040 --> 00:00:05,000
This is a transcript
```

### JSON

タイミング情報を含む構造化されたJSON:

```json
[
  {
    "text": "Hello world",
    "start": 1.36,
    "duration": 1.68
  },
  {
    "text": "This is a transcript",
    "start": 3.04,
    "duration": 1.96
  }
]
```

## 開発

### スクリプト

```bash
# CLIを実行
bun run start <args>

# スタンドアロンバイナリをビルド（現在のプラットフォーム）
bun run build

# 全プラットフォーム向けにビルド
bun run build:all

# 型チェック
bun run typecheck

# リント
bun run lint

# リントして修正
bun run lint:fix

# コードをフォーマット
bun run format
```

### テスト

このプロジェクトはBun組み込みのテストランナーを使用しています。

```bash
# 全テストを実行
bun run test

# ユニットテストのみ実行
bun run test:unit

# 統合テストのみ実行
bun run test:integration

# E2Eテストのみ実行
bun run test:e2e

# カバレッジ付きでテストを実行（CI用）
bun run test:ci
```

### テスト構成

テストは以下のように構成されています:

```text
src/
  cli.test.ts          # CLI引数解析のユニットテスト
  formatter.test.ts    # 出力フォーマットのユニットテスト
  transcript.test.ts   # 動画ID抽出のユニットテスト
tests/
  integration/         # 統合テスト（モジュール間の連携）
  e2e/                 # エンドツーエンドテスト（実際のCLI実行）
```

### プロジェクト構成

```text
src/
  index.ts      # CLIエントリーポイント
  cli.ts        # 引数解析とヘルプ
  transcript.ts # YouTube API連携
  formatter.ts  # 出力フォーマット
  types.ts      # TypeScript型定義
tests/
  integration/  # 統合テスト
  e2e/          # エンドツーエンドテスト
```

## コントリビュート

コントリビュートは歓迎します。以下の手順に従ってください:

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を加える
4. テストとリントを実行:

   ```bash
   bun run typecheck
   bun run lint
   bun run test
   ```

5. 変更をコミット（`git commit -m 'Add amazing feature'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを作成

### コード品質の要件

PRを提出する前に、以下を確認してください:

- 全テストがパスすること（`bun run test`）
- 型エラーがないこと（`bun run typecheck`）
- リントエラーがないこと（`bun run lint`）
- 新機能には適切なテストが含まれていること

## ライセンス

MIT
