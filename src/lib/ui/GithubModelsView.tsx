import { Action, ActionPanel, Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React from "react";
import { listModels, GithubModel } from "../github";

export default function GithubModelsView() {
  const { data, isLoading } = usePromise(listModels, []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models">
      {data?.map((m: GithubModel) => (
        <List.Item
          key={m.id}
          title={m.name}
          subtitle={m.summary}
          accessories={[{ tag: m.publisher }, m.rate_limit_tier ? { tag: m.rate_limit_tier, color: Color.Blue } : {}]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={m.html_url} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {m.capabilities && m.capabilities.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Capabilities">
                      {m.capabilities.map((c) => (
                        <List.Item.Detail.Metadata.TagList.Item key={c} text={c} color={Color.Purple} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.supported_input_modalities && (
                    <List.Item.Detail.Metadata.TagList title="Input">
                      {m.supported_input_modalities.map((c) => (
                        <List.Item.Detail.Metadata.TagList.Item key={c} text={c} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.supported_output_modalities && (
                    <List.Item.Detail.Metadata.TagList title="Output">
                      {m.supported_output_modalities.map((c) => (
                        <List.Item.Detail.Metadata.TagList.Item key={c} text={c} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.tags && (
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {m.tags.map((t) => (
                        <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {m.limits && (
                    <>
                      {m.limits.max_input_tokens && (
                        <List.Item.Detail.Metadata.Label title="Max Input Tokens" text={String(m.limits.max_input_tokens)} />
                      )}
                      {m.limits.max_output_tokens && (
                        <List.Item.Detail.Metadata.Label title="Max Output Tokens" text={String(m.limits.max_output_tokens)} />
                      )}
                    </>
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
