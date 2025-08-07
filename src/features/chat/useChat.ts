import { useEffect, useRef, useState } from "react";
import { chat } from "../../api/github-models";
import { ChatBody } from "../../api/types";
import { RaycastMessage, mapToApiMessages } from "../../lib/messages";

interface Options {
  token: string;
  model: string;
  organization?: string;
  streaming: boolean;
  temperature?: number;
  maxTokens?: number;
}

export function useChat(opts: Options) {
  const [messages, setMessages] = useState<RaycastMessage[]>([]);
  const abortRef = useRef<AbortController>();

  const send = async (content: string) => {
    const userMsg: RaycastMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    const body: ChatBody = {
      model: opts.model,
      messages: mapToApiMessages([...messages, userMsg]),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      stream: opts.streaming,
    };
    const controller = new AbortController();
    abortRef.current = controller;
    if (opts.streaming) {
      const stream = (await chat({ token: opts.token, organization: opts.organization, body, signal: controller.signal })) as AsyncIterable<string>;
      let acc = "";
      for await (const chunk of stream) {
        acc += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            last.content = acc;
          } else {
            copy.push({ role: "assistant", content: acc });
          }
          return copy;
        });
      }
    } else {
      const res = (await chat({ token: opts.token, organization: opts.organization, body, signal: controller.signal })) as { content: string };
      setMessages((prev) => [...prev, { role: "assistant", content: res.content }]);
    }
  };

  const cancel = () => abortRef.current?.abort();

  return { messages, send, cancel };
}
