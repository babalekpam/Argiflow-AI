import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";

async function loadProvider() {
  const output = await build({
    entryPoints: ["server/ai-provider.ts"], bundle: true, write: false,
    platform: "node", format: "cjs",
    plugins: [{
      name: "isolated-provider-fixtures",
      setup(b) {
        b.onResolve({ filter: /^(\.\/storage|\.\/llm-router|openai|@anthropic-ai\/sdk)$/ },
          args => ({ path: args.path, namespace: "fixture" }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
          contents: args.path === "./storage"
            ? `export const storage = {getSettingsByUser: async id => ({
                preferredAiProvider: id.startsWith('groq-') ? 'groq' : 'auto',
                preferredAiModel: id === 'groq-retired' ? 'llama-3.3-70b-versatile' : id === 'groq-tenant' ? 'gpt-4o-mini' : null
              })};`
            : args.path === "./llm-router"
            ? `export const REGISTRY = {
                groq: {defaultModel:'qwen/qwen3.8-27b',modelOptions:['qwen/qwen3.8-27b'],baseUrl:'https://api.groq.com/openai',format:'openai'},
                openai: {defaultModel:'gpt-4o-mini',modelOptions:['gpt-4o-mini'],baseUrl:'https://api.openai.com',format:'openai'}
              };
              export async function callLLM(p) {
                if(p.userMessage === 'reject') throw new Error('401 authentication failed');
                return {text:'ok',provider:p.providerId,model:p.model};
              }`
            : "export default class Client {}",
          loader: "js",
        }));
      },
    }],
  });
  const module = { exports: {} };
  runInNewContext(output.outputFiles[0].text, {
    module, exports: module.exports, console,
    // Synthetic keys only; no real credentials or network calls in these tests.
    process: { env: { GROQ_API_KEY: "fixture-groq", OPENAI_API_KEY: "fixture-openai" } },
  });
  return module.exports as typeof import("./ai-provider");
}

test("explicit Groq beats a configured OpenAI default and resets a stale OpenAI model", async () => {
  const provider = await loadProvider();
  const resolved = await provider.resolveProvider("groq-tenant");
  assert.equal(resolved.providerId, "groq");
  assert.equal(resolved.apiKey, "fixture-groq");
  assert.equal(resolved.model, "qwen/qwen3.8-27b");
  assert.equal((await provider.resolveProvider("groq-retired")).model, "qwen/qwen3.8-27b");
  const result = await provider.callAI({ userId: "groq-tenant", system: "", userMessage: "hello" });
  assert.equal(result.provider, "groq");
  await assert.rejects(provider.callAI({userId: "groq-tenant", system: "", userMessage: "reject"}), /401/);
});

test("anonymous platform calls retain their default rather than another tenant's key", async () => {
  const provider = await loadProvider();
  assert.equal((await provider.resolveProvider()).providerId, "openai");
});

test("chat and workflow callers use trusted tenant selection instead of hardcoded providers", () => {
  const chat = readFileSync(new URL("./chatbot-routes.ts", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("./workflow-engine.ts", import.meta.url), "utf8");
  assert.match(chat, /req.session as any\)\?\.userId/);
  assert.match(chat, /getAnthropicCompatClient\(userId\)/);
  assert.match(chat, /res.json\(\{ reply, provider, model \}\)/);
  assert.doesNotMatch(chat, /new OpenAI|process.env.OPENAI_API_KEY|req.body.userId/);
  assert.match(workflow, /callTenantAI\(\{\s*userId,/);
  assert.doesNotMatch(workflow, /new Anthropic|process.env.ANTHROPIC_API_KEY/);
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routes, /active = await resolveProvider\(req.session.userId!\)/);
  assert.doesNotMatch(routes, /getActiveLLMConfig|callMultiLLM/);
  assert.equal((routes.match(/callTenantAI\(\{\s*userId,/g) || []).length, 2);
});