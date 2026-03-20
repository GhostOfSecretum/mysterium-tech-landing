import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const KNOWLEDGE_PATH = path.resolve(ROOT_DIR, "knowledge/service-instructions.md");

function loadEnvFile() {
  const envPath = path.resolve(ROOT_DIR, ".env");

  return readFile(envPath, "utf8")
    .then((content) => {
      content.split(/\r?\n/g).forEach((line) => {
        const normalizedLine = line.trim();
        if (!normalizedLine || normalizedLine.startsWith("#")) return;

        const separatorIndex = normalizedLine.indexOf("=");
        if (separatorIndex <= 0) return;

        const key = normalizedLine.slice(0, separatorIndex).trim();
        if (!key || process.env[key] !== undefined) return;

        const value = normalizedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        process.env[key] = value;
      });
    })
    .catch(() => {
      // Optional file. Server works with built-in defaults.
    });
}

await loadEnvFile();

const PORT = Number(process.env.LOCAL_LLM_PORT || 8787);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const MAX_HISTORY = Number(process.env.LOCAL_LLM_MAX_HISTORY || 4);
const MAX_RELEVANT_CHUNKS = Number(process.env.LOCAL_LLM_MAX_RELEVANT_CHUNKS || 2);
const MAX_CHUNK_CHARS = Number(process.env.LOCAL_LLM_MAX_CHUNK_CHARS || 900);
const FAST_PATH_MIN_SCORE = Number(process.env.LOCAL_LLM_FAST_PATH_SCORE || 0.45);
const OLLAMA_TIMEOUT_MS = Number(process.env.LOCAL_LLM_TIMEOUT_MS || 35000);
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 120);
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 1536);

let knowledgeCache = "";
let knowledgeMtimeMs = 0;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 1);
}

function splitToChunks(rawKnowledge) {
  const sections = rawKnowledge
    .split(/\n#{1,3}\s+/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length) return sections;

  return rawKnowledge
    .split(/\n{2,}/g)
    .map((section) => section.trim())
    .filter(Boolean);
}

function scoreChunk(chunk, queryTokens) {
  if (!queryTokens.length) return 0;
  const chunkTokens = tokenize(chunk);
  if (!chunkTokens.length) return 0;

  const tokenSet = new Set(chunkTokens);
  let matches = 0;

  queryTokens.forEach((token) => {
    if (tokenSet.has(token)) matches += 1;
  });

  return matches / queryTokens.length;
}

function pickRelevantChunks(knowledge, userQuestion) {
  const chunks = splitToChunks(knowledge);
  if (!chunks.length) return [];

  const queryTokens = tokenize(userQuestion);
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELEVANT_CHUNKS)
    .filter((item) => item.score > 0);
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyString = Buffer.concat(chunks).toString("utf8");
  return bodyString ? JSON.parse(bodyString) : {};
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.content === "string" && ["user", "assistant"].includes(item.role))
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0);
}

function buildSystemPrompt(knowledgeContext) {
  const base = [
    "Ты локальный AI-ассистент сервиса Mysterium Tech.",
    "Отвечай кратко и по делу на русском языке, 3-6 предложений.",
    "Используй только факты из базы знаний ниже.",
    "Если данных недостаточно, честно напиши, что информации нет, и предложи обратиться в поддержку Telegram: @SecretumHelp_bot.",
    "Не выдумывай условия, цены или технические параметры.",
  ].join(" ");

  if (!knowledgeContext.length) {
    return `${base}\n\nБаза знаний пуста. Сообщи, что администратору нужно заполнить knowledge/service-instructions.md`;
  }

  const compactContext = knowledgeContext.map((item) => item.chunk.slice(0, MAX_CHUNK_CHARS));
  return `${base}\n\nБаза знаний (выдержки):\n${compactContext.join("\n\n---\n\n")}`;
}

function buildFastAnswer(relevantChunks) {
  if (!relevantChunks.length) return "";
  const lines = relevantChunks[0].chunk
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => line.replace(/^[-*]\s*/, ""));

  if (!lines.length) return "";
  return `Коротко по инструкции:\n${lines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`;
}

async function getKnowledge() {
  const fileStat = await stat(KNOWLEDGE_PATH);
  if (knowledgeCache && fileStat.mtimeMs === knowledgeMtimeMs) {
    return knowledgeCache;
  }

  const nextKnowledge = await readFile(KNOWLEDGE_PATH, "utf8");
  knowledgeCache = nextKnowledge;
  knowledgeMtimeMs = fileStat.mtimeMs;
  return nextKnowledge;
}

async function callOllama(messages) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: OLLAMA_NUM_PREDICT,
        num_ctx: OLLAMA_NUM_CTX,
      },
    }),
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const answer = data?.message?.content?.trim();
  if (!answer) throw new Error("Ollama returned empty response.");
  return answer;
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/api/local-llm/health") {
    try {
      const knowledge = await getKnowledge();
      sendJson(res, 200, {
        ok: true,
        model: OLLAMA_MODEL,
        ollamaUrl: OLLAMA_URL,
        knowledgeLoaded: Boolean(knowledge.trim()),
      });
    } catch {
      sendJson(res, 200, {
        ok: true,
        model: OLLAMA_MODEL,
        ollamaUrl: OLLAMA_URL,
        knowledgeLoaded: false,
      });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/local-llm/chat") {
    try {
      const body = await parseJsonBody(req);
      const userMessage = String(body?.message || "").trim();
      const history = normalizeHistory(body?.history);

      if (!userMessage) {
        sendJson(res, 400, { ok: false, error: "Empty message." });
        return;
      }

      const knowledge = await getKnowledge();
      const relevantChunks = pickRelevantChunks(knowledge, userMessage);
      const topScore = relevantChunks[0]?.score || 0;
      const fastAnswer = buildFastAnswer(relevantChunks);

      if (topScore >= FAST_PATH_MIN_SCORE && fastAnswer) {
        sendJson(res, 200, {
          ok: true,
          answer: fastAnswer,
          model: `${OLLAMA_MODEL} (fast-path)`,
        });
        return;
      }

      const systemPrompt = buildSystemPrompt(relevantChunks);

      const messages = [{ role: "system", content: systemPrompt }, ...history];
      if (!history.length || history[history.length - 1]?.content !== userMessage) {
        messages.push({ role: "user", content: userMessage });
      }

      let answer = "";
      let fallbackUsed = false;

      try {
        answer = await callOllama(messages);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          answer = fastAnswer || "Ответ занял слишком много времени. Попробуйте переформулировать вопрос короче.";
          fallbackUsed = true;
        } else if (fastAnswer) {
          answer = `${fastAnswer}\n\n(Использован резервный ответ из базы знаний.)`;
          fallbackUsed = true;
        } else {
          throw error;
        }
      }

      sendJson(res, 200, {
        ok: true,
        answer,
        model: OLLAMA_MODEL,
        fallbackUsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown local server error.";
      sendJson(res, 500, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`[local-llm] running on http://127.0.0.1:${PORT}`);
  console.log(`[local-llm] model: ${OLLAMA_MODEL}`);
  console.log(`[local-llm] knowledge: ${KNOWLEDGE_PATH}`);
});
