import { useEffect, useState } from "react";
import SceneSwitcher from "./components/SceneSwitcher.jsx";

const TELEGRAM_PAY = "https://t.me/MysteriumTechBot";
const TELEGRAM_HELP = "https://t.me/SecretumHelp_bot";
const TELEGRAM_CONTACT = "https://t.me/GhostOfSecretum";
const TELEGRAM_PROXY =
  "tg://proxy?server=prox.secsoc.tech&port=443&secret=ee96887fbfcb117e0c8319f8fc0cfef61370726f782e736563736f632e74656368";
const PORTAL_NAME = "Mysterium Tech Portal";

const SCENES = [
  { id: "grid", label: "Матрица" },
  { id: "chrome", label: "Хром" },
  { id: "ripple", label: "Риппл" },
  { id: "streams", label: "Потоки" },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeScene, setActiveScene] = useState("grid");

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.18 },
    );

    revealElements.forEach((el) => observer.observe(el));

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

      <header className={`topbar ${scrolled ? "topbar--scrolled" : ""}`}>
        <div className="topbar__inner">
          <a className="brand" href="#services" onClick={closeMenu}>
            <span className="brand__dot" />
            <span>{PORTAL_NAME}</span>
          </a>

          <nav className="desktop-nav">
            <a href="#services">Услуги</a>
          </nav>

          <button
            type="button"
            className={`menu-btn ${menuOpen ? "menu-btn--open" : ""}`}
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mobile-nav ${menuOpen ? "mobile-nav--open" : ""}`}>
        <div className="mobile-nav__group">
          <p>Навигация</p>
          <a href="#services" onClick={closeMenu}>
            Услуги
          </a>
          <a href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer" onClick={closeMenu}>
            Связаться с нами
          </a>
        </div>
      </div>

      <main>
        <section className="section phase" id="services">
          <div className="container">
            <div className="section__head" data-reveal>
              <h2>Разработка сайтов и Телеграм ботов</h2>
              <p className="services__text">
                Разработаем для вас сайт или бота под ваши запросы, а также можем предложить комплексные решения для
                вашей компании: подключение к нашим сервисам и облачному хранению данных. Пример того, как может
                выглядеть продвинутая 3D-анимация, вы можете посмотреть, переключаясь между вариантами ниже.
              </p>
            </div>

            {SCENES.length > 1 && (
              <div className="scene-selector">
                {SCENES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`scene-selector__pill${activeScene === s.id ? " scene-selector__pill--active" : ""}`}
                    onClick={() => setActiveScene(s.id)}
                  >
                    <span className="scene-selector__dot" />
                    <span className="scene-selector__label">{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            <a className="cta services__contact" href={TELEGRAM_CONTACT} target="_blank" rel="noreferrer">
              Связаться с нами
            </a>
          </div>
        </section>
      </main>

    </div>
  );
}
