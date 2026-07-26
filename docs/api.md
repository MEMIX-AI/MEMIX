# memix API v1

Read-only, foundation-phase API for programmatic access to the library.
Free while it's a foundation — see [`acp-plan.md`](./acp-plan.md) for what
a paid layer on top of this could look like later. No endpoint here can
write anything; everything is a `GET`.

## Auth

Every `/api/v1/*` request needs an API key, sent as either:

```
Authorization: Bearer <key>
```

or

```
X-API-Key: <key>
```

Generate a key at `/my-uploads/api-key` (requires a connected wallet).
Keys are shown once at generation time and never stored in retrievable
form — if you lose it, generate a new one (this invalidates the old one;
one key per wallet for now).

**Rate limit:** `FREE_DEV` tier — 100 requests/day per key. A request over
the limit gets `429` with a plain-text reason. Paid tiers are TODO — not
implemented yet.

## Response shape

Every response is one of:

```json
{ "data": ..., "meta": { ... } }
```

```json
{ "error": "message" }
```

`meta` is only present on paginated endpoints.

## Endpoints

### `GET /api/v1/assets`

Search and browse assets.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Free-text search across title, description, tags |
| `type` | `IMAGE` \| `VIDEO` \| `SOUND` | — | Filter by type |
| `tag` | string | — | Filter by exact tag name |
| `page` | number | `1` | |
| `pageSize` | number | `20` | Max `50` |

```bash
curl -s "https://your-domain.example/api/v1/assets?q=fail&type=SOUND" \
  -H "Authorization: Bearer mxk_..."
```

```json
{
  "data": [
    {
      "id": "cmr...",
      "title": "sad-trombone-fail.mp3",
      "description": "...",
      "type": "SOUND",
      "fileUrl": "https://your-domain.example/api/storage/....mp3",
      "thumbnailUrl": null,
      "fileSize": 48213,
      "duration": null,
      "isOriginal": false,
      "featured": false,
      "downloadCount": 12,
      "tags": ["fail", "reaction"],
      "uploaderWallet": "0x...",
      "createdAt": "2026-07-20T12:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "pageSize": 20, "totalPages": 1 }
}
```

### `GET /api/v1/assets/:id`

A single asset. `404` with `{"error": "asset not found"}` if it doesn't
exist, isn't `ACTIVE`, or its uploader is banned (same visibility rule as
the public library pages).

```bash
curl -s "https://your-domain.example/api/v1/assets/cmr..." \
  -H "X-API-Key: mxk_..."
```

### `GET /api/v1/trending`

Currently-popular assets.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `limit` | number | `10` | Max `50` |
| `days` | number | — | Accepted but currently ignored — see note below |

```bash
curl -s "https://your-domain.example/api/v1/trending?limit=5" \
  -H "Authorization: Bearer mxk_..."
```

> **Note:** "trending" is a real rolling 7-day window (top downloads in the
> last 7 days), backed by a per-download log. `days` is accepted but fixed
> at 7 regardless of the value passed — not yet configurable.

### `GET /api/v1/assets/:id/download-url`

Returns the URL to fetch the actual file — a level of indirection so the
underlying storage location (local disk today, Supabase Storage later)
can change without breaking callers. Fetching the returned URL is what
increments the asset's download count, not this call.

```bash
curl -s "https://your-domain.example/api/v1/assets/cmr.../download-url" \
  -H "Authorization: Bearer mxk_..."
```

```json
{ "data": { "url": "https://your-domain.example/api/assets/cmr.../download", "expiresAt": null } }
```

## Errors

| Status | Meaning |
|---|---|
| `401` | Missing or invalid API key |
| `404` | Asset not found (or not publicly visible) |
| `429` | Daily rate limit reached for your tier |

```bash
# without a key
curl -s https://your-domain.example/api/v1/assets
# {"error":"missing API key — pass it as `Authorization: Bearer <key>` or `X-API-Key: <key>`"}

# with a bad key
curl -s https://your-domain.example/api/v1/assets -H "X-API-Key: not-a-real-key"
# {"error":"invalid API key"}
```
