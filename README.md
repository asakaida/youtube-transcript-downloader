# youtube-transcript-downloader

[日本語](README.ja.md)

A CLI tool to download YouTube video transcripts (captions).
No external dependencies for transcript fetching.

## Features

- Download transcripts from any YouTube video with available captions
- Support for multiple output formats: plain text, SRT subtitles, and JSON
- Language selection for videos with multiple caption tracks
- Works with both manual and auto-generated captions
- Single binary distribution with Bun
- Cross-platform support (Linux, macOS, Windows)

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later

### From source

```bash
git clone https://github.com/user/youtube-transcript-downloader.git
cd youtube-transcript-downloader
bun install
```

### Build standalone binary

Build for your current platform:

```bash
bun run build
```

This creates a standalone executable at `dist/youtube-transcript-downloader`.

### Cross-platform builds

Build for a specific platform:

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

Build for all platforms at once:

```bash
bun run build:all
```

Output files are created in the `dist/` directory:

| Platform             | Output file                                     |
|----------------------|-------------------------------------------------|
| Linux (x64)          | `youtube-transcript-downloader-linux-x64`       |
| Linux (ARM64)        | `youtube-transcript-downloader-linux-arm64`     |
| macOS (Intel)        | `youtube-transcript-downloader-darwin-x64`      |
| macOS (Apple Silicon)| `youtube-transcript-downloader-darwin-arm64`    |
| Windows (x64)        | `youtube-transcript-downloader-windows-x64.exe` |

## Usage

### Basic usage

```bash
# Using bun directly
bun run src/index.ts <URL>

# Using compiled binary
./dist/youtube-transcript-downloader <URL>
```

### Examples

Download transcript to default file (video-id.txt):

```bash
youtube-transcript-downloader https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Specify output filename:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -o transcript.txt
```

Download in SRT format:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -f srt
```

Download in a specific language:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -l ja
```

List available languages:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ --list-langs
```

Include timestamps in text output:

```bash
youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -t
```

### Options

| Option                | Description                                          |
|-----------------------|------------------------------------------------------|
| `-o, --output <file>` | Output filename (default: `<video-id>.<format>`)     |
| `-l, --lang <code>`   | Language code (e.g., `ja`, `en`, `ko`)               |
| `--list-langs`        | List available languages for the video               |
| `-f, --format <fmt>`  | Output format: `txt`, `srt`, `json` (default: `txt`) |
| `-t, --timestamps`    | Include timestamps (for txt format)                  |
| `-h, --help`          | Show help message                                    |
| `-v, --version`       | Show version                                         |

### URL formats

The following YouTube URL formats are supported:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `VIDEO_ID` (just the video ID)

## Output formats

### Plain text (txt)

Simple text output with each caption on a new line:

```text
Hello world
This is a transcript
```

With timestamps (`-t` flag):

```text
[00:01] Hello world
[00:03] This is a transcript
```

### SRT subtitles (srt)

Standard SRT subtitle format:

```srt
1
00:00:01,360 --> 00:00:03,040
Hello world

2
00:00:03,040 --> 00:00:05,000
This is a transcript
```

### JSON

Structured JSON with timing information:

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

## Development

### Scripts

```bash
# Run the CLI
bun run start <args>

# Build standalone binary (current platform)
bun run build

# Build for all platforms
bun run build:all

# Type check
bun run typecheck

# Lint
bun run lint

# Lint and fix
bun run lint:fix

# Format code
bun run format
```

### Testing

This project uses Bun's built-in test runner.

```bash
# Run all tests
bun run test

# Run unit tests only
bun run test:unit

# Run integration tests only
bun run test:integration

# Run E2E tests only
bun run test:e2e

# Run tests with coverage (for CI)
bun run test:ci
```

### Test structure

Tests are organized as follows:

```text
src/
  cli.test.ts          # Unit tests for CLI argument parsing
  formatter.test.ts    # Unit tests for output formatting
  transcript.test.ts   # Unit tests for video ID extraction
tests/
  integration/         # Integration tests (module interactions)
  e2e/                 # End-to-end tests (real CLI execution)
```

### Project structure

```text
src/
  index.ts      # CLI entry point
  cli.ts        # Argument parsing and help
  transcript.ts # YouTube API interaction
  formatter.ts  # Output formatting
  types.ts      # TypeScript type definitions
tests/
  integration/  # Integration tests
  e2e/          # End-to-end tests
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting:

   ```bash
   bun run typecheck
   bun run lint
   bun run test
   ```

5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code quality requirements

Before submitting a PR, ensure:

- All tests pass (`bun run test`)
- No type errors (`bun run typecheck`)
- No lint errors (`bun run lint`)
- New features include appropriate tests

## License

MIT
