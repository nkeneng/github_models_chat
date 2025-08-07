import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useState } from "react";
import { chat, listModels, GithubModel } from "../github";

export default function GithubChatView() {
  const { data: models } = usePromise(listModels, []);
  const [model, setModel] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!query) return;
    const m = model || models?.[0]?.id;
    if (!m) return;
    const newMessages = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);
    try {
      const response = await chat(m, newMessages.map((x) => x));
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: String(e) }]);
    } finally {
      setLoading(false);
    }
  }

  function dropdown() {
    return (
      <List.Dropdown tooltip="Model" onChange={setModel} defaultValue={model || models?.[0]?.id}>
        {models?.map((m: GithubModel) => (
          <List.Dropdown.Item key={m.id} title={m.name} value={m.id} />
        ))}
      </List.Dropdown>
    );
  }

  return (
    <List
      isLoading={loading && messages.length === 0}
      searchBarAccessory={dropdown()}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Ask the model"
      actions={
        <ActionPanel>
          <Action title="Send" onAction={send} />
        </ActionPanel>
      }
    >
      {messages.map((m, idx) => (
        <List.Item key={idx} title={m.content} icon={m.role === "user" ? "👤" : "🤖"} />
      ))}
    </List>
  );
}
