# My Command Code Settings

Personal Command Code customization.

## Default settings (`settings.json`)

- No git co-author signature: `"attribution": { "commit": "" }`
- YOLO by default: `"permissions": { "defaultMode": "yolo" }`

## Custom statusline (`mods/my-statusline.ts`)

Live status line mod showing model, generation speed, context usage, and session token totals:

```
model/effort  │  12.4 tok/s  │  ctx 34% (68k/200k)  │  i 18.9k · c 72.9k · o 741
```

- `model/effort` — active model plus reasoning effort, if set
- `tok/s` — live estimate while streaming, exact value on request end
- `ctx` — context usage as % of the model's window (`CONTEXT_WINDOWS` table, 200k fallback)
- `i · c · o` — session totals for uncached input, cache reads, and output
- Totals persist per session in `~/.commandcode/token_count.db` (SQLite via `node:sqlite`), so counts survive restarts
- `/statusline` prints the current line on demand

See [`mods/README.md`](mods/README.md) for implementation details.
