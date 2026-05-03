export function tryParseJson<T = unknown>(text: string): {
  ok: true;
  value: T;
} | {
  ok: false;
  error: string;
} {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown JSON parse error",
    };
  }
}

