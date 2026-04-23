import { useState } from "react";

const STORAGE_KEY = "mysterium_contacts";

export function saveContact(data) {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  list.push({ ...data, id: Date.now(), date: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const SERVICE_OPTIONS = [
  "Telegram-бот",
  "Разработка сайта",
  "Персональное облачное решение",
  "Безопасность / аудит",
  "Другое",
];

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    service: "",
    name: "",
    contact: "",
    message: "",
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};

    if (!form.service) nextErrors.service = "Выберите услугу";
    if (!form.name.trim()) nextErrors.name = "Укажите имя";
    if (!form.contact.trim()) nextErrors.contact = "Укажите Telegram или email";

    return nextErrors;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError("");

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Не удалось отправить заявку. Попробуйте позже.");
      }

      saveContact(form);
      setSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить заявку. Попробуйте позже.";
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-form">
        <div className="contact-form__success">
          <div className="contact-form__success-icon">✓</div>
          <h3>Заявка отправлена</h3>
          <p>
            Мы получили вашу заявку и свяжемся с вами в ближайшее время.
            <br />
            Для срочной связи можно написать в{" "}
            <a href="https://t.me/GhostOfSecretum" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              @GhostOfSecretum
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form__row">
        <Field
          label="Услуга"
          error={errors.service}
          as="select"
          name="service"
          value={form.service}
          onChange={handleChange}
        >
          <option value="">Выберите направление</option>
          {SERVICE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Field>
      </div>

      <div className="contact-form__row contact-form__row--2col">
        <Field
          label="Ваше имя"
          error={errors.name}
          name="name"
          placeholder="Как к вам обращаться"
          value={form.name}
          onChange={handleChange}
        />
        <Field
          label="Telegram или email"
          error={errors.contact}
          name="contact"
          placeholder="@username или mail@example.com"
          value={form.contact}
          onChange={handleChange}
        />
      </div>

      <div className="contact-form__row">
        <Field
          label="Описание задачи"
          as="textarea"
          name="message"
          placeholder="Опишите, что нужно сделать — чем подробнее, тем точнее мы сможем помочь"
          value={form.message}
          onChange={handleChange}
        />
      </div>

      {submitError ? <p className="contact-form__error">{submitError}</p> : null}

      <button type="submit" className="cta contact-form__submit" disabled={loading}>
        {loading ? "Отправка..." : "Отправить заявку"}
      </button>
    </form>
  );
}

function Field({ label, error, as: Tag = "input", children, ...props }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <Tag {...props}>{children}</Tag>
      {error ? <span className="form-group__error">{error}</span> : null}
    </div>
  );
}
