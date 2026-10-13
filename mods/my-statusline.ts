import type {ModApi} from '@commandcode/harness';
import {DatabaseSync, type StatementSync} from 'node:sqlite';
import {homedir} from 'node:os';
import {join} from 'node:path';

const DEFAULT_CONTEXT_LIMIT = 200000;

const DB_PATH = join(homedir(), '.commandcode', 'token_count.db');

const CONTEXT_WINDOWS: Record<string, number> = {
	'claude-sonnet-5-5': 1000000,
	'claude-sonnet-5': 1000000,
	'claude-sonnet-4-6': 1000000,
	'claude-fable-5-1': 1000000,
	'claude-fable-5': 1000000,
	'claude-opus-5-5': 1000000,
	'claude-opus-5': 1000000,
	'claude-opus-4-8': 1000000,
	'claude-opus-4-7': 1000000,
	'claude-haiku-5-5': 1000000,
	'claude-haiku-4-5-20251001': 200000,
	'gpt-6-astra': 1050000,
	'gpt-6.1-sol': 1050000,
	'gpt-6-sol': 1050000,
	'gpt-6-luna': 1050000,
	'gpt-5.6-sol': 1050000,
	'gpt-5.6-terra': 1050000,
	'gpt-5.6-luna': 1050000,
	'gpt-5.5': 400000,
	'gpt-5.4': 400000,
	'gpt-5.3-codex': 400000,
	'gpt-5.4-mini': 400000,
	'MiniMaxAI/MiniMax-M3-Free': 1000000,
	'MiniMaxAI/MiniMax-M3': 1000000,
	'MiniMaxAI/MiniMax-M2.5': 200000,
	'minimax/minimax-m3-free': 1000000,
	'minimax/minimax-m2.7-free': 197000,
	'deepseek/deepseek-v4-pro': 1000000,
	'deepseek/deepseek-v4-flash': 1000000,
	'deepseek/deepseek-v4-flash-vision-exp': 1000000,
	'deepseek/deepseek-v4-flash-fast': 1000000,
	'deepseek/deepseek-v4.1-flash': 1000000,
	'deepseek/deepseek-v4.1-flash-fast': 1000000,
	'moonshotai/Kimi-K3': 1000000,
	'moonshotai/Kimi-K2.7-Code': 256000,
	'moonshotai/Kimi-K2.7-Code-Highspeed': 262000,
	'moonshotai/Kimi-K2.6': 256000,
	'moonshotai/Kimi-K2.5': 256000,
	'zai-org/GLM-5.3': 1000000,
	'zai-org/GLM-5.2': 1000000,
	'zai-org/GLM-5.2-Fast': 1000000,
	'zai-org/GLM-5': 200000,
	'z-ai/glm-5.3-flash': 1048576,
	'z-ai/glm-5.3-flashx': 1000000,
	'xiaomi/mimo-v2.6-pro': 1048576,
	'xiaomi/mimo-v2.6-pro-ultraspeed': 1048576,
	'xiaomi/mimo-v2.6-flash': 1048576,
	'xiaomi/mimo-v2.5-pro': 1000000,
	'xiaomi/mimo-v2.5': 1000000,
	'Qwen/Qwen3.8-Max': 1000000,
	'Qwen/Qwen3.8-Max-0902': 1000000,
	'Qwen/Qwen3.8-Omni-Flash': 1000000,
	'Qwen/Qwen3.8-27B': 262144,
	'Qwen/Qwen3.8-Flash': 1000000,
	'Qwen/Qwen3.7-Max': 1000000,
	'Qwen/Qwen3.7-Plus': 1000000,
	'Qwen/Qwen3.7-Flash': 1000000,
	'meituan/LongCat-2.0': 1048576,
	'meituan/LongCat-2.0:free': 1048576,
	'stepfun/Step-5-Preview': 1000000,
	'stepfun/Step-3.7-Flash': 256000,
	'stepfun/Step-3.5-Flash': 262144,
	'tencent/hy4-preview': 1048576,
	'tencent/hy3-paid': 262144,
	'tencent/Hy3': 262144,
	'google/gemini-3.5-flash': 1000000,
	'google/gemini-3.6-flash': 1000000,
	'google/gemini-3.7-flash': 1048576,
	'google/gemini-3.8-flash': 1000000,
	'google/gemini-3.5-flash-lite': 1000000,
	'google/gemini-3.1-flash-lite': 1000000,
	'xai/grok-4.5': 500000,
	'xai/grok-4.6': 500000,
	'xai/grok-4.7': 500000,
	'mistral/mistral-large-4': 524288,
	'meta/muse-spark-1.1': 1048576,
	'meta/muse-spark-1.2': 1048576,
	'meta/muse-spark-1.2-contributor': 1048576,
	'meta/muse-spark-1.3': 1048576,
	'meta/muse-spark-1.3-contributor': 1048576,
	'nvidia/nemotron-3-ultra-550b-a55b': 1000000,
	'thinkingmachines/inkling': 256000,
	'thinkingmachines/inkling-small': 1000000,
	'sakana/fugu-ultra': 1000000,
	'poolside/laguna-s-2.1-free': 256000,
	'inclusionai/ling-3.0-flash-free': 256000,
	'inclusionai/ling-3.0-flash-sante:free': 262144,
	'inclusionai/ling-3.1-flash:free': 262144,
};

interface RawUsage {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	inputTokenDetails?: {
		noCacheTokens?: number;
		cacheReadTokens?: number;
		cacheWriteTokens?: number;
	};
}

function num(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readTokens(raw: unknown) {
	const usage = (raw ?? {}) as RawUsage;
	const details = usage.inputTokenDetails ?? {};
	const prompt = num(usage.inputTokens);
	const cacheRead = num(usage.cacheReadTokens ?? details.cacheReadTokens);
	const cacheWrite = num(usage.cacheWriteTokens ?? details.cacheWriteTokens);
	return {
		contextTokens: prompt,
		read: Math.max(0, prompt - cacheRead - cacheWrite),
		cacheRead,
		cacheWrite,
		output: num(usage.outputTokens),
	};
}

function humanize(value: number): string {
	if (value >= 1000000) {
		const m = Math.round(value / 100000) / 10;
		return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
	}
	if (value >= 1000) {
		const k = Math.round(value / 100) / 10;
		return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
	}
	return String(value);
}

export default function (cmd: ModApi): void {
	let start = 0;
	let chars = 0;
	let lastPaint = 0;

	let model = '';
	let effort = '';
	let tps: number | undefined;
	let contextPercent: number | undefined;
	let contextTokens = 0;
	let contextLimit = DEFAULT_CONTEXT_LIMIT;

	let inputTotal = 0;
	let cacheReadTotal = 0;
	let outputTotal = 0;
	let sessionId = '';

	const reset = () => {
		start = 0;
		chars = 0;
		tps = undefined;
		contextTokens = 0;
		contextPercent = undefined;
		inputTotal = 0;
		cacheReadTotal = 0;
		outputTotal = 0;
	};

	let db: DatabaseSync | undefined;
	let upsertStmt: StatementSync | undefined;
	let selectStmt: StatementSync | undefined;

	const openDb = () => {
		if (db) return;
		try {
			const database = new DatabaseSync(DB_PATH);
			database.exec(
				'CREATE TABLE IF NOT EXISTS token_counts (' +
					'session_id TEXT PRIMARY KEY, ' +
					'input_tokens INTEGER NOT NULL DEFAULT 0, ' +
					'cache_tokens INTEGER NOT NULL DEFAULT 0, ' +
					'output_tokens INTEGER NOT NULL DEFAULT 0)',
			);
			upsertStmt = database.prepare(
				'INSERT INTO token_counts (session_id, input_tokens, cache_tokens, output_tokens) ' +
					'VALUES (?, ?, ?, ?) ' +
					'ON CONFLICT(session_id) DO UPDATE SET ' +
					'input_tokens = excluded.input_tokens, ' +
					'cache_tokens = excluded.cache_tokens, ' +
					'output_tokens = excluded.output_tokens',
			);
			selectStmt = database.prepare(
				'SELECT input_tokens, cache_tokens, output_tokens FROM token_counts WHERE session_id = ?',
			);
			db = database;
		} catch {
			db = undefined;
		}
	};

	const persist = () => {
		if (!sessionId) return;
		openDb();
		try {
			upsertStmt?.run(sessionId, Math.round(inputTotal), Math.round(cacheReadTotal), Math.round(outputTotal));
		} catch {}
	};

	const loadSession = (id: string) => {
		reset();
		openDb();
		if (!selectStmt) return;
		try {
			const row = selectStmt.get(id) as
				| {input_tokens?: number; cache_tokens?: number; output_tokens?: number}
				| undefined;
			if (row) {
				inputTotal = row.input_tokens ?? 0;
				cacheReadTotal = row.cache_tokens ?? 0;
				outputTotal = row.output_tokens ?? 0;
			}
		} catch {}
	};

	const applyModel = (value: string) => {
		if (!value || value === model) return;
		model = value;
		contextLimit = CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_LIMIT;
		contextPercent =
			contextTokens > 0 ? Math.min(100, Math.round((contextTokens / contextLimit) * 100)) : undefined;
	};

	const syncSelection = (): boolean => {
		let changed = false;
		const currentModel = cmd.getModel?.();
		if (typeof currentModel === 'string' && currentModel && currentModel !== model) {
			applyModel(currentModel);
			changed = true;
		}
		const rawEffort = cmd.getEffort?.();
		const currentEffort = typeof rawEffort === 'string' ? rawEffort : '';
		if (currentEffort !== effort) {
			effort = currentEffort;
			changed = true;
		}
		return changed;
	};

	let pollTimer: ReturnType<typeof setInterval> | undefined;

	const startWatchingSelection = () => {
		if (pollTimer) return;
		pollTimer = setInterval(() => {
			if (syncSelection()) paint(true);
		}, 500);
	};

	const stopWatchingSelection = () => {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = undefined;
	};

	const line = (): string => {
		const head = model + (effort ? `/${effort}` : '');
		const rate = tps === undefined ? '— tok/s' : `${tps.toFixed(1)} tok/s`;
		const ctx =
			contextPercent === undefined
				? 'ctx —'
				: `ctx ${contextPercent}% (${humanize(contextTokens)}/${humanize(contextLimit)})`;
		const tokens = `i ${humanize(inputTotal)} · c ${humanize(cacheReadTotal)} · o ${humanize(outputTotal)}`;
		return [head || '—', rate, ctx, tokens].join('  │  ');
	};

	const paint = (force = false) => {
		if (!cmd.ui.capabilities.status) return;
		const now = Date.now();
		if (!force && now - lastPaint < 250) return;
		lastPaint = now;
		cmd.ui.setStatus(line());
	};

	cmd.on('session_start', () => {
		reset();
		syncSelection();
		startWatchingSelection();
		paint(true);
	});

	cmd.on('session_shutdown', () => stopWatchingSelection());

	cmd.on('config_setting_changed', event => {
		const e = event as {setting?: string; value?: unknown};
		if (e.setting === 'model') {
			if (typeof e.value === 'string') applyModel(e.value);
			syncSelection();
		} else if (e.setting === 'effort') {
			effort = typeof e.value === 'string' ? e.value : '';
		} else {
			return;
		}
		paint(true);
	});

	cmd.on('run_start', event => {
		const e = event as {sessionId?: string};
		if (typeof e.sessionId !== 'string') return;
		if (e.sessionId !== sessionId) {
			sessionId = e.sessionId;
			loadSession(sessionId);
			syncSelection();
			paint(true);
		}
	});

	cmd.on('model_request_start', event => {
		const e = event as {model?: string};
		if (typeof e.model === 'string' && e.model !== model) {
			model = e.model;
			effort = '';
		}
		start = Date.now();
		chars = 0;
		paint(true);
	});

	cmd.on('text_delta', event => {
		const e = event as {delta?: string};
		if (typeof e.delta === 'string') chars += e.delta.length;
		const approx = Math.round(chars / 4);
		const elapsed = Date.now() - start;
		tps = elapsed > 0 ? approx / (elapsed / 1000) : 0;
		paint();
	});

	cmd.on('model_request_end', event => {
		const e = event as {model?: string; effort?: string | null; usage?: unknown};
		if (typeof e.model === 'string') model = e.model;
		effort = typeof e.effort === 'string' ? e.effort : '';

		const tokens = readTokens(e.usage);
		const elapsed = Date.now() - start;
		tps = elapsed > 0 ? tokens.output / (elapsed / 1000) : 0;

		inputTotal += tokens.read;
		cacheReadTotal += tokens.cacheRead;
		outputTotal += tokens.output;

		contextTokens = tokens.contextTokens;
		contextLimit = CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_LIMIT;
		contextPercent = contextLimit > 0 ? Math.min(100, Math.round((contextTokens / contextLimit) * 100)) : 0;

		persist();
		paint(true);
	});

	cmd.on('run_end', () => persist());

	cmd.addCommand({
		name: 'statusline',
		description: 'Print the current status line (model, tok/s, context %, token totals)',
		handler: () => ({message: line()}),
	});

	cmd.hooks({
		onSessionEnd: () => {
			stopWatchingSelection();
			cmd.ui.setStatus(null);
		},
	});
}
