import { describe, expect, test } from "bun:test";
import { parseArgs } from "./cli.ts";

describe("parseArgs", () => {
	test("parses URL argument", () => {
		const options = parseArgs(["https://youtube.com/watch?v=abc"]);
		expect(options.url).toBe("https://youtube.com/watch?v=abc");
	});

	test("parses help flag", () => {
		expect(parseArgs(["-h"]).help).toBe(true);
		expect(parseArgs(["--help"]).help).toBe(true);
	});

	test("parses version flag", () => {
		expect(parseArgs(["-v"]).version).toBe(true);
		expect(parseArgs(["--version"]).version).toBe(true);
	});

	test("parses output option", () => {
		const options = parseArgs(["url", "-o", "output.txt"]);
		expect(options.output).toBe("output.txt");
	});

	test("parses output option with long form", () => {
		const options = parseArgs(["url", "--output", "output.txt"]);
		expect(options.output).toBe("output.txt");
	});

	test("parses lang option", () => {
		const options = parseArgs(["url", "-l", "ja"]);
		expect(options.lang).toBe("ja");
	});

	test("parses lang option with long form", () => {
		const options = parseArgs(["url", "--lang", "en"]);
		expect(options.lang).toBe("en");
	});

	test("parses list-langs flag", () => {
		const options = parseArgs(["url", "--list-langs"]);
		expect(options.listLangs).toBe(true);
	});

	test("parses format option", () => {
		expect(parseArgs(["url", "-f", "txt"]).format).toBe("txt");
		expect(parseArgs(["url", "-f", "srt"]).format).toBe("srt");
		expect(parseArgs(["url", "-f", "json"]).format).toBe("json");
	});

	test("parses format option with long form", () => {
		const options = parseArgs(["url", "--format", "srt"]);
		expect(options.format).toBe("srt");
	});

	test("parses timestamps flag", () => {
		expect(parseArgs(["url", "-t"]).timestamps).toBe(true);
		expect(parseArgs(["url", "--timestamps"]).timestamps).toBe(true);
	});

	test("parses multiple options", () => {
		const options = parseArgs([
			"https://youtube.com/watch?v=abc",
			"-o",
			"out.srt",
			"-l",
			"ja",
			"-f",
			"srt",
			"-t",
		]);

		expect(options.url).toBe("https://youtube.com/watch?v=abc");
		expect(options.output).toBe("out.srt");
		expect(options.lang).toBe("ja");
		expect(options.format).toBe("srt");
		expect(options.timestamps).toBe(true);
	});

	test("returns default values", () => {
		const options = parseArgs(["url"]);
		expect(options.format).toBe("txt");
		expect(options.timestamps).toBe(false);
		expect(options.listLangs).toBe(false);
		expect(options.help).toBe(false);
		expect(options.version).toBe(false);
		expect(options.output).toBeUndefined();
		expect(options.lang).toBeUndefined();
	});

	test("throws error for unknown option", () => {
		expect(() => parseArgs(["--unknown"])).toThrow("Unknown option: --unknown");
	});

	test("throws error for missing output filename", () => {
		expect(() => parseArgs(["-o"])).toThrow("--output requires a filename");
	});

	test("throws error for missing lang code", () => {
		expect(() => parseArgs(["-l"])).toThrow("--lang requires a language code");
	});

	test("throws error for invalid format", () => {
		expect(() => parseArgs(["-f", "invalid"])).toThrow(
			"--format must be one of: txt, srt, json",
		);
	});

	test("throws error for missing format value", () => {
		expect(() => parseArgs(["-f"])).toThrow(
			"--format must be one of: txt, srt, json",
		);
	});
});
