# Mysterium Tech — Project Specification

## Executive Summary

Single-page landing site for **Mysterium Tech** — a B2C VPN service provider that also offers Telegram bot and website development. The site's primary goal is to convert visitors into paying VPN customers by redirecting them to a Telegram bot for payment. The design must produce a strong "wow-effect" through interactive 3D animations, glassmorphism, and ultra-modern aesthetics on a light color scheme.

---

## Problem Statement

Mysterium Tech needs a high-impact landing page that:
1. Clearly communicates VPN product value (speed, countries, devices, pricing)
2. Drives conversions to the Telegram payment bot
3. Showcases secondary services (bot & website development)
4. Creates a premium brand perception through cutting-edge design

---

## Success Criteria

- Visitor immediately understands what Mysterium Tech offers within 3 seconds
- Clear path to payment (Telegram bot) with minimal friction
- "Wow-effect" from 3D hero animation and scroll transitions
- Fully responsive (mobile-first, as B2C VPN users are largely mobile)
- Fast load time despite 3D elements (< 3s on 4G)

---

## User Persona

**Name:** Артём, 22 года
**Context:** Ищет надёжный VPN для обхода блокировок. Не разбирается в технологиях. Хочет простое решение: выбрать тариф → оплатить → пользоваться.
**Device:** Смартфон (70%), ноутбук (30%)
**Decision factors:** Цена, скорость, простота, доверие к бренду

---

## User Journey

```
1. Заходит на сайт → видит Hero с 3D-анимацией и оффером
2. Скроллит → узнаёт преимущества VPN (скорость, 4 страны, 3 устройства)
3. Скроллит → видит тарифные планы с ценами
4. Нажимает "Подключить" → попадает в @MysteriumTechBot
5. (Опционально) Скроллит дальше → видит услуги по разработке ботов/сайтов
6. (Опционально) Нажимает "Написать нам" → попадает в @SecretumHelp_bot
```

---

## Site Structure (Single Page Sections)

### Section 1: Hero
- Full-viewport 3D animated background
- Company name "Mysterium Tech" (text logo, Unbounded font)
- Headline: value proposition
- CTA button → Telegram bot
- Glassmorphism card overlay

### Section 2: Features / Advantages
- 4-6 feature cards with icons/micro-animations
- Key points: Speed, 4 countries (USA, Latvia, Netherlands, Sweden), 3 devices, 5-day trial
- Glassmorphism cards with hover effects

### Section 3: Pricing Plans
- 3 pricing cards (1 month / 6 months / 1 year)
- Prices: 300₽ / 1500₽ / 2900₽
- Highlight "best value" plan (1 year)
- Each card has CTA → @MysteriumTechBot
- Payment methods shown: Card, SBP, Crypto

### Section 4: Telegram Bots Development
- Description of service
- Examples/use cases
- CTA "Написать нам" → @SecretumHelp_bot

### Section 5: Website Development
- Description of service
- Examples/use cases
- CTA "Написать нам" → @SecretumHelp_bot

### Section 6: Footer
- Company name
- Navigation links (scroll-to-section)
- Telegram bot links
- Copyright

---

## Design Specification

### Color Palette (Light Mode)
- **Background:** #F8F9FC (cool off-white)
- **Surface/Cards:** rgba(255, 255, 255, 0.6) with backdrop-blur (glassmorphism)
- **Primary accent:** #6C5CE7 → #A29BFE (purple gradient, tech feel)
- **Secondary accent:** #00D2FF → #7B68EE (cyan-to-purple gradient)
- **Text primary:** #1A1A2E
- **Text secondary:** #6B7280
- **Borders:** rgba(255, 255, 255, 0.3)

### Typography
- **Primary font:** Unbounded (headings, logo, buttons)
- **Body font:** Inter or system-ui (readable body text)
- **Scale:** Modular scale, large headings for impact

### Glassmorphism Parameters
- background: rgba(255, 255, 255, 0.15–0.6)
- backdrop-filter: blur(12–20px)
- border: 1px solid rgba(255, 255, 255, 0.3)
- border-radius: 16–24px
- box-shadow: subtle layered shadows

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px–1024px
- Desktop: > 1024px

---

## Technical Architecture

### Stack
- **HTML5 + CSS3 + Vanilla JS** (single landing page, no framework overhead)
- **Three.js** for 3D hero animation
- **GSAP + ScrollTrigger** for scroll-based animations and transitions
- **Google Fonts** for Unbounded + Inter

### Performance Strategy
- Lazy-load 3D scene (show CSS gradient fallback immediately)
- Preload critical fonts
- Optimize 3D geometry (low-poly where possible)
- requestAnimationFrame for smooth rendering
- IntersectionObserver for scroll animations
- Compressed textures

### Deployment
- Static files (HTML/CSS/JS)
- No backend required
- Can be hosted anywhere (Netlify, Vercel, VPS, shared hosting)

---

## External Integrations

| Integration | Link | Purpose |
|---|---|---|
| Payment Bot | https://t.me/MysteriumTechBot | VPN purchase & payment |
| Support Bot | https://t.me/SecretumHelp_bot | Inquiries for bot/site dev |

---

## Out of Scope

- User authentication / dashboard
- In-site payment processing
- Blog / CMS
- AI / machine learning mentions
- Multi-language support (Russian only)
- SEO optimization beyond basics

---

## Open Questions for Implementation

1. Should the 3D hero respond to mouse movement (parallax) or be autonomous animation?
2. Preferred 3D concept for hero (see proposals below)
3. Should there be a cookie/privacy notice?
