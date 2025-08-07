import test from "node:test";
import assert from "node:assert/strict";
import { listModels, chat } from "../src/api/github-models";

// mock fetch for listModels
const mockModels = [{ id: "openai/gpt-4o-mini" }];

test("listModels returns models", async () => {
  // @ts-ignore
  global.fetch = async () => new Response(JSON.stringify({ models: mockModels }), { status: 200 });
  const res = await listModels("token");
  assert.deepEqual(res, mockModels);
});

test("listModels 401", async () => {
  // @ts-ignore
  global.fetch = async () => new Response("bad", { status: 401 });
  await assert.rejects(() => listModels("token"));
});

// streaming test
test("chat streaming assembles text", async () => {
  const body = { model: "openai/gpt-4o-mini", messages: [], stream: true };
  // create stream with two chunks and [DONE]
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"delta":{"content":"hi"}}\n'));
      controller.enqueue(new TextEncoder().encode('{"delta":{"content":"!"}}\n'));
      controller.enqueue(new TextEncoder().encode("[DONE]\n"));
      controller.close();
    },
  });
  // @ts-ignore
  global.fetch = async () => new Response(stream, { status: 200 });
  const iter = await chat({ token: "t", body });
  let out = "";
  for await (const ch of iter) out += ch;
  assert.equal(out, "hi!");
});

// non-streaming
test("chat returns full text", async () => {
  const body = { model: "openai/gpt-4o-mini", messages: [] };
  // @ts-ignore
  global.fetch = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 });
  const res = await chat({ token: "t", body });
  assert.equal(res.content, "hello");
});

test("chat retries on 429", async () => {
  const body = { model: "openai/gpt-4o-mini", messages: [] };
  let called = 0;
  // @ts-ignore
  global.fetch = async () => {
    called++;
    if (called === 1) return new Response("", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  };
  const res = await chat({ token: "t", body });
  assert.equal(res.content, "ok");
  assert.equal(called, 2);
});
