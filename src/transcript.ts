import type { CaptionTrack, TranscriptLine } from "./types.ts";

/**
 * An Innertube client used to request the `/player` endpoint.
 */
interface InnertubeClient {
	/** Short label for diagnostics */
	readonly label: string;
	/** Innertube numeric client id (X-YouTube-Client-Name) */
	readonly id: string;
	/** The `context.client` payload */
	readonly client: Readonly<Record<string, unknown>> & {
		readonly clientName: string;
		readonly clientVersion: string;
		readonly userAgent: string;
	};
}

/**
 * Non-web Innertube clients that still return full player responses (with
 * caption tracks) to anonymous requests, and whose caption URLs are not flagged
 * with the PoToken rollout experiment (`exp=xpe`/`xpv`). None requires a JS
 * player for signature deciphering. Mirrors the clients yt-dlp falls back to.
 *
 * They are tried in order; bot mitigation (`LOGIN_REQUIRED`) is IP/session
 * dependent, so a client that is blocked from one network often works from
 * another. IOS is listed first as it has proven the most broadly available.
 */
const PLAYER_CLIENTS: readonly InnertubeClient[] = [
	{
		label: "ios",
		id: "5",
		client: {
			clientName: "IOS",
			clientVersion: "21.02.3",
			deviceMake: "Apple",
			deviceModel: "iPhone16,2",
			userAgent:
				"com.google.ios.youtube/21.02.3 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
			osName: "iPhone",
			osVersion: "18.3.2.22D82",
			hl: "en",
			gl: "US",
		},
	},
	{
		label: "android_vr",
		id: "28",
		client: {
			clientName: "ANDROID_VR",
			clientVersion: "1.65.10",
			deviceMake: "Oculus",
			deviceModel: "Quest 3",
			androidSdkVersion: 32,
			userAgent:
				"com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
			osName: "Android",
			osVersion: "12L",
			hl: "en",
			gl: "US",
		},
	},
	{
		label: "tv",
		id: "7",
		client: {
			clientName: "TVHTML5",
			clientVersion: "7.20260114.12.00",
			userAgent:
				"Mozilla/5.0 (ChromiumStylePlatform) Cobalt/25.lts.30.1034943-gold (unlike Gecko), Unknown_TV_Unknown_0/Unknown (Unknown, Unknown)",
			hl: "en",
			gl: "US",
		},
	},
] as const;

/** Browser User-Agent used for the watch-page fallback */
const BROWSER_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Regular expressions for extracting video ID from various YouTube URL formats */
const VIDEO_ID_PATTERNS = [
	/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
	/^([a-zA-Z0-9_-]{11})$/,
] as const;

/** Regular expression for parsing legacy transcript XML */
const TRANSCRIPT_TEXT_PATTERN =
	/<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

/** HTML entity mappings for decoding */
const HTML_ENTITIES: Readonly<Record<string, string>> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&apos;": "'",
	"&#x27;": "'",
	"&#x2F;": "/",
	"&nbsp;": " ",
};

/**
 * Extracts video ID from a YouTube URL or raw video ID string.
 *
 * @param url - YouTube URL or video ID
 * @returns The extracted video ID, or null if not found
 *
 * @example
 * ```ts
 * extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"); // "dQw4w9WgXcQ"
 * extractVideoId("https://youtu.be/dQw4w9WgXcQ"); // "dQw4w9WgXcQ"
 * extractVideoId("dQw4w9WgXcQ"); // "dQw4w9WgXcQ"
 * ```
 */
export function extractVideoId(url: string): string | null {
	for (const pattern of VIDEO_ID_PATTERNS) {
		const match = url.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}
	return null;
}

/**
 * Reads the playability status from a player response.
 */
function getPlayabilityStatus(playerResponse: Record<string, unknown>): {
	status?: string;
	reason?: string;
} {
	return (
		(playerResponse.playabilityStatus as
			| { status?: string; reason?: string }
			| undefined) ?? {}
	);
}

/**
 * Fetches a player response from the Innertube `/player` endpoint using the
 * given client.
 *
 * @param videoId - The YouTube video ID
 * @param client - The Innertube client to impersonate
 * @returns The player response object
 * @throws Error if the request fails
 */
async function fetchPlayerViaInnertube(
	videoId: string,
	client: InnertubeClient,
): Promise<Record<string, unknown>> {
	const response = await fetch(
		"https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": client.client.userAgent,
				"X-YouTube-Client-Name": client.id,
				"X-YouTube-Client-Version": client.client.clientVersion,
				Origin: "https://www.youtube.com",
			},
			body: JSON.stringify({
				context: { client: client.client },
				videoId,
				contentCheckOk: true,
				racyCheckOk: true,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch video info: ${response.status}`);
	}

	return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Extracts the first balanced-brace JSON object that follows a marker.
 *
 * YouTube embeds the player response as `var ytInitialPlayerResponse = {...};`
 * inside the watch page HTML. A non-greedy regex cannot match this reliably
 * because the JSON contains nested braces and braces inside strings, so we
 * walk the text tracking brace depth and string/escape state.
 *
 * @param source - The HTML (or any text) to search
 * @param marker - The variable name preceding the JSON object
 * @returns The parsed object, or null if not found / not parseable
 */
function extractJsonAfterMarker(
	source: string,
	marker: string,
): Record<string, unknown> | null {
	const markerIndex = source.indexOf(marker);
	if (markerIndex < 0) {
		return null;
	}

	const start = source.indexOf("{", markerIndex);
	if (start < 0) {
		return null;
	}

	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = start; i < source.length; i++) {
		const char = source[i];

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
		} else if (char === "{") {
			depth++;
		} else if (char === "}") {
			depth--;
			if (depth === 0) {
				try {
					return JSON.parse(source.slice(start, i + 1)) as Record<
						string,
						unknown
					>;
				} catch {
					return null;
				}
			}
		}
	}

	return null;
}

/**
 * Fetches a player response by scraping the watch page (WEB client).
 *
 * Used as a fallback when the ANDROID_VR client is blocked. Note that caption
 * URLs obtained this way may carry the `exp=xpe` PoToken experiment flag, in
 * which case their bodies download empty without a PoToken.
 *
 * @param videoId - The YouTube video ID
 * @returns The player response object
 * @throws Error if the page cannot be fetched or the data cannot be located
 */
async function fetchPlayerViaWatchPage(
	videoId: string,
): Promise<Record<string, unknown>> {
	const response = await fetch(
		`https://www.youtube.com/watch?v=${videoId}&hl=en`,
		{
			headers: {
				"User-Agent": BROWSER_USER_AGENT,
				"Accept-Language": "en-US,en;q=0.9",
				// Skip the EU consent interstitial that would otherwise hide the data.
				Cookie: "CONSENT=YES+cb; SOCS=CAI",
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch video page: ${response.status}`);
	}

	const html = await response.text();
	const playerResponse = extractJsonAfterMarker(
		html,
		"ytInitialPlayerResponse",
	);
	if (!playerResponse) {
		throw new Error("Could not locate player data in the video page");
	}
	return playerResponse;
}

/** A player response together with the User-Agent that obtained it. */
interface PlayerSource {
	readonly player: Record<string, unknown>;
	readonly userAgent: string;
}

/**
 * Fetches a player response for a video that exposes caption tracks.
 *
 * Tries each Innertube client in turn (their caption URLs are PoToken-free and
 * need no JS player), then the watch page as a last resort. Returns the first
 * playable response that actually carries caption tracks; if none has captions
 * but some video is playable, that response is returned so the caller can
 * report "no captions" accurately.
 *
 * @param videoId - The YouTube video ID
 * @returns The player response and the User-Agent that obtained it
 * @throws Error if no source returns a playable response
 */
async function fetchPlayerResponse(videoId: string): Promise<PlayerSource> {
	const failures: string[] = [];
	let playableWithoutCaptions: PlayerSource | undefined;

	const attempts: Array<{
		label: string;
		userAgent: string;
		run: () => Promise<Record<string, unknown>>;
	}> = [
		...PLAYER_CLIENTS.map((client) => ({
			label: client.label,
			userAgent: client.client.userAgent,
			run: () => fetchPlayerViaInnertube(videoId, client),
		})),
		{
			label: "watch page",
			userAgent: BROWSER_USER_AGENT,
			run: () => fetchPlayerViaWatchPage(videoId),
		},
	];

	for (const attempt of attempts) {
		let player: Record<string, unknown>;
		try {
			player = await attempt.run();
		} catch (error) {
			failures.push(
				`${attempt.label}: ${error instanceof Error ? error.message : "error"}`,
			);
			continue;
		}

		const { status, reason } = getPlayabilityStatus(player);
		if (status && status !== "OK") {
			failures.push(`${attempt.label}: ${reason ?? status}`);
			continue;
		}

		const source: PlayerSource = { player, userAgent: attempt.userAgent };
		if (extractCaptionTracks(player).length > 0) {
			return source;
		}
		// Playable, but this client returned no caption list; keep looking.
		playableWithoutCaptions ??= source;
	}

	if (playableWithoutCaptions) {
		return playableWithoutCaptions;
	}

	throw new Error(
		`Video is not playable. ${failures.join("; ")}. ` +
			"YouTube may be requiring sign-in for these requests (bot mitigation); " +
			"this is often IP-dependent.",
	);
}

/**
 * Reads a human-readable name from a caption track's `name` field, which may
 * be either a `simpleText` value or a `runs` array depending on the source.
 */
function readTrackName(name: unknown): string | undefined {
	if (!name || typeof name !== "object") {
		return undefined;
	}
	const obj = name as {
		simpleText?: string;
		runs?: Array<{ text?: string }>;
	};
	return obj.simpleText ?? obj.runs?.[0]?.text ?? undefined;
}

/**
 * Extracts available caption tracks from player response data.
 *
 * @param playerResponse - The player response object from YouTube
 * @returns Array of available caption tracks
 */
export function extractCaptionTracks(
	playerResponse: Record<string, unknown>,
): CaptionTrack[] {
	const captions = playerResponse.captions as
		| Record<string, unknown>
		| undefined;
	if (!captions) {
		return [];
	}

	const playerCaptionsTracklistRenderer =
		captions.playerCaptionsTracklistRenderer as
			| Record<string, unknown>
			| undefined;
	if (!playerCaptionsTracklistRenderer) {
		return [];
	}

	const captionTracks = playerCaptionsTracklistRenderer.captionTracks as
		| Array<Record<string, unknown>>
		| undefined;
	if (!captionTracks) {
		return [];
	}

	return captionTracks.map((track) => {
		const kind = track.kind as string | undefined;
		const languageCode = track.languageCode as string;

		return {
			baseUrl: track.baseUrl as string,
			languageCode,
			name: readTrackName(track.name) ?? languageCode,
			isAutoGenerated: kind === "asr",
		};
	});
}

/**
 * Fetches the transcript for a caption track, preferring the structured
 * `json3` format and falling back to the legacy XML format.
 *
 * @param baseUrl - The caption track URL
 * @returns Array of parsed transcript lines
 * @throws Error if the request fails or the track returns no content
 */
async function fetchTranscript(
	baseUrl: string,
	userAgent: string,
): Promise<TranscriptLine[]> {
	const separator = baseUrl.includes("?") ? "&" : "?";

	// Request json3, but parse whatever actually comes back: mobile/VR clients
	// return timedtext format-3 XML (`<p t d>`) even when json3 is requested,
	// while the WEB client returns true json3.
	const preferred = await fetchCaptionText(
		`${baseUrl}${separator}fmt=json3`,
		userAgent,
	);
	const preferredLines = parseCaptions(preferred);
	if (preferredLines.length > 0) {
		return preferredLines;
	}

	// Fallback: the bare URL (default format).
	const fallback = await fetchCaptionText(baseUrl, userAgent);
	const fallbackLines = parseCaptions(fallback);
	if (fallbackLines.length > 0) {
		return fallbackLines;
	}

	throw new Error(
		"The caption track is listed but returned no content. This usually " +
			"means YouTube required a PoToken for this request (the caption URL " +
			"carried the rollout experiment flag). Retrying from a residential " +
			"network, where a non-web client is not bot-blocked, generally " +
			"resolves it.",
	);
}

/**
 * Fetches caption content from a URL.
 *
 * @param url - The caption URL (optionally with a format parameter)
 * @param userAgent - User-Agent matching the client that produced the URL
 * @returns The response body, or an empty string on a non-OK response
 */
async function fetchCaptionText(
	url: string,
	userAgent: string,
): Promise<string> {
	const response = await fetch(url, {
		headers: {
			"User-Agent": userAgent,
			"Accept-Language": "en-US,en;q=0.9",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch transcript: ${response.status}`);
	}

	return response.text();
}

/**
 * Parses caption content, auto-detecting the format.
 *
 * YouTube serves several caption formats depending on client and parameters:
 * json3 (`{events:[...]}`), timedtext format 3 (`<p t d>`), and the legacy
 * format (`<text start dur>`). This dispatches to the right parser.
 *
 * @param body - Raw caption response body
 * @returns Array of parsed transcript lines
 */
function parseCaptions(body: string): TranscriptLine[] {
	const trimmed = body.trimStart();
	if (!trimmed) {
		return [];
	}
	if (trimmed.startsWith("{")) {
		return parseJson3(body);
	}
	return parseTimedTextXml(body);
}

/**
 * Parses YouTube's `json3` caption format into structured data.
 *
 * The format is `{ events: [{ tStartMs, dDurationMs, segs: [{ utf8 }] }] }`.
 * Events without text segments (window/append directives) are skipped.
 *
 * @param json - Raw json3 string
 * @returns Array of parsed transcript lines
 */
function parseJson3(json: string): TranscriptLine[] {
	let data: { events?: Array<Record<string, unknown>> };
	try {
		data = JSON.parse(json) as { events?: Array<Record<string, unknown>> };
	} catch {
		return [];
	}

	const events = data.events ?? [];
	const lines: TranscriptLine[] = [];

	for (const event of events) {
		const segs = event.segs as Array<{ utf8?: string }> | undefined;
		if (!segs) {
			continue;
		}

		const text = segs
			.map((seg) => seg.utf8 ?? "")
			.join("")
			.trim();
		if (!text) {
			continue;
		}

		const startMs = (event.tStartMs as number | undefined) ?? 0;
		const durationMs = (event.dDurationMs as number | undefined) ?? 0;

		lines.push({
			text,
			start: startMs / 1000,
			duration: durationMs / 1000,
		});
	}

	return lines;
}

/**
 * Parses YouTube timedtext XML into structured data.
 *
 * Handles two XML shapes:
 *   - Format 3: `<p t="ms" d="ms">text</p>` (times in milliseconds; text may
 *     contain inner `<s>` word-timing segments which are flattened).
 *   - Legacy:   `<text start="s" dur="s">text</text>` (times in seconds).
 *
 * @param xml - Raw timedtext XML
 * @returns Array of parsed transcript lines
 */
function parseTimedTextXml(xml: string): TranscriptLine[] {
	const lines: TranscriptLine[] = [];

	// Format 3: <p t="..." d="...">...</p>
	for (const match of xml.matchAll(/<p\b([^>]*)>(.*?)<\/p>/gs)) {
		const attrs = match[1] ?? "";
		const t = /\bt="([^"]*)"/.exec(attrs)?.[1];
		if (t === undefined) {
			// <p> without a timestamp is a window/style definition; skip it.
			continue;
		}
		const d = /\bd="([^"]*)"/.exec(attrs)?.[1] ?? "0";
		// Strip inner tags (e.g. <s> word segments) and decode entities.
		const text = decodeHtmlEntities(
			(match[2] ?? "").replace(/<[^>]+>/g, ""),
		).trim();
		if (!text) {
			continue;
		}
		lines.push({
			text,
			start: Number.parseInt(t, 10) / 1000,
			duration: Number.parseInt(d, 10) / 1000,
		});
	}
	if (lines.length > 0) {
		return lines;
	}

	// Legacy: <text start="..." dur="...">...</text>
	for (const match of xml.matchAll(TRANSCRIPT_TEXT_PATTERN)) {
		const start = Number.parseFloat(match[1] ?? "0");
		const duration = Number.parseFloat(match[2] ?? "0");
		const text = decodeHtmlEntities(match[3] ?? "");

		lines.push({ text, start, duration });
	}

	return lines;
}

/**
 * Decodes HTML entities in a string.
 *
 * @param text - Text containing HTML entities
 * @returns Decoded text
 */
function decodeHtmlEntities(text: string): string {
	let result = text;

	for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
		result = result.replaceAll(entity, char);
	}

	// Decode numeric character references (decimal)
	result = result.replace(/&#(\d+);/g, (_, code) =>
		String.fromCharCode(Number.parseInt(code, 10)),
	);

	// Decode numeric character references (hexadecimal)
	result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
		String.fromCharCode(Number.parseInt(code, 16)),
	);

	return result;
}

/**
 * Selects the best matching caption track based on language preference.
 *
 * @param tracks - Available caption tracks
 * @param preferredLang - Preferred language code (optional)
 * @returns The selected caption track, or null if none available
 * @throws Error if preferred language is not found
 */
function selectTrack(
	tracks: CaptionTrack[],
	preferredLang?: string,
): CaptionTrack | null {
	if (tracks.length === 0) {
		return null;
	}

	if (preferredLang) {
		// Exact match
		const exact = tracks.find((t) => t.languageCode === preferredLang);
		if (exact) return exact;

		// Prefix match (e.g., "en" matches "en-US")
		const partial = tracks.find((t) =>
			t.languageCode.startsWith(`${preferredLang}-`),
		);
		if (partial) return partial;

		throw new Error(
			`Language "${preferredLang}" not found. Use --list-langs to see available languages.`,
		);
	}

	// Prefer manually created captions over auto-generated
	const manual = tracks.find((t) => !t.isAutoGenerated);
	if (manual) return manual;

	return tracks[0] ?? null;
}

/**
 * Fetches the transcript for a YouTube video.
 *
 * @param videoId - The YouTube video ID
 * @param lang - Preferred language code (optional)
 * @returns Array of transcript lines
 * @throws Error if no captions are available or fetch fails
 *
 * @example
 * ```ts
 * const transcript = await getTranscript("dQw4w9WgXcQ", "en");
 * for (const line of transcript) {
 *   console.log(`[${line.start}] ${line.text}`);
 * }
 * ```
 */
export async function getTranscript(
	videoId: string,
	lang?: string,
): Promise<TranscriptLine[]> {
	const { player, userAgent } = await fetchPlayerResponse(videoId);
	const tracks = extractCaptionTracks(player);

	if (tracks.length === 0) {
		throw new Error("No captions available for this video");
	}

	const track = selectTrack(tracks, lang);
	if (!track) {
		throw new Error("No caption track available");
	}

	return fetchTranscript(track.baseUrl, userAgent);
}

/**
 * Lists all available caption tracks for a YouTube video.
 *
 * @param videoId - The YouTube video ID
 * @returns Array of available caption tracks
 *
 * @example
 * ```ts
 * const tracks = await listAvailableTracks("dQw4w9WgXcQ");
 * for (const track of tracks) {
 *   console.log(`${track.languageCode}: ${track.name}`);
 * }
 * ```
 */
export async function listAvailableTracks(
	videoId: string,
): Promise<CaptionTrack[]> {
	const { player } = await fetchPlayerResponse(videoId);
	return extractCaptionTracks(player);
}
