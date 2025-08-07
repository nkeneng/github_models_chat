export async function* streamLines(resp: Response): AsyncIterable<string> {
  const reader = resp.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const idx = buffer.indexOf("\n");
      if (idx < 0) break;
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as { delta?: { content?: string }; content?: string };
        if (json.delta?.content) yield json.delta.content;
        else if (json.content) yield json.content;
      } catch {
        yield payload;
      }
    }
  }
}
