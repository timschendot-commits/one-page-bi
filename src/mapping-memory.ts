// Keep header names only. When a schema changes, propose a fresh mapping.
function key(scope: string, headers: string[]) {
  return "onepagebi.mapping.v1:" + JSON.stringify([scope, [...headers].sort()]);
}
export function recall<M extends Record<string, number | null>>(
  scope: string,
  headers: string[],
  suggested: M,
): M {
  try {
    const raw = localStorage.getItem(key(scope, headers));
    if (!raw) return suggested;
    const saved = JSON.parse(raw);
    const next = { ...suggested } as Record<string, number | null>;
    for (const field of Object.keys(next)) {
      if (!(field in saved)) return suggested;
      if (saved[field] === null) next[field] = null;
      else {
        const index = headers.indexOf(saved[field]);
        if (index < 0) return suggested;
        next[field] = index;
      }
    }
    return next as M;
  } catch {
    return suggested;
  }
}
export function remember(
  scope: string,
  headers: string[],
  mapping: Record<string, number | null>,
) {
  try {
    localStorage.setItem(
      key(scope, headers),
      JSON.stringify(
        Object.fromEntries(
          Object.entries(mapping).map(([k, v]) => [
            k,
            v === null ? null : headers[v],
          ]),
        ),
      ),
    );
  } catch {
    /* Validation still works if storage is unavailable. */
  }
}
export function readOptions(
  scope: string,
  headers: string[],
  defaults: { dmy: boolean; description: boolean },
) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key(scope + ".options", headers)) ?? "null",
    );
    return saved &&
      typeof saved.dmy === "boolean" &&
      typeof saved.description === "boolean"
      ? { dmy: saved.dmy, description: saved.description }
      : defaults;
  } catch {
    return defaults;
  }
}
export function saveOptions(
  scope: string,
  headers: string[],
  dmy: boolean,
  description: boolean,
) {
  try {
    localStorage.setItem(
      key(scope + ".options", headers),
      JSON.stringify({ dmy, description }),
    );
  } catch {
    /* Storage is optional. */
  }
}
