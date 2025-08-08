import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { chat, listModels, GithubModel, ChatMessage } from "../github";

interface ChatSession {
  id: string;
  name: string;
  model?: string;
  messages: ChatMessage[];
}

async function loadChats(): Promise<ChatSession[]> {
  const item = await LocalStorage.getItem("github_chats");
  return item ? (JSON.parse(item as string) as ChatSession[]) : [];
}

async function saveChats(chats: ChatSession[]): Promise<void> {
  await LocalStorage.setItem("github_chats", JSON.stringify(chats));
}

export default function GithubChatView() {
  const { data: models } = usePromise(listModels, []);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChats().then((c) => {
      if (c.length === 0) {
        const nc: ChatSession = { id: Date.now().toString(), name: "New Chat", messages: [] };
        setChats([nc]);
        setChatId(nc.id);
        saveChats([nc]);
      } else {
        setChats(c);
        setChatId(c[0].id);
      }
    });
  }, []);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const current = chats.find((c) => c.id === chatId);

  function updateChat(c: ChatSession) {
    setChats((prev) => prev.map((x) => (x.id === c.id ? c : x)));
  }

  async function send() {
    if (!current || !query || loading) return;
    const model = current.model || models?.[0]?.id;
    if (!model) return;
    const userMsg: ChatMessage = { role: "user", content: query };
    const newMessages = [...current.messages, userMsg];
    updateChat({ ...current, model, messages: newMessages });
    setQuery("");
    setLoading(true);
    try {
      const response = await chat(model, newMessages);
      const assistant: ChatMessage = { role: "assistant", content: response };
      const updated = { ...current, model, messages: [...newMessages, assistant] };
      if (updated.name === "New Chat") {
        const snippet = userMsg.content.substring(0, 25);
        updated.name = snippet + (userMsg.content.length > 25 ? "…" : "");
      }
      updateChat(updated);
    } catch (e: any) {
      updateChat({ ...current, messages: [...newMessages, { role: "assistant", content: String(e) }] });
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    const c: ChatSession = { id: Date.now().toString(), name: "New Chat", messages: [] };
    setChats((prev) => [c, ...prev]);
    setChatId(c.id);
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (chatId === id) setChatId(remaining[0]?.id);
      return remaining.length > 0 ? remaining : [{ id: Date.now().toString(), name: "New Chat", messages: [] }];
    });
  }

  const chatDropdown = (
    <List.Dropdown tooltip="Chat" value={chatId} onChange={setChatId}>
      {chats.map((c) => (
        <List.Dropdown.Item key={c.id} title={c.name} value={c.id} />
      ))}
    </List.Dropdown>
  );

  const modelDropdown = (
    <List.Dropdown
      tooltip="Model"
      onChange={(m) => current && updateChat({ ...current, model: m })}
      value={current?.model || models?.[0]?.id}
    >
      {models?.map((m: GithubModel) => (
        <List.Dropdown.Item key={m.id} title={m.name} value={m.id} />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={loading && (current?.messages.length ?? 0) === 0}
      searchBarAccessory={
        <>
          {chatDropdown}
          {modelDropdown}
        </>
      }
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Ask the model"
      actions={
        <ActionPanel>
          <Action title="Send" onAction={send} />
          <Action title="New Chat" icon={Icon.Plus} onAction={newChat} />
          {current && <Action title="Delete Chat" icon={Icon.Trash} onAction={() => deleteChat(current.id)} />}
        </ActionPanel>
      }
    >
      {current?.messages.map((m, idx) => (
        <List.Item key={idx} title={m.content} icon={m.role === "user" ? "👤" : "🤖"} />
      ))}
    </List>
  );
}
