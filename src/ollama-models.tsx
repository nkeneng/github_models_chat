import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Preferences } from "./lib/types";

interface GithubModel {
  id: string;
  name: string;
  publisher: string;
  registry: string;
  summary: string;
  html_url: string;
  version: string;
  capabilities?: string[];
  tags?: string[];
  rate_limit_tier?: string;
  limits?: { max_input_tokens: number; max_output_tokens: number };
  supported_input_modalities?: string[];
  supported_output_modalities?: string[];
}

export default function Command(): JSX.Element {
  const { githubToken } = getPreferenceValues<Preferences>();
  const [models, setModels] = useState<GithubModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;
    fetch("https://models.github.ai/catalog/models", { headers })
      .then((res) => res.json())
      .then((data) => {
        setModels(data);
        setIsLoading(false);
      })
      .catch((e) => {
        showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
        setIsLoading(false);
      });
  }, [githubToken]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models...">
      {models.map((m) => (
        <List.Item
          key={m.id}
          title={m.name}
          subtitle={m.publisher}
          accessories={m.rate_limit_tier ? [{ tag: m.rate_limit_tier }] : []}
          detail={
            <List.Item.Detail
              markdown={`### ${m.summary}\n\n[Open Model Page](${m.html_url})`}
              metadata={
                <List.Item.Detail.Metadata>
                  {m.capabilities && m.capabilities.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Capabilities">
                      {m.capabilities.map((c) => (
                        <List.Item.Detail.Metadata.TagList.Item key={c} text={c} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.tags && m.tags.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {m.tags.map((t) => (
                        <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Label title="Registry" text={m.registry} />
                  <List.Item.Detail.Metadata.Label title="Version" text={m.version} />
                  {m.limits && (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title="Max Input Tokens"
                        text={String(m.limits.max_input_tokens)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Max Output Tokens"
                        text={String(m.limits.max_output_tokens)}
                      />
                    </>
                  )}
                  {m.supported_input_modalities && m.supported_input_modalities.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Input">
                      {m.supported_input_modalities.map((i) => (
                        <List.Item.Detail.Metadata.TagList.Item key={i} text={i} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.supported_output_modalities && m.supported_output_modalities.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Output">
                      {m.supported_output_modalities.map((i) => (
                        <List.Item.Detail.Metadata.TagList.Item key={i} text={i} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
