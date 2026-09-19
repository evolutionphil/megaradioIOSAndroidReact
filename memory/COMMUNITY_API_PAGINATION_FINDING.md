# Community public-profiles API limitation

Anonymous read-only requests to `https://api.themegaradio.com/api/public-profiles`:
- `limit=100`, `limit=200`, `limit=500`: all returned100 profiles.
- `page=2&limit=100`, `offset=100&limit=100`, `skip=100&limit=100`: same first/last IDs as page1.
- Envelope only `{data:[...]}`; no total/hasMore/cursor.
- `search=radio` did not behave like filtering the directory; no verified server-side
  search contract is available. Private profiles must remain excluded.

Client fixes: shared directory service, ID deduplication, visible refresh/errors,
future-compatible page loading, repeated-page detection and explicit limit message.
Following-status cache is namespaced by viewer account and pending requests are guarded.
Search is explicitly described as filtering loaded profiles, not proof an absent user
does not exist. The UI cannot retrieve records the API refuses to return.

Required external backend change (not implemented in this repo):
1. Stable sort plus cursor or offset/page pagination over public profiles only.
2. `{data, hasMore, nextCursor}` or `{data, page, totalPages}` metadata.
3. Defined search behavior and limit cap; apply search BEFORE pagination.
4. Exclude private accounts and do not expose email/private fields in directory payloads.

The external API server source is not present; the local FastAPI proxy cannot repair
the actual dataset/query. Do not report all Community users as restored until this is fixed.