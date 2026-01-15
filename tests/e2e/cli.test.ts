import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * End-to-end tests for the CLI.
 * These tests run the actual CLI binary and verify the output.
 */

const CLI_PATH = join(import.meta.dir, "../../src/index.ts");
const TEST_OUTPUT_DIR = join(import.meta.dir, "../.tmp");

/**
 * Runs the CLI with the given arguments.
 */
async function runCli(
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		cwd: TEST_OUTPUT_DIR,
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	return { stdout, stderr, exitCode };
}

beforeAll(() => {
	if (!existsSync(TEST_OUTPUT_DIR)) {
		Bun.spawnSync(["mkdir", "-p", TEST_OUTPUT_DIR]);
	}
});

afterAll(() => {
	if (existsSync(TEST_OUTPUT_DIR)) {
		rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
	}
});

describe("CLI help and version", () => {
	test("displays help with -h flag", async () => {
		const { stdout, exitCode } = await runCli(["-h"]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("youtube-transcript-downloader");
		expect(stdout).toContain("Usage:");
		expect(stdout).toContain("Options:");
	});

	test("displays help with --help flag", async () => {
		const { stdout, exitCode } = await runCli(["--help"]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("youtube-transcript-downloader");
	});

	test("displays version with -v flag", async () => {
		const { stdout, exitCode } = await runCli(["-v"]);

		expect(exitCode).toBe(0);
		expect(stdout).toMatch(/youtube-transcript-downloader v\d+\.\d+\.\d+/);
	});

	test("displays version with --version flag", async () => {
		const { stdout, exitCode } = await runCli(["--version"]);

		expect(exitCode).toBe(0);
		expect(stdout).toMatch(/v\d+\.\d+\.\d+/);
	});
});

describe("CLI error handling", () => {
	test("exits with error when no URL provided", async () => {
		const { stderr, exitCode } = await runCli([]);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("Error:");
	});

	test("exits with error for invalid URL", async () => {
		const { stderr, exitCode } = await runCli(["invalid-url"]);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("Error:");
	});

	test("exits with error for unknown option", async () => {
		const { stderr, exitCode } = await runCli(["--unknown-option"]);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("Unknown option");
	});

	test("exits with error for invalid format", async () => {
		const { stderr, exitCode } = await runCli(["dQw4w9WgXcQ", "-f", "invalid"]);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("--format");
	});
});

describe("CLI with real YouTube API", () => {
	const TEST_VIDEO_ID = "dQw4w9WgXcQ";

	test(
		"lists available languages",
		async () => {
			const { stdout, exitCode } = await runCli([
				TEST_VIDEO_ID,
				"--list-langs",
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Video ID:");
			expect(stdout).toContain("Available captions:");
		},
		{ timeout: 30000 },
	);

	test(
		"downloads transcript in txt format",
		async () => {
			const outputFile = "test-output.txt";
			const { stdout, exitCode } = await runCli([
				TEST_VIDEO_ID,
				"-o",
				outputFile,
				"-f",
				"txt",
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Saved:");
			expect(stdout).toContain("Downloaded");

			const outputPath = join(TEST_OUTPUT_DIR, outputFile);
			expect(existsSync(outputPath)).toBe(true);

			const content = await Bun.file(outputPath).text();
			expect(content.length).toBeGreaterThan(0);
		},
		{ timeout: 30000 },
	);

	test(
		"downloads transcript in srt format",
		async () => {
			const outputFile = "test-output.srt";
			const { stdout, exitCode } = await runCli([
				TEST_VIDEO_ID,
				"-o",
				outputFile,
				"-f",
				"srt",
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Saved:");

			const outputPath = join(TEST_OUTPUT_DIR, outputFile);
			expect(existsSync(outputPath)).toBe(true);

			const content = await Bun.file(outputPath).text();
			expect(content).toContain("-->");
		},
		{ timeout: 30000 },
	);

	test(
		"downloads transcript in json format",
		async () => {
			const outputFile = "test-output.json";
			const { stdout, exitCode } = await runCli([
				TEST_VIDEO_ID,
				"-o",
				outputFile,
				"-f",
				"json",
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Saved:");

			const outputPath = join(TEST_OUTPUT_DIR, outputFile);
			expect(existsSync(outputPath)).toBe(true);

			const content = await Bun.file(outputPath).text();
			const parsed = JSON.parse(content);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed.length).toBeGreaterThan(0);
			expect(parsed[0]).toHaveProperty("text");
			expect(parsed[0]).toHaveProperty("start");
			expect(parsed[0]).toHaveProperty("duration");
		},
		{ timeout: 30000 },
	);

	test(
		"downloads transcript with timestamps",
		async () => {
			const outputFile = "test-output-timestamps.txt";
			const { exitCode } = await runCli([
				TEST_VIDEO_ID,
				"-o",
				outputFile,
				"-f",
				"txt",
				"-t",
			]);

			expect(exitCode).toBe(0);

			const outputPath = join(TEST_OUTPUT_DIR, outputFile);
			const content = await Bun.file(outputPath).text();
			expect(content).toMatch(/\[\d{2}:\d{2}\]/);
		},
		{ timeout: 30000 },
	);

	test(
		"downloads transcript with specific language",
		async () => {
			const outputFile = "test-output-en.txt";
			const { stdout, exitCode } = await runCli([
				TEST_VIDEO_ID,
				"-o",
				outputFile,
				"-l",
				"en",
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Saved:");

			const outputPath = join(TEST_OUTPUT_DIR, outputFile);
			expect(existsSync(outputPath)).toBe(true);
		},
		{ timeout: 30000 },
	);

	test(
		"uses default filename based on video ID",
		async () => {
			const { stdout, exitCode } = await runCli([TEST_VIDEO_ID]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain(`${TEST_VIDEO_ID}.txt`);

			const outputPath = join(TEST_OUTPUT_DIR, `${TEST_VIDEO_ID}.txt`);
			expect(existsSync(outputPath)).toBe(true);
		},
		{ timeout: 30000 },
	);
});
