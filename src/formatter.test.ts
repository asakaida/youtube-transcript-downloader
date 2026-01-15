import { describe, expect, test } from "bun:test";
import { formatTranscript, getExtension } from "./formatter.ts";
import type { TranscriptLine } from "./types.ts";

const sampleLines: TranscriptLine[] = [
	{ text: "Hello world", start: 1.36, duration: 1.68 },
	{ text: "This is a test", start: 3.04, duration: 2.0 },
	{ text: "Goodbye", start: 5.04, duration: 1.5 },
];

describe("formatTranscript", () => {
	describe("txt format", () => {
		test("formats as plain text without timestamps", () => {
			const result = formatTranscript(sampleLines, "txt", false);
			expect(result).toBe("Hello world\nThis is a test\nGoodbye");
		});

		test("formats as plain text with timestamps", () => {
			const result = formatTranscript(sampleLines, "txt", true);
			expect(result).toBe(
				"[00:01] Hello world\n[00:03] This is a test\n[00:05] Goodbye",
			);
		});

		test("handles empty array", () => {
			const result = formatTranscript([], "txt", false);
			expect(result).toBe("");
		});

		test("formats timestamps correctly for longer videos", () => {
			const longVideoLines: TranscriptLine[] = [
				{ text: "After one hour", start: 3661.5, duration: 2.0 },
			];
			const result = formatTranscript(longVideoLines, "txt", true);
			expect(result).toBe("[61:01] After one hour");
		});
	});

	describe("srt format", () => {
		test("formats as SRT subtitles", () => {
			const result = formatTranscript(sampleLines, "srt", false);

			expect(result).toContain("1\n00:00:01,360 --> 00:00:03,040\nHello world");
			expect(result).toContain(
				"2\n00:00:03,040 --> 00:00:05,040\nThis is a test",
			);
			expect(result).toContain("3\n00:00:05,040 --> 00:00:06,540\nGoodbye");
		});

		test("handles hours in SRT format", () => {
			const longVideoLines: TranscriptLine[] = [
				{ text: "After one hour", start: 3661.5, duration: 2.0 },
			];
			const result = formatTranscript(longVideoLines, "srt", false);
			expect(result).toContain("01:01:01,500 --> 01:01:03,500");
		});

		test("handles empty array", () => {
			const result = formatTranscript([], "srt", false);
			expect(result).toBe("");
		});

		test("ignores timestamps flag for SRT", () => {
			const withTimestamps = formatTranscript(sampleLines, "srt", true);
			const withoutTimestamps = formatTranscript(sampleLines, "srt", false);
			expect(withTimestamps).toBe(withoutTimestamps);
		});
	});

	describe("json format", () => {
		test("formats as JSON", () => {
			const result = formatTranscript(sampleLines, "json", false);
			const parsed = JSON.parse(result);

			expect(parsed).toHaveLength(3);
			expect(parsed[0]).toEqual({
				text: "Hello world",
				start: 1.36,
				duration: 1.68,
			});
		});

		test("handles empty array", () => {
			const result = formatTranscript([], "json", false);
			expect(JSON.parse(result)).toEqual([]);
		});

		test("ignores timestamps flag for JSON", () => {
			const withTimestamps = formatTranscript(sampleLines, "json", true);
			const withoutTimestamps = formatTranscript(sampleLines, "json", false);
			expect(withTimestamps).toBe(withoutTimestamps);
		});

		test("produces valid JSON with special characters", () => {
			const specialLines: TranscriptLine[] = [
				{ text: 'Quote: "Hello"', start: 0, duration: 1 },
				{ text: "Newline:\ntest", start: 1, duration: 1 },
			];
			const result = formatTranscript(specialLines, "json", false);
			expect(() => JSON.parse(result)).not.toThrow();
		});
	});
});

describe("getExtension", () => {
	test("returns correct extension for each format", () => {
		expect(getExtension("txt")).toBe("txt");
		expect(getExtension("srt")).toBe("srt");
		expect(getExtension("json")).toBe("json");
	});
});
