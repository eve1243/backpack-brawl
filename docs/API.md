# Backpack Brawl API

The local API is a small Express server in `server/index.js`. It listens on port 4200 (override with the `PORT` environment variable). During Vite development, `/api` is proxied to it, so the frontend uses relative URLs such as `/api/opponents?round=1`. All responses are JSON. The Hall of Fame lives in server memory. Restarting the API clears its entries.

## `GET /api/health`

Always answers immediately with status 200:

```json
{ "ok": true, "service": "backpack-brawl" }
```

## `GET /api/opponents`

Returns the opponent for one round of a run. The opponent table lives in `server/opponents.js`.

### Query parameters

| Parameter | Required | Meaning |
|---|---|---|
| `round` | yes | The 1-based round number. Must be a positive whole number written in digits (`1`, `2`, …). |
| `latency` | no | Response delay in milliseconds, clamped to 0–5000. Defaults to 1200. A value that is not a number falls back to the default. |
| `fail` | no | `fail=true` forces a 503 response (see below). |

### Success — 200

```json
{
  "id": "mossback-hermit",
  "name": "Mossback Hermit",
  "icon": "🐢",
  "hp": 25,
  "items": ["chipped-dagger", "pot-lid"],
  "round": 1
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier of the opponent |
| `name` | string | Display name |
| `icon` | string | Emoji shown in the battle view |
| `hp` | number | Maximum (and starting) HP |
| `items` | string[] | Item ids from the catalog in `src/items.ts`; the same id may appear several times |
| `round` | number | The round this opponent was requested for (echoes `round`) |

The response matches the `Opponent` type in `src/types.ts`.

The answer is deterministic: the same `round` always returns the same opponent. There is one hand-built opponent per round for rounds 1–7. Every round past the table returns the last opponent with +6 HP per additional round. The table never needs more than 7 rounds (5 wins + 3 lives − 1), and an opponent never carries more than 6 items, the size of the player's 2×3 backpack.

### Errors

Every error response has the shape:

```json
{ "error": "human-readable explanation" }
```

| Status | When | `error` |
|---|---|---|
| 400 | `round` is missing, not a whole number, or less than 1 | `round must be a positive whole number` |
| 503 | `fail=true`, or the server was started with `API_FAIL=true` | `The arena gates are shut. No challenger answered the call.` |

An invalid `round` is reported as 400 even when failure is forced. All responses from this endpoint, errors included, arrive after the configured delay.

## `POST /api/hall-of-fame`

Submits one finished run. The browser creates a version 4 UUID (`runId`) when the run starts and keeps it in the save. Send the same ID on every retry.

```sh
curl -i http://localhost:4200/api/hall-of-fame -H 'Content-Type: application/json' -d '{
  "runId": "80a25b64-d3ac-47ef-927a-eb243645cb11",
  "name": "Ada",
  "outcome": "victory",
  "wins": 5,
  "rounds": 6
}'
```

All five fields are required. The API trims the name and accepts 1–30 Unicode code points. Both counts must be JSON integers. A `victory` has exactly 5 wins in 5–7 rounds. A `defeat` has 0–4 wins and ends on the third loss, so `rounds` must equal `wins + 3`.

A new entry returns **201 Created**. The server stores the UUID in lowercase and assigns `createdAt` in UTC. An example response follows.

```json
{
  "runId": "80a25b64-d3ac-47ef-927a-eb243645cb11",
  "name": "Ada",
  "outcome": "victory",
  "wins": 5,
  "rounds": 6,
  "createdAt": "2026-11-26T08:30:00.000Z"
}
```

Repeating the request with the same ID, trimmed name and result returns **200 OK** with the original entry and timestamp. This lets the browser retry if the server saved the run but the response was lost.

| Status | When | Example response |
|---|---|---|
| 400 | Malformed JSON, missing or invalid fields, or an impossible result | `{"error":"A defeat requires 0 to 4 wins and exactly 3 losses."}` |
| 409 | An existing run ID is submitted with different, otherwise valid data | `{"error":"This run was already submitted with different data."}` |
| 413 | The request body exceeds the JSON parser's size limit | `{"error":"Request body is too large."}` |

## `GET /api/hall-of-fame`

```sh
curl -i http://localhost:4200/api/hall-of-fame
```

Returns **200 OK** with all entries in rank order. Victories come first, then more wins, then fewer rounds. For a complete tie, the entry first accepted by the server comes first. Array position determines rank, starting at 1. A fresh server returns `[]`.

The example submission produces a one-entry list.

```json
[
  {
    "runId": "80a25b64-d3ac-47ef-927a-eb243645cb11",
    "name": "Ada",
    "outcome": "victory",
    "wins": 5,
    "rounds": 6,
    "createdAt": "2026-11-26T08:30:00.000Z"
  }
]
```

## Environment variables

| Variable | Effect |
|---|---|
| `PORT` | Port to listen on (default 4200). The Vite proxy expects 4200. |
| `API_LATENCY` | Default delay in milliseconds for opponent requests without a `latency` parameter. |
| `API_FAIL` | `true` makes every opponent request fail with 503. |

Example: `API_FAIL=true pnpm server`.

## Client

`fetchOpponent(round)` in `src/api.ts` performs the request. It resolves with the `Opponent` on success and throws an `Error` carrying the server's `error` text (or a generic message with the status code) for any non-2xx response. When the API is not running, the Vite proxy answers with an error status of its own, which is reported the same way; a network failure rejects as well.
