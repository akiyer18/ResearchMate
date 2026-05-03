export function encodeStringArray(values: string[]) {
  return JSON.stringify(values ?? []);
}

export function decodeStringArray(text: string | null | undefined) {
  if (!text) return [];
  try {
    const v = JSON.parse(text) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

