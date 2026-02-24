# Qudoro Marketplace API Contract (Phase 1)

## Base
- Auth: Supabase JWT (Bearer token)
- Response format: JSON
- Timestamps: ISO 8601 UTC strings

## Models
- `shared_sets`
  - `id`, `author_id`, `slug`, `title`, `description`, `subject`, `tags[]`, `visibility`, `version`, `downloads_count`, `rating_avg`, `rating_count`, `created_at`, `updated_at`
- `shared_questions`
  - `id`, `set_id`, `remote_question_id`, `content`, `rationale`, `options[]`, `answers[]`, `tags[]`, `order_index`
- `set_versions`
  - `set_id`, `version`, `release_notes`, `snapshot`
- `set_downloads`
  - `set_id`, `user_id`, `downloaded_at`

## Endpoints

### `GET /discover`
Search marketplace sets.

Query params:
- `query?: string`
- `subject?: string`
- `tag?: string`
- `sort?: popular | new | rating`
- `page?: number` default `1`
- `pageSize?: number` default `12`

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "fundamentals-safety-priority-pack",
      "title": "Fundamentals Safety Priority Pack",
      "description": "...",
      "subject": "Fundamentals of Nursing",
      "tags": ["fundamentals", "priority"],
      "visibility": "public",
      "version": 3,
      "downloads": 1824,
      "ratingAverage": 4.8,
      "ratingCount": 233,
      "questionCount": 120,
      "createdAt": "2026-02-18T20:00:00.000Z",
      "updatedAt": "2026-02-18T20:00:00.000Z",
      "author": { "id": "uuid", "displayName": "Anna, RN" }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 12
}
```

### `GET /shared-sets/:id`
Get set detail for preview/import.

Response:
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "version": 3,
  "questions": [
    {
      "id": "uuid",
      "remoteQuestionId": "fund_1",
      "content": "...",
      "rationale": "...",
      "options": ["A", "B"],
      "answers": ["B"],
      "tags": ["priority"],
      "orderIndex": 1
    }
  ]
}
```

### `POST /shared-sets`
Publish a local set.

Body:
```json
{
  "title": "...",
  "description": "...",
  "subject": "Fundamentals of Nursing",
  "tags": ["fundamentals"],
  "visibility": "public",
  "questions": [
    {
      "remoteQuestionId": "local_q_1",
      "content": "...",
      "rationale": "...",
      "options": ["A", "B"],
      "answers": ["B"],
      "tags": ["tag"],
      "orderIndex": 1
    }
  ]
}
```

Response: `201` with created set summary.

### `PATCH /shared-sets/:id`
Author updates own set, increments `version` and appends `set_versions` snapshot.

### `POST /shared-sets/:id/import`
Records download/import analytics and returns latest version metadata.

Response:
```json
{
  "setId": "uuid",
  "version": 3,
  "downloadCount": 1825
}
```

### `GET /shared-sets/:id/updates?localVersion=2`
Checks if update exists for imported link.

Response:
```json
{
  "hasUpdate": true,
  "latestVersion": 3
}
```

## Import mapping rule (Phase 1)
- On import, client creates local set + local questions.
- Client stores local import link:
  - `remoteSetId`
  - `remoteVersion`
  - `localSetId`
  - `importedAt`
- When `remoteVersion > local remoteVersion`, show `Update available`.
