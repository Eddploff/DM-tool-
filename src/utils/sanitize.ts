/**
 * Pure helper utility to clean data structures for Firestore persistence.
 *
 * Firestore strictly rejects documents with `undefined` values anywhere in the object tree
 * (e.g. throws "Function updateDoc() called with invalid data. Unsupported field value: undefined").
 * This helper recursively removes undefined properties from objects and filters undefined
 * elements from arrays, ensuring all payloads sent to Firestore are 100% compliant.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}
