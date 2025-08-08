import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export interface GithubModel {
  id: string;
  name: string;
  publisher: string;
  summary: string;
  html_url: string;
  version: string;
  capabilities?: string[];
  limits?: { max_input_tokens?: number; max_output_tokens?: number };
  supported_input_modalities?: string[];
  supported_output_modalities?: string[];
  tags?: string[];
  rate_limit_tier?: string;
}

function headers() {
  const { githubToken } = getPreferenceValues<Preferences>();
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  } as Record<string, string>;
}

export async function listModels(signal?: AbortSignal): Promise<GithubModel[]> {
  const res = await fetch("https://models.github.ai/catalog/models", {
    headers: headers(),
    signal,
  });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }
  return (await res.json()) as GithubModel[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chat(model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
}
