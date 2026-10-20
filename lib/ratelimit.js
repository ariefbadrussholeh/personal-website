// In-memory sliding window. Good enough to slow a single abuser on one server
// instance; the database checks in each route are the second line of defence.
const buckets = (globalThis.__rateBuckets ??= new Map());

/** Records one hit for `key` and returns true when it exceeds `max` per `windowMs`. */
export function limited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return hits.length > max;
}
