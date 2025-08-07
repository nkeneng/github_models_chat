import { ActionPanel, Form, Action, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { useChat } from "./useChat";

interface Preferences {
  githubToken: string;
  defaultModel: string;
  organization?: string;
  streaming: boolean;
  temperature: number;
  maxTokens?: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const { messages, send, cancel } = useChat({
    token: prefs.githubToken,
    model: prefs.defaultModel,
    organization: prefs.organization,
    streaming: prefs.streaming,
    temperature: prefs.temperature,
    maxTokens: prefs.maxTokens ? Number(prefs.maxTokens) : undefined,
  });
  const [input, setInput] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Send"
            onAction={() => {
              send(input);
              setInput("");
            }}
          />
          <Action title="Cancel" onAction={cancel} />
        </ActionPanel>
      }
    >
      <Form.Description text={messages.map((m) => `${m.role}: ${m.content}`).join("\n")} />
      <Form.TextArea id="prompt" title="Prompt" value={input} onChange={setInput} />
    </Form>
  );
}
