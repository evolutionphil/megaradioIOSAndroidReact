/** Match installed Wouter's query-before-hash navigation, including direct links. */
export function normalizeHashQuery() {
  const queryAt = window.location.hash.indexOf('?');
  if (queryAt < 0) return;
  const url = new URL(window.location.href);
  const hashQuery = new URLSearchParams(url.hash.slice(queryAt + 1));
  hashQuery.forEach((value, key) => url.searchParams.set(key, value));
  url.hash = url.hash.slice(0, queryAt);
  window.history.replaceState(window.history.state, '', url.href);
}