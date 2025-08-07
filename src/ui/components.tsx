import { Detail } from "@raycast/api";
import { RaycastMessage } from "../lib/messages";

export function ChatTranscript({ messages }: { messages: RaycastMessage[] }) {
  const markdown = messages.map((m) => `**${m.role}:** ${m.content}`).join("\n\n");
  return <Detail markdown={markdown || ""} />;
}
