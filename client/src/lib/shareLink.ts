/**
 * Ledger Light — read-only query links.
 *
 * A link deliberately carries only the SQL draft in its query string. It never
 * contains browser-local workspaces, history, credentials, or result data.
 */

const SHARED_QUERY_PARAM = "q";
export const MAX_SHARED_QUERY_LENGTH = 6_000;
export const CAUTION_SHARED_URL_LENGTH = 1_800;

export interface SharedQueryLinkDetails {
  url: string;
  length: number;
  needsCaution: boolean;
}

function normalizeSharedQuery(value: string | null): string | null {
  const query = value?.trim() ?? "";
  return query.length > 0 && query.length <= MAX_SHARED_QUERY_LENGTH ? query : null;
}

export function createSharedQueryUrl(sql: string, baseUrl: string): string {
  const query = normalizeSharedQuery(sql);
  if (!query) {
    throw new Error("Write a query before creating a share link.");
  }

  const url = new URL(baseUrl);
  url.searchParams.set(SHARED_QUERY_PARAM, query);
  return url.toString();
}

export function getSharedQueryLinkDetails(sql: string, baseUrl: string): SharedQueryLinkDetails {
  const url = createSharedQueryUrl(sql, baseUrl);
  return { url, length: url.length, needsCaution: url.length > CAUTION_SHARED_URL_LENGTH };
}

export function readSharedQueryFromUrl(url: string): string | null {
  try {
    return normalizeSharedQuery(new URL(url).searchParams.get(SHARED_QUERY_PARAM));
  } catch {
    return null;
  }
}

export function removeSharedQueryFromUrl(url: string): string {
  const next = new URL(url);
  next.searchParams.delete(SHARED_QUERY_PARAM);
  return next.toString();
}

export async function copySharedQueryLink(sql: string, baseUrl: string): Promise<string> {
  const url = createSharedQueryUrl(sql, baseUrl);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable. Copy the address from your browser instead.");
  }
  await navigator.clipboard.writeText(url);
  return url;
}
