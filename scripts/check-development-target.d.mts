export function parseDevelopmentUrl(value: string): URL | null;

export function matchesDevelopmentMetadata(
  url: URL,
  project: Record<string, unknown> | undefined,
  branch: Record<string, unknown> | undefined,
  endpoints: Record<string, unknown>[] | undefined,
): boolean;

export function checkDevelopmentTarget(
  urlValue: string,
  apiKey: string,
  fetcher?: (
    url: string,
    options: RequestInit,
  ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>,
  sql?: (url: URL, statement: string) => string,
): Promise<{
  state: "empty" | "ready" | "partial";
  endpoint: string;
  applied?: string[];
  missing?: string[];
}>;
