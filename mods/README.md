# my-statusline.ts — Command Code status line mod

This mod is a live **status line** for Command Code's UI — it renders a persistent single line showing which model is running, how fast it's generating, how full the context window is, and cumulative token spend.

**What it displays** (`line()`):
```
model/effort  │  12.4 tok/s  │  ctx 34% (68k/200k)  │  i 18.9k · c 72.9k · o 741
```
— model name (plus reasoning effort if set), generation speed, context usage as a percentage of the model's window (with humanized used/limit), and session totals for uncached input (`i`), cache reads (`c`), and output (`o`).

**How it works:**
- **Event-driven**: hooks into `model_request_start` (captures model + start time), `text_delta` (estimates tok/s live from `chars/4`), and `model_request_end` (replaces the estimate with accurate tok/s from reported output tokens, computes context % against `CONTEXT_WINDOWS` — a hardcoded per-model table, falling back to 200k).
- **Token accounting**: `readTokens` splits the `usage` payload into uncached read / cache-read / cache-write, so totals separate fresh input from cached input.
- **Rendering**: `paint` throttles `cmd.ui.setStatus` to 4 updates/sec so streaming doesn't flood the terminal; `/statusline` prints the same line as a message; `onSessionEnd` clears the bar.

**Persistence with SQLite3**: rather than losing counts when the process exits, the mod uses Node's built-in **`node:sqlite` (`DatabaseSync`)** to store cumulative totals in `~/.commandcode/token_count.db`. It lazily creates the DB and a `token_counts` table (`session_id` primary key + `input_tokens`, `cache_tokens`, `output_tokens`), then:
- **upserts** totals after every `model_request_end` and at `run_end` (`ON CONFLICT(session_id) DO UPDATE`), and
- **restores** them via `loadSession` whenever `run_start` reports a new `session_id` (e.g. resuming a session after restart).

So token counts survive restarts and are tracked **per session**. All DB errors are swallowed (`try/catch` → `db = undefined`), so if SQLite is unavailable the status line still works, just without persistence.
