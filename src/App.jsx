import { useEffect, useState } from "react";
import SceneSwitcher from "./components/SceneSwitcher.jsx";
import ContactForm from "./components/ContactForm.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import cleanProPreview from "./assets/cleanpro-preview.png";
import skinsheadPreview from "./assets/skinshead-preview.png";

const TELEGRAM_CONTACT = "https://t.me/GhostOfSecretum";

const SCENES = [
  { id: "grid", label: "Матрица" },
  { id: "chrome", label: "Хром" },
  { id: "ripple", label: "Риппл" },
  { id: "streams", label: "Потоки" },
];

const SERVICES = [
  {
    id: "bots",
    code: "BOT",
    title: "Telegram-боты",
    desc: "Продажи, поддержка клиентов, автоматизация бизнес-процессов и мини-приложения — от простого бота до сложной системы с интеграциями.",
  },
  {
    id: "web",
    code: "WEB",
    title: "Разработка сайтов",
    desc: "Лендинги, корпоративные сайты, личные кабинеты и внутренние порталы с современным дизайном и высокой производительностью.",
  },
  {
    id: "cloud",
    code: "CLD",
    title: "Персональные облачные решения",
    desc: "Частные хранилища, резервное копирование и синхронизация данных на собственной инфраструктуре под ваши требования.",
  },
  {
    id: "sec",
    code: "SEC",
    title: "Услуги по безопасности",
    desc: "Аудит инфраструктуры, защита от угроз, настройка защищенных каналов связи и сопровождение рабочих процессов.",
  },
];

const WORKS = [
  {
    id: "clean-pro",
    title: "CleanPro Miami",
    url: "https://clean-pro-miami.vercel.app/",
    description: "Лендинг клинингового сервиса с сильной упаковкой оффера, KPI-блоками и продуманной конверсией в заявку.",
    accent: "Сервисный лендинг",
    preview: cleanProPreview,
  },
  {
    id: "skinshead",
    title: "Skinshead",
    url: "https://skinshead.pro",
    description: "Минималистичный продуктовый сайт с упором на цифровой актив, доверие к сервису и быстрый переход к действию.",
    accent: "Продуктовый сайт",
    preview: skinsheadPreview,
  },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeScene, setActiveScene] = useState("grid");
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));

    revealElements.forEach((element) => {
      window.setTimeout(() => {
        element.classList.add("is-visible");
      }, 80);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.05 },
    );

    revealElements.forEach((element) => observer.observe(element));

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <SceneSwitcher activeScene={activeScene} />
      <div className="ambient-mesh" aria-hidden="true" />

      <header className={`topbar${scrolled ? " topbar--scrolled" : ""}`}>
        <div className="topbar__inner">
          <a className="brand" href="#hero" onClick={closeMenu}>
            <span className="brand__dot" />
            <span>Mysterium Tech</span>
          </a>

          <div className="topbar__controls">
            <div className="topbar-scene-selector" aria-label="Выбор 3D-сцены">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`topbar-scene-selector__pill${activeScene === scene.id ? " topbar-scene-selector__pill--active" : ""}`}
                  onClick={() => setActiveScene(scene.id)}
                >
                  <span className="topbar-scene-selector__dot" />
                  <span className="topbar-scene-selector__label">{scene.label}</span>
                </button>
              ))}
            </div>

            <nav className="desktop-nav">
              <a href="#services">Услуги</a>
              <a href="#demo">Работы</a>
              <a href="#contact">Заявка</a>
              <a href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer">
                Telegram
              </a>
            </nav>
          </div>

          <button
            type="button"
            className={`menu-btn${menuOpen ? " menu-btn--open" : ""}`}
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mobile-nav${menuOpen ? " mobile-nav--open" : ""}`}>
        <div className="mobile-nav__group">
          <p>Навигация</p>
          <a href="#services" onClick={closeMenu}>
            Услуги
          </a>
          <a href="#contact" onClick={closeMenu}>
            Оставить заявку
          </a>
          <a href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer" onClick={closeMenu}>
            Связаться напрямую
          </a>
        </div>
      </div>

      <main>
        <section className="section hero" id="hero">
          <div className="container">
            <div className="hero__content" data-reveal>
              <p className="eyebrow">IT / Безопасность / Разработка</p>
              <h1>
                Инженерная команда под задачи <span>вашего бизнеса</span>
              </h1>
              <p className="hero__lead">
                Разрабатываем Telegram-боты, сайты, персональные облачные решения и помогаем с безопасностью
                инфраструктуры. Все условия и состав работ обсуждаются индивидуально под вашу задачу.
              </p>

              <div className="hero__kpis">
                {[
                  { val: "4", lbl: "направления" },
                  { val: "24/7", lbl: "поддержка" },
                  { val: "VPS", lbl: "свои серверы" },
                  { val: "Custom", lbl: "под задачи" },
                ].map((item) => (
                  <div className="kpi" key={item.lbl}>
                    <span className="kpi__val">{item.val}</span>
                    <span className="kpi__lbl">{item.lbl}</span>
                  </div>
                ))}
              </div>

              <div className="hero__actions">
                <a className="cta" href="#contact">
                  Оставить заявку
                </a>
                <a className="cta cta--ghost" href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer">
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="services">
          <div className="container">
            <div className="section__head" data-reveal>
              <p className="eyebrow">Что мы делаем</p>
              <h2>Услуги проекта</h2>
              <p className="services__text">
                Telegram-боты, сайты, облачная персональная инфраструктура и услуги по безопасности. Без шаблонных
                тарифов: каждое решение подбирается под ваш процесс, команду и нагрузку.
              </p>
            </div>

            <div className="feature-grid" data-reveal>
              {SERVICES.map((service) => (
                <div className="glass-card" key={service.id}>
                  <div className="glass-card__icon">{service.code}</div>
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--demo" id="demo">
          <div className="container">
            <div className="section__head" data-reveal>
              <p className="eyebrow">Портфолио</p>
              <h2>Примеры наших работ</h2>
              <p className="services__text">
                Ниже два живых примера. Каждый блок можно открыть и посмотреть сайт целиком, чтобы оценить визуальную
                подачу, структуру и уровень проработки интерфейса.
              </p>
            </div>

            <div className="works-grid" data-reveal>
              {WORKS.map((work) => (
                <a className="work-card" key={work.id} href={work.url} target="_blank" rel="noreferrer">
                  <div className="work-card__topline">
                    <span className="work-card__eyebrow">{work.accent}</span>
                  </div>

                  <div className="work-card__window">
                    <div className="work-card__toolbar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div
                      className="work-card__preview"
                      style={{ backgroundImage: `url(${work.preview})` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="work-card__content">
                    <h3>{work.title}</h3>
                    <p>{work.description}</p>
                    <span className="work-card__cta">Открыть сайт</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--contact" id="contact">
          <div className="container">
            <div className="section__head" data-reveal>
              <p className="eyebrow">Контакты</p>
              <h2>Обсудим ваш проект</h2>
              <p className="services__text">
                Оставьте заявку с выбранной услугой и контактами. Форма отправит сообщение в Telegram, а локальная
                копия сохранится в админ-панели этого браузера.
              </p>
            </div>

            <div className="contact-grid">
              <ContactForm />

              <aside className="contact-aside">
                <div className="contact-card contact-card--highlight">
                  <h4>Написать напрямую</h4>
                  <p>Если хотите обсудить проект без формы, можно сразу перейти в Telegram.</p>
                  <a href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer">
                    @GhostOfSecretum
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__layout">
          <a className="brand" href="#hero">
            <span className="brand__dot" />
            <span>Mysterium Tech</span>
          </a>
          <p>© 2026 Mysterium Tech</p>
          <div className="footer__links">
            <a href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer">
              @GhostOfSecretum
            </a>
            <button
              type="button"
              className="footer__admin"
              onClick={() => setShowAdmin(true)}
              title="Панель администратора"
            >
              ◆
            </button>
          </div>
        </div>
      </footer>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
