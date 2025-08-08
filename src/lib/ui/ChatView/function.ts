import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { Document } from "langchain/document";
import * as React from "react";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { OllamaApiChatMessage, OllamaApiTagsResponseModel } from "../../ollama/types";
import { AddSettingsCommandChat, GetSettingsCommandChatByIndex } from "../../settings/settings";
import { RaycastChat } from "../../settings/types";
import { Preferences, RaycastImage } from "../../types";
import { GetAvailableModel, PromptTokenParser } from "../function";
import { McpServerConfig, McpToolInfo } from "../../mcp/types";
import { McpClientMultiServer } from "../../mcp/mcp";
import { PromptContext } from "./type";
import { chatCompletion, GitHubChatMessage } from "../../github/api";
import "../../polyfill/node-fetch";

const preferences = getPreferenceValues<Preferences>();

let McpClient: McpClientMultiServer;

/**
 * Set Chat by given index.
 * @param i - index.
 * @param setChat - React SetChat Function.
 * @param setChatModelsAvailable - React SetChatModelsAvailabel Function.
 * @param setShowFormModel = React SetShowFormModel Function.
 */
export async function ChangeChat(
  i: number,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>,
  setShowFormModel: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  const c = await GetSettingsCommandChatByIndex(i).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setShowFormModel(true);
    return;
  });
  if (!c) return;
  const vi = await VerifyChatModelInstalled(
    c.models.main.server_name,
    c.models.main.tag,
    c.models.embedding?.server_name,
    c.models.embedding?.tag,
    c.models.vision?.server_name,
    c.models.vision?.tag
  ).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setChatModelsAvailable(false);
  });
  setChat(c);
  if (vi) setChatModelsAvailable(true);
}

/**
 * Verify if configured model are stiil installed on eatch server.
 * @param ms - Main Model Server Name
 * @param mt - Main Model Tag
 * @param es - Embedding Model Server Name
 * @param et - Embedding Model Tag
 * @param vs - Vision Model Server Name
 * @param vt - Vision Model Tag
 * @returns Return `true` if all configured model are installed.
 */
async function VerifyChatModelInstalled(
  ms: string,
  mt: string,
  es?: string,
  et?: string,
  vs?: string,
  vt?: string
): Promise<boolean> {
  const am: Map<string, OllamaApiTagsResponseModel[]> = new Map();
  am.set(ms, await GetAvailableModel(ms));
  if ((am.get(ms) as OllamaApiTagsResponseModel[]).filter((v) => v.name === mt).length === 0) return false;
  if (es && et && !am.has(es)) am.set(es, await GetAvailableModel(es));
  if (es && et && (am.get(es) as OllamaApiTagsResponseModel[]).filter((v) => v.name === et).length === 0) return false;
  if (vs && vt && !am.has(vs)) am.set(vs, await GetAvailableModel(vs));
  if (vs && vt && (am.get(vs) as OllamaApiTagsResponseModel[]).filter((v) => v.name === vt).length === 0) return false;
  return true;
}

/**
 * Create New Empty Conversation.
 * @param chat - Selected Chat, used for copy models settings.
 * @param setChatNameIndex - React SetChatNameIndex Function.
 * @param revalidate - React RevalidateChatNames Function.
 */
export async function NewChat(
  chat: RaycastChat,
  setChatNameIndex: React.Dispatch<React.SetStateAction<number>>,
  revalidate: () => Promise<string[]>
): Promise<void> {
  const cn: RaycastChat = {
    name: "New Chat",
    models: chat.models,
    messages: [],
  };
  await AddSettingsCommandChat(cn);
  await revalidate().then(() => setChatNameIndex(0));
}

/**
 * Set Clipboard
 * @return
 */
export function ClipboardConversation(chat?: RaycastChat): string {
  let clipboard = "";
  if (chat) {
    chat.messages.map(
      (value) => (clipboard += `Question:\n${value.messages[0].content}\n\nAnswer:${value.messages[1].content}\n\n`)
    );
  }
  return clipboard;
}

/**
 * Get Messages for Inference with Context data.
 * @param chat.
 * @param query - User Prompt.
 * @param image.
 * @param context.
 */
function GetMessagesForInference(
  chat: RaycastChat,
  query: string,
  image?: RaycastImage[],
  context?: PromptContext
): OllamaApiChatMessage[] {
  const messages: OllamaApiChatMessage[] = [];

  /* Slice Messages */
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => messages.push(...v.messages));

  /* Create Prompt */
  let content = query;
  if (context && (context.tools || context.documents)) {
    content = `Respond to the user's prompt using the provided context information. Cite sources with url when available.\nUser Prompt: '${query}'`;
    if (context.tools) content += `Context from Tools Calling: '${context.tools.data}'\n`;
    if (context.documents) content += `Context from Documents: ${context.documents}\n`;
  }

  /* Add User Query */
  messages.push({
    role: OllamaApiChatMessageRole.USER,
    content: content,
    images: image && image.map((i) => i.base64),
  });

  return messages;
}

/**
 * Initialize McpClient.
 */
async function InitMcpClient(): Promise<void> {
  const mcpServerConfigRaw = await LocalStorage.getItem<string>("mcp_server_config");
  if (!mcpServerConfigRaw) throw "Mcp Servers are not configured";
  const mcpServerConfig: McpServerConfig = JSON.parse(mcpServerConfigRaw);
  McpClient = new McpClientMultiServer(mcpServerConfig);
}

/**
 * Inference Task.
 */
async function Inference(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  context: PromptContext,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference..." });

  let model = chat.models.main;
  if (image && chat.models.vision) model = chat.models.vision;

  const messagesGh: GitHubChatMessage[] = [];
  // previous chat history
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => v.messages.forEach((m) => messagesGh.push({ role: m.role, content: m.content })));

  // user message (with context already embedded in content by GetMessagesForInference)
  const latest = GetMessagesForInference(chat, query, image, context);
  const last = latest[latest.length - 1];
  messagesGh.push({ role: last.role, content: last.content });

  const ml = chat.messages.length;
  const prefs = getPreferenceValues<Preferences>();
  const token = prefs.githubToken || "";

  try {
    const resp = await chatCompletion(token, model.tag, messagesGh);
    const answer = resp.choices?.[0]?.message?.content || "";

    // append new message
    setChat((prevState) => {
      if (prevState) {
        if (prevState.messages.length === ml) {
          return {
            ...prevState,
            messages: prevState.messages.concat({
              model: model.tag,
              created_at: new Date().toISOString(),
              images: image,
              files: documents && documents.map((d) => (d as any).metadata?.source).filter((v, i, a) => a.indexOf(v) === i),
              messages: [
                { role: OllamaApiChatMessageRole.USER, content: query },
                { role: OllamaApiChatMessageRole.ASSISTANT, content: answer },
              ],
              done: true,
            } as any),
          } as any;
        }
      }
    });
    await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
  } catch (e: any) {
    await showToast({ style: Toast.Style.Failure, title: "Error:", message: String(e?.message || e) });
  } finally {
    setLoading(false);
  }
}

function DocumentsToJson(documents: Document<Record<string, any>>[]): string {
  const o: any[] = [];
  for (const document of documents) {
    o.push({ source: (document as any).metadata?.source, content: document.pageContent });
  }
  return JSON.stringify(o);
}

export async function Run(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  setLoading(true);

  const context: PromptContext = {};

  /* Parse token on query */
  query = await PromptTokenParser(query);

  /* If documents are defined add them to the context */
  if (documents) context.documents = DocumentsToJson(documents);

  /* Start Inference */
  await Inference(query, image, documents, context, chat, setChat, setLoading);
}
