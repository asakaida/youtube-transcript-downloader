import type { CliOptions, OutputFormat } from "./types.ts";

/** Current version of the CLI */
const VERSION = "1.0.0";

/** Valid output format options */
const VALID_FORMATS = ["txt", "srt", "json"] as const;

const HELP_TEXT = `
youtube-transcript-downloader v${VERSION}

A CLI tool to download YouTube video transcripts (captions)

Usage:
  youtube-transcript-downloader <URL> [options]

Arguments:
  URL                YouTube video URL or video ID

Options:
  -o, --output <file>    Output filename (default: <video-id>.<format>)
  -l, --lang <code>      Language code (e.g., ja, en, ko)
  --list-langs           List available languages
  -f, --format <format>  Output format: txt, srt, json (default: txt)
  -t, --timestamps       Include timestamps (for txt format)
  -h, --help             Show help
  -v, --version          Show version

Examples:
  youtube-transcript-downloader https://www.youtube.com/watch?v=dQw4w9WgXcQ
  youtube-transcript-downloader dQw4w9WgXcQ -o output.txt
  youtube-transcript-downloader https://youtu.be/dQw4w9WgXcQ -l ja -f srt
  youtube-transcript-downloader https://www.youtube.com/watch?v=dQw4w9WgXcQ --list-langs
`.trim();

/**
 * Creates default CLI options.
 *
 * @returns Default CLI options object
 */
function createDefaultOptions(): CliOptions {
	return {
		url: "",
		output: undefined,
		lang: undefined,
		listLangs: false,
		format: "txt",
		timestamps: false,
		help: false,
		version: false,
	};
}

/**
 * Checks if a value is a valid output format.
 *
 * @param value - The value to check
 * @returns True if the value is a valid output format
 */
function isValidFormat(value: string): value is OutputFormat {
	return VALID_FORMATS.includes(value as OutputFormat);
}

/**
 * Parses command-line arguments into CLI options.
 *
 * @param args - Array of command-line arguments
 * @returns Parsed CLI options
 * @throws Error if arguments are invalid
 *
 * @example
 * ```ts
 * const options = parseArgs(["https://youtube.com/watch?v=abc", "-l", "en"]);
 * console.log(options.url); // "https://youtube.com/watch?v=abc"
 * console.log(options.lang); // "en"
 * ```
 */
export function parseArgs(args: string[]): CliOptions {
	const options = createDefaultOptions();

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		switch (arg) {
			case "-h":
			case "--help":
				options.help = true;
				break;

			case "-v":
			case "--version":
				options.version = true;
				break;

			case "-o":
			case "--output":
				i++;
				options.output = args[i];
				if (!options.output) {
					throw new Error("--output requires a filename");
				}
				break;

			case "-l":
			case "--lang":
				i++;
				options.lang = args[i];
				if (!options.lang) {
					throw new Error("--lang requires a language code");
				}
				break;

			case "--list-langs":
				options.listLangs = true;
				break;

			case "-f":
			case "--format": {
				i++;
				const format = args[i];
				if (!format || !isValidFormat(format)) {
					throw new Error("--format must be one of: txt, srt, json");
				}
				options.format = format;
				break;
			}

			case "-t":
			case "--timestamps":
				options.timestamps = true;
				break;

			default:
				if (arg?.startsWith("-")) {
					throw new Error(`Unknown option: ${arg}`);
				}
				if (arg && !options.url) {
					options.url = arg;
				}
				break;
		}

		i++;
	}

	return options;
}

/**
 * Displays the help message to stdout.
 */
export function showHelp(): void {
	console.log(HELP_TEXT);
}

/**
 * Displays the version to stdout.
 */
export function showVersion(): void {
	console.log(`youtube-transcript-downloader v${VERSION}`);
}
