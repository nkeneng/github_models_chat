import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Preferences } from "./lib/types";

interface GithubModel {
  id: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Command(): JSX.Element {
  const { githubToken } = getPreferenceValues<Preferences>();
  const [models, setModels] = useState<GithubModel[]>([]);
  const [model, setModel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;
    fetch("https://models.github.ai/catalog/models", { headers })
      .then((res) => res.json())
      .then((data: GithubModel[]) => {
        setModels(data);
        if (data.length > 0) setModel(data[0].id);
      })
      .catch((e) => showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) }));
  }, [githubToken]);

  async function send() {
    if (!query) return;
    if (!model) {
      await showToast({ style: Toast.Style.Failure, title: "No model selected" });
      return;
    }
    setIsLoading(true);
    const body = {
      model: model,
      messages: [...messages, { role: "user" as const, content: query }],
    };
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;
    try {
      const res = await fetch("https://models.github.ai/inference/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const answer = data.choices && data.choices[0].message.content;
      setMessages((prev) => [...prev, { role: "user", content: query }, { role: "assistant", content: answer }]);
      setQuery("");
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Ask something..."
      actions={
        <ActionPanel>
          <Action title="Send" onAction={send} icon={Icon.PaperPlane} shortcut={{ modifiers: ["cmd"], key: "return" }} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Model" value={model} onChange={setModel}>
          {models.map((m) => (
            <List.Dropdown.Item key={m.id} title={m.name} value={m.id} />
          ))}
        </List.Dropdown>
      }
    >
      {messages.map((m, idx) => (
        <List.Item key={idx} title={m.content} icon={m.role === "user" ? Icon.Person : Icon.Hammer} />
      ))}
    </List>
  );
}
