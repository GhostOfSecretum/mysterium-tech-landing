import { useEffect, useState } from "react";

const STORAGE_KEY = "mysterium_contacts";
const SESSION_KEY = "mysterium_admin_auth";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin";

function getContacts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function deleteContact(id) {
  const list = getContacts().filter((contact) => contact.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function AdminPanel({ onClose }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (authed) {
      setContacts(getContacts().reverse());
    }
  }, [authed]);

  function login(event) {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      return;
    }

    setPasswordError("Неверный пароль");
  }

  function remove(id) {
    deleteContact(id);
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword("");
    setPasswordError("");
  }

  return (
    <div className="admin-overlay" onClick={(event) => (event.target === event.currentTarget ? onClose() : null)}>
      <div className="admin-panel">
        <div className="admin-panel__close">
          <h2>{authed ? "Заявки" : "Вход в панель"}</h2>
          <div className="admin-panel__actions">
            {authed ? (
              <button type="button" onClick={logout}>
                Выйти
              </button>
            ) : null}
            <button type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>

        {!authed ? (
          <div className="admin-login">
            <p>Введите пароль для доступа к локально сохраненным заявкам.</p>
            <form onSubmit={login}>
              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError("");
                  }}
                  placeholder="••••••••"
                  autoFocus
                />
                {passwordError ? <span className="form-group__error">{passwordError}</span> : null}
              </div>
              <button type="submit" className="cta admin-login__submit">
                Войти
              </button>
            </form>
          </div>
        ) : contacts.length === 0 ? (
          <div className="admin-empty">
            <p>Заявок пока нет.</p>
          </div>
        ) : (
          <>
            <p className="admin-meta">Всего заявок: {contacts.length}</p>
            <div className="admin-submissions">
              {contacts.map((contact) => (
                <div key={contact.id} className="submission-card">
                  <div>
                    <div className="submission-card__meta">
                      <span className="submission-card__service">{contact.service}</span>
                      <span className="submission-card__date">
                        {new Date(contact.date).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <h4>{contact.name}</h4>
                    <p className="submission-card__contact">{contact.contact}</p>
                    {contact.message ? <p>{contact.message}</p> : null}
                  </div>
                  <button type="button" className="submission-card__delete" onClick={() => remove(contact.id)}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
