import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.CONTACT_SERVER_PORT || process.env.LOCAL_LLM_PORT || 8787);

async function loadEnvFile() {
  const envPath = path.resolve(__dirname, ".env");

  try {
    const content = await readFile(envPath, "utf8");
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
  } catch {
    // Optional file.
  }
}

await loadEnvFile();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyString = Buffer.concat(chunks).toString("utf8");
  return bodyString ? JSON.parse(bodyString) : {};
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanField(value, fallback = "Не указано") {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

function cleanMessage(value) {
  const normalized = String(value || "").trim().replace(/\r\n/g, "\n");
  return normalized || "Не указано";
}

function truncateTelegramText(text, limit = 4096) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function buildTelegramMessage(data) {
  const lines = [
    "<b>Новая заявка с сайта</b>",
    "",
    `<b>Услуга:</b> ${escapeHtml(cleanField(data.service))}`,
    `<b>Имя:</b> ${escapeHtml(cleanField(data.name))}`,
    `<b>Контакт:</b> ${escapeHtml(cleanField(data.contact))}`,
    `<b>Описание:</b>`,
    escapeHtml(cleanMessage(data.message)),
    "",
    `<b>Время:</b> ${escapeHtml(new Date().toLocaleString("ru-RU"))}`,
  ];

  return truncateTelegramText(lines.join("\n"));
}

async function sendTelegramMessage(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";

  if (!token || !chatId || token === "ваш_токен_бота" || chatId === "ваш_chat_id") {
    throw new Error("Заполните TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramMessage(payload),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram API error (${response.status})`);
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/api/contact/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/api/contact") {
    try {
      const body = await parseJsonBody(req);
      const service = String(body?.service || "").trim();
      const name = String(body?.name || "").trim();
      const contact = String(body?.contact || "").trim();
      const message = String(body?.message || "").trim();

      if (!service || !name || !contact) {
        sendJson(res, 400, { ok: false, error: "Заполните услугу, имя и контакт для связи." });
        return;
      }

      await sendTelegramMessage({ service, name, contact, message });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить заявку.";
      sendJson(res, 500, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`[contact-server] running on http://127.0.0.1:${PORT}`);
});
