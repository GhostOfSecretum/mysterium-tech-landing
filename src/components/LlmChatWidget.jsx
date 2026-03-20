import { useEffect, useRef, useState } from "react";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Привет! Я локальный AI-помощник. Отвечаю по вашей базе инструкций о сервисе.",
};

export default function LlmChatWidget() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modelLabel, setModelLabel] = useState("локальная LLM");
  const feedRef = useRef(null);

  useEffect(() => {
    if (!open || !feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isLoading, open]);

  useEffect(() => {
    let ignore = false;

    async function fetchHealth() {
      try {
        const response = await fetch("/api/local-llm/health");
        if (!response.ok) throw new Error("Локальный сервер не ответил.");
        const data = await response.json();

        if (ignore) return;
        setModelLabel(data?.model || "локальная LLM");
      } catch {
        if (ignore) return;
        setErrorMessage("Локальный AI недоступен. Запустите Ollama и `npm run llm:server`.");
      }
    }

    fetchHealth();
    return () => {
      ignore = true;
    };
  }, []);

  async function sendMessage(event) {
    event.preventDefault();

    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInputValue("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      const history = nextMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-8);

      const response = await fetch("/api/local-llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const assistantText = data?.answer || "Не получилось сформировать ответ. Попробуйте уточнить запрос.";
      if (typeof data?.model === "string" && data.model) setModelLabel(data.model);

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка API.";
      setErrorMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Сейчас не могу ответить. Проверьте, что Ollama и локальный сервер запущены.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="llm-widget-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="llm-widget-panel"
      >
        {open ? "Закрыть AI" : "AI-чат"}
      </button>

      <aside
        id="llm-widget-panel"
        className={`llm-widget${open ? " llm-widget--open" : ""}`}
        aria-hidden={!open}
      >
        <div className="llm-widget__head">
          <p>AI-помощник</p>
          <span>{modelLabel}</span>
        </div>

        <div ref={feedRef} className="llm-widget__messages">
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`llm-msg llm-msg--${message.role}`}>
              {message.content}
            </article>
          ))}
          {isLoading && <article className="llm-msg llm-msg--assistant">Пишу ответ...</article>}
        </div>

        {errorMessage && <p className="llm-widget__error">{errorMessage}</p>}

        <form className="llm-widget__form" onSubmit={sendMessage}>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Ваш вопрос..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputValue.trim()}>
            Отправить
          </button>
        </form>
      </aside>
    </>
  );
}
