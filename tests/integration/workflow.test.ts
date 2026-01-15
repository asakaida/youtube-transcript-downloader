import { describe, expect, test } from "bun:test";
import { parseArgs } from "../../src/cli.ts";
import { formatTranscript, getExtension } from "../../src/formatter.ts";
import { extractVideoId } from "../../src/transcript.ts";
import type { TranscriptLine } from "../../src/types.ts";

/**
 * Integration tests for the complete workflow from CLI parsing to output formatting.
 * These tests verify that multiple modules work together correctly.
 */

describe("CLI to Formatter workflow", () => {
	test("parses CLI args and formats transcript correctly", () => {
		const args = [
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			"-f",
			"srt",
			"-o",
			"output.srt",
		];

		const options = parseArgs(args);

		expect(options.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		expect(options.format).toBe("srt");
		expect(options.output).toBe("output.srt");

		const videoId = extractVideoId(options.url);
		expect(videoId).toBe("dQw4w9WgXcQ");

		const mockTranscript: TranscriptLine[] = [
			{ text: "Test line 1", start: 0, duration: 2 },
			{ text: "Test line 2", start: 2, duration: 2 },
		];

		const formatted = formatTranscript(
			mockTranscript,
			options.format,
			options.timestamps,
		);

		expect(formatted).toContain(
			"1\n00:00:00,000 --> 00:00:02,000\nTest line 1",
		);
		expect(formatted).toContain(
			"2\n00:00:02,000 --> 00:00:04,000\nTest line 2",
		);
	});

	test("handles txt format with timestamps", () => {
		const args = ["dQw4w9WgXcQ", "-f", "txt", "-t"];
		const options = parseArgs(args);

		const videoId = extractVideoId(options.url);
		expect(videoId).toBe("dQw4w9WgXcQ");

		const mockTranscript: TranscriptLine[] = [
			{ text: "Hello", start: 65, duration: 2 },
		];

		const formatted = formatTranscript(
			mockTranscript,
			options.format,
			options.timestamps,
		);

		expect(formatted).toBe("[01:05] Hello");
	});

	test("generates correct output filename from video ID", () => {
		const args = ["https://youtu.be/abc123DEF_-", "-f", "json"];
		const options = parseArgs(args);

		const videoId = extractVideoId(options.url);
		expect(videoId).toBe("abc123DEF_-");

		const extension = getExtension(options.format);
		const outputFile = options.output ?? `${videoId}.${extension}`;

		expect(outputFile).toBe("abc123DEF_-.json");
	});
});

describe("URL format handling", () => {
	const testCases = [
		{
			name: "standard watch URL",
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			expectedId: "dQw4w9WgXcQ",
		},
		{
			name: "short URL",
			url: "https://youtu.be/dQw4w9WgXcQ",
			expectedId: "dQw4w9WgXcQ",
		},
		{
			name: "embed URL",
			url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
			expectedId: "dQw4w9WgXcQ",
		},
		{
			name: "raw video ID",
			url: "dQw4w9WgXcQ",
			expectedId: "dQw4w9WgXcQ",
		},
		{
			name: "URL with extra parameters",
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLtest",
			expectedId: "dQw4w9WgXcQ",
		},
	];

	for (const { name, url, expectedId } of testCases) {
		test(`extracts video ID from ${name}`, () => {
			const args = [url];
			const options = parseArgs(args);
			const videoId = extractVideoId(options.url);
			expect(videoId).toBe(expectedId);
		});
	}
});

describe("Output format selection", () => {
	const formats = ["txt", "srt", "json"] as const;

	for (const format of formats) {
		test(`correctly handles ${format} format end-to-end`, () => {
			const args = ["dQw4w9WgXcQ", "-f", format];
			const options = parseArgs(args);

			expect(options.format).toBe(format);
			expect(getExtension(options.format)).toBe(format);

			const mockTranscript: TranscriptLine[] = [
				{ text: "Test", start: 0, duration: 1 },
			];

			const formatted = formatTranscript(
				mockTranscript,
				options.format,
				options.timestamps,
			);

			expect(formatted.length).toBeGreaterThan(0);
		});
	}
});
