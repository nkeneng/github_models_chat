import { ChatMessage } from "../api/types";

export interface RaycastMessage {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
}

export function mapToApiMessages(messages: RaycastMessage[]): ChatMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
