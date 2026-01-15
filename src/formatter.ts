import type { OutputFormat, TranscriptLine } from "./types.ts";

/**
 * Converts seconds to SRT timestamp format.
 *
 * @param seconds - Time in seconds
 * @returns Formatted timestamp (e.g., "01:23:45,678")
 *
 * @example
 * ```ts
 * formatSrtTimestamp(3723.456); // "01:02:03,456"
 * ```
 */
function formatSrtTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const millis = Math.round((seconds % 1) * 1000);

	const pad2 = (n: number) => n.toString().padStart(2, "0");
	const pad3 = (n: number) => n.toString().padStart(3, "0");

	return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)},${pad3(millis)}`;
}

/**
 * Converts seconds to a simple human-readable timestamp.
 *
 * @param seconds - Time in seconds
 * @returns Formatted timestamp (e.g., "[01:23]")
 *
 * @example
 * ```ts
 * formatSimpleTimestamp(83); // "[01:23]"
 * ```
 */
function formatSimpleTimestamp(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);

	const pad2 = (n: number) => n.toString().padStart(2, "0");

	return `[${pad2(minutes)}:${pad2(secs)}]`;
}

/**
 * Formats transcript lines as plain text.
 *
 * @param lines - Array of transcript lines
 * @param timestamps - Whether to include timestamps
 * @returns Formatted text content
 */
function formatAsTxt(lines: TranscriptLine[], timestamps: boolean): string {
	if (timestamps) {
		return lines
			.map((line) => `${formatSimpleTimestamp(line.start)} ${line.text}`)
			.join("\n");
	}
	return lines.map((line) => line.text).join("\n");
}

/**
 * Formats transcript lines as SRT subtitle format.
 *
 * @param lines - Array of transcript lines
 * @returns Formatted SRT content
 *
 * @example
 * Output format:
 * ```
 * 1
 * 00:00:01,360 --> 00:00:03,040
 * Hello world
 *
 * 2
 * 00:00:03,040 --> 00:00:05,000
 * This is a subtitle
 * ```
 */
function formatAsSrt(lines: TranscriptLine[]): string {
	return lines
		.map((line, index) => {
			const start = formatSrtTimestamp(line.start);
			const end = formatSrtTimestamp(line.start + line.duration);
			return `${index + 1}\n${start} --> ${end}\n${line.text}\n`;
		})
		.join("\n");
}

/**
 * Formats transcript lines as JSON.
 *
 * @param lines - Array of transcript lines
 * @returns Formatted JSON string with 2-space indentation
 */
function formatAsJson(lines: TranscriptLine[]): string {
	return JSON.stringify(lines, null, 2);
}

/**
 * Formats transcript lines according to the specified output format.
 *
 * @param lines - Array of transcript lines
 * @param format - Output format (txt, srt, or json)
 * @param timestamps - Whether to include timestamps (only applies to txt format)
 * @returns Formatted content string
 *
 * @example
 * ```ts
 * const content = formatTranscript(lines, "srt", false);
 * await Bun.write("output.srt", content);
 * ```
 */
export function formatTranscript(
	lines: TranscriptLine[],
	format: OutputFormat,
	timestamps: boolean,
): string {
	switch (format) {
		case "txt":
			return formatAsTxt(lines, timestamps);
		case "srt":
			return formatAsSrt(lines);
		case "json":
			return formatAsJson(lines);
	}
}

/**
 * Gets the file extension for the specified output format.
 *
 * @param format - Output format
 * @returns File extension (same as format)
 */
export function getExtension(format: OutputFormat): string {
	return format;
}
