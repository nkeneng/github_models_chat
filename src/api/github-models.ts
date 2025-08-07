import { ChatBody, ChatResponse, Model } from "./types";
import { streamLines } from "../lib/streaming";
import { GithubModelsError, handleResponseError } from "../lib/errors";

const CATALOG_URL = "https://models.github.ai/catalog/models"; // GitHub Models API Catalog
const INFERENCE_BASE = "https://models.github.ai"; // Run an inference request

const buildHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1000));
    return fetch(url, init);
  }
  return res;
}

export async function listModels(token: string): Promise<Model[]> {
  const res = await fetchWithRetry(CATALOG_URL, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw await handleResponseError(res);
  const data = (await res.json()) as { models: Model[] };
  return data.models;
}

interface ChatParams {
  token: string;
  organization?: string;
  body: ChatBody;
  signal?: AbortSignal;
}

export async function chat({
  token,
  organization,
  body,
  signal,
}: ChatParams): Promise<ChatResponse | AsyncIterable<string>> {
  const path = organization ? `/orgs/${organization}/v1/chat/completions` : `/v1/chat/completions`;
  const url = `${INFERENCE_BASE}${path}`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await handleResponseError(res);

  if (body.stream) {
    return streamLines(res);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return { content: json.choices?.[0]?.message?.content ?? "" };
}

export { GithubModelsError } from "../lib/errors";
