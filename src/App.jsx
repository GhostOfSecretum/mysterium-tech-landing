import { useEffect, useState } from "react";
import CrystalOrbScene from "./components/CrystalOrbScene.jsx";

const TELEGRAM_PAY = "https://t.me/MysteriumTechBot";
const TELEGRAM_HELP = "https://t.me/SecretumHelp_bot";

const plans = [
  {
    title: "1 месяц",
    price: "300",
    note: "Идеально для старта",
    highlight: false,
  },
  {
    title: "6 месяцев",
    price: "1500",
    note: "Оптимальный баланс цены",
    highlight: false,
  },
  {
    title: "1 год",
    price: "2900",
    note: "Лучшая стоимость за месяц",
    highlight: true,
  },
];

const features = [
  "Высокая скорость подключения без просадок",
  "4 страны на выбор: США, Латвия, Нидерланды, Швеция",
  "Поддержка до 3 устройств одновременно",
  "Пробный период 5 дней без риска",
  "Оплата в Telegram: карта, СБП, крипта",
  "Оперативная поддержка через отдельный бот",
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
      <CrystalOrbScene />
      <div className="ambient-mesh" aria-hidden="true" />

      <header className={`topbar ${scrolled ? "topbar--scrolled" : ""}`}>
        <div className="topbar__inner">
          <a className="brand" href="#hero" onClick={closeMenu}>
            <span className="brand__dot" />
            <span>Mysterium Tech</span>
          </a>

          <nav className="desktop-nav">
            <a href="#benefits">Преимущества</a>
            <a href="#pricing">Тарифы</a>
            <a href="#bots">Telegram-боты</a>
            <a href="#sites">Сайты</a>
          </nav>

          <a className="cta cta--small" href={TELEGRAM_PAY} target="_blank" rel="noreferrer">
            Оплатить в Telegram
          </a>

          <button
            type="button"
            className={`menu-btn ${menuOpen ? "menu-btn--open" : ""}`}
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Открыть меню"
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mobile-nav ${menuOpen ? "mobile-nav--open" : ""}`}>
        <a href="#benefits" onClick={closeMenu}>
          Преимущества
        </a>
        <a href="#pricing" onClick={closeMenu}>
          Тарифы
        </a>
        <a href="#bots" onClick={closeMenu}>
          Telegram-боты
        </a>
        <a href="#sites" onClick={closeMenu}>
          Сайты
        </a>
        <a href={TELEGRAM_PAY} target="_blank" rel="noreferrer" onClick={closeMenu}>
          Перейти к оплате
        </a>
      </div>

      <main>
        <section className="hero phase" id="hero">
          <div className="container hero__layout">
            <div className="hero__content" data-reveal>
              <p className="eyebrow">VPN нового поколения</p>
              <h1>
                Надежный VPN от <span>Mysterium Tech</span> для ежедневной свободы в сети
              </h1>
              <p className="hero__lead">
                Подключайтесь за минуту, тестируйте сервис 5 дней бесплатно, оплачивайте удобным способом прямо
                в Telegram-боте.
              </p>
              <div className="hero__actions">
                <a className="cta" href={TELEGRAM_PAY} target="_blank" rel="noreferrer">
                  Подключить VPN
                </a>
                <a className="cta cta--ghost" href={TELEGRAM_HELP} target="_blank" rel="noreferrer">
                  Поддержка
                </a>
              </div>
            </div>

            <div className="hero__glass" data-reveal>
              <h3>Что входит</h3>
              <ul>
                <li>4 страны: США, Латвия, Нидерланды, Швеция</li>
                <li>До 3 устройств на одном доступе</li>
                <li>Стабильная высокая скорость</li>
                <li>5 дней пробного периода</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section phase" id="benefits">
          <div className="container">
            <div className="section__head" data-reveal>
              <p className="eyebrow">Преимущества VPN</p>
              <h2>Прозрачные условия и понятный результат</h2>
            </div>

            <div className="feature-grid">
              {features.map((item) => (
                <article key={item} className="glass-card" data-reveal>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section phase" id="pricing">
          <div className="container">
            <div className="section__head" data-reveal>
              <p className="eyebrow">Тарифы</p>
              <h2>Выберите удобный формат подключения</h2>
            </div>

            <div className="pricing-grid">
              {plans.map((plan) => (
                <article key={plan.title} className={`price-card ${plan.highlight ? "price-card--featured" : ""}`} data-reveal>
                  <h3>{plan.title}</h3>
                  <p className="price-card__price">
                    {plan.price}
                    <span>₽</span>
                  </p>
                  <p className="price-card__note">{plan.note}</p>
                  <a href={TELEGRAM_PAY} target="_blank" rel="noreferrer" className="cta cta--block">
                    Оплатить в боте
                  </a>
                </article>
              ))}
            </div>

            <div className="payment-box" data-reveal>
              <p>Способы оплаты: карта, СБП, крипта</p>
              <a href={TELEGRAM_PAY} target="_blank" rel="noreferrer">
                Открыть @MysteriumTechBot
              </a>
            </div>
          </div>
        </section>

        <section className="section service phase" id="bots">
          <div className="container service__layout">
            <div data-reveal>
              <p className="eyebrow">Дополнительная услуга</p>
              <h2>Разработка Telegram-ботов</h2>
              <p>
                Проектируем и запускаем ботов для продаж, поддержки и автоматизации заявок. Работаем под задачи
                бизнеса и сопровождаем после релиза.
              </p>
              <a className="cta" href={TELEGRAM_HELP} target="_blank" rel="noreferrer">
                Написать нам
              </a>
            </div>
            <div className="service__tag" data-reveal>
              <span>боты</span>
            </div>
          </div>
        </section>

        <section className="section service phase" id="sites">
          <div className="container service__layout">
            <div data-reveal>
              <p className="eyebrow">Дополнительная услуга</p>
              <h2>Разработка сайтов</h2>
              <p>
                Делаем современные сайты с сильным визуалом, грамотной структурой и понятной конверсией: от
                лендингов до корпоративных проектов.
              </p>
              <a className="cta" href={TELEGRAM_HELP} target="_blank" rel="noreferrer">
                Написать нам
              </a>
            </div>
            <div className="service__tag" data-reveal>
              <span>web</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" id="contact">
        <div className="container footer__layout">
          <p>© 2026 Mysterium Tech</p>
          <div>
            <a href={TELEGRAM_PAY} target="_blank" rel="noreferrer">
              @MysteriumTechBot
            </a>
            <a href={TELEGRAM_HELP} target="_blank" rel="noreferrer">
              @SecretumHelp_bot
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
