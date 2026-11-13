# 🌉 LALA Bridge

**Empowering Lalíderes Through Equipment Donations**

LALA Bridge is a web platform that connects generous donors with verified Lalíderes (youth from the [Latin American Leadership Academy](https://latinamericanleadershipacademy.org)) for donating laptops, phones, and other study/work equipment.

## 🌟 Features

- **Verified Lalíderes**: every Lalíder registers with their LALA verification code and the name registered with LALA.
- **Two roles**: donors publish equipment and offer help; Lalíderes publish requests and ask for donations.
- **Real matching flow**: offer → accept/decline → contacts revealed → delivered (see below).
- **Brazilian Portuguese first**: the interface is in PT-BR by default, with English and Spanish (selector in the navbar). Dates and numbers follow the active language.
- **Built for Brazil**: state (UF) and city for Brazilian users, ready for proximity matching.
- **LGPD**: privacy policy, explicit consent at sign-up, download my data and delete my account.
- **Accessible and mobile-first**: WCAG 2.1 AA (keyboard, screen readers, contrast), tested at 360px with 44px touch targets.
- **Camp integration**: VLB (virtual) and BLB (in-person) cohorts.

## 🚀 Getting Started

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

| Command          | What it does                                   |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Starts a local server (Vite) and opens the app |
| `npm test`       | Runs the unit tests (Vitest + jsdom)           |
| `npm run lint`   | Lints the code (ESLint)                        |
| `npm run format` | Formats the code (Prettier)                    |

## 🌐 Deploy

The site is static and is deployed on **Vercel** (`vercel.json`). Vercel runs lint, tests and `npm run build`, then serves `dist/`. Every push to `master` goes to production and every pull request gets a preview URL.

One-time setup: on [vercel.com](https://vercel.com), **Add New → Project → Import** `ExeWall/lala-bridge` and click **Deploy** (no settings to change; `vercel.json` has them).

## 🔄 How matching works

1. A **donor** clicks "Offer to Help" on a Lalíder's request (optionally linking one of their donations), or a **Lalíder** clicks "Request" on an available donation.
2. This creates a pending **offer**. The other side sees it on their dashboard and chooses **Accept** or **Decline**.
3. When accepted, the donation and the request become `matched` and **only then** both sides see each other's contact details.
4. Either side clicks **Mark as delivered** after the handover: everything becomes `delivered`.

### Demo mode

With `DEMO_MODE: true` in `js/config.js` (the default for now), the app seeds fictitious sample data in your browser and the login page shows **"Enter as demo"** buttons for a donor and a Lalíder. Demo accounts have no password. Set `DEMO_MODE: false` for any pilot with real people.

## 📁 Project Structure

```
lala-bridge/
├── index.html, register.html, login.html, dashboard.html,
│   donate.html, browse.html, privacidade.html
├── css/styles.css        # Design system & all styles
├── locales/              # pt-BR.json (default), en.json, es.json
├── js/
│   ├── config.js         # DEMO_MODE flag and id generator
│   ├── i18n.js           # Translations and Intl formatting
│   ├── mock-data.js      # Verification codes, categories, UFs and demo data
│   ├── auth.js           # Accounts, password hashing, LALA code verification
│   ├── donations.js      # Donations & requests (needs)
│   ├── offers.js         # Offers: the matching flow
│   ├── privacy.js        # LGPD: export and delete my data
│   ├── migrations.js     # localStorage schema migrations
│   ├── app.js            # UI utilities, escaping, cards, modals, a11y helpers
│   └── pages/            # One script per page
├── scripts/build.js      # Builds dist/ for deploy
├── tests/                # Vitest unit tests
└── docs/PLANO_DE_ACAO.md # Action plan (AI4Good 2027)
```

## 🌍 Translations

Texts live in `locales/pt-BR.json`, `locales/en.json` and `locales/es.json`. In HTML, use `data-i18n="key"` (text) or `data-i18n-attr="placeholder:key"` (attributes); in JS, `I18n.t('key', { name })`. Add every new key to the three files: `npm test` fails if a key is missing in any language or if the code uses a key that does not exist.

## 🔒 Security & privacy notes

This MVP still stores everything in the browser's `localStorage`. It is **not ready for real personal data**:

- Passwords are hashed with PBKDF2-SHA256 + salt, but this is only a stopgap; real auth comes with the backend (Phase 3).
- The session can still be edited in DevTools. Roles are read from the account record, not from the session.
- All user-provided text is escaped before rendering (`App.escapeHTML`).
- LGPD: see [`privacidade.html`](privacidade.html). Public pages show only first name + initial, state (UF) and cohort; contacts appear only after an offer is accepted. Users can download or delete their data from the dashboard.
- Fonts are loaded from Google Fonts, which receives the visitor's IP address. Self-hosting the fonts is on the roadmap.

## 🔧 Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, glassmorphism, Grid/Flexbox
- **Vanilla JavaScript** — No frameworks, lightweight & fast
- **localStorage** — MVP data persistence (replace with backend)

## 🗺️ Roadmap

See [`docs/PLANO_DE_ACAO.md`](docs/PLANO_DE_ACAO.md) for the full plan. Highlights:

- [x] Real matching flow with offers, accept/decline and delivery (Phase 1)
- [ ] Backend API (Node.js / Supabase)
- [ ] Real Lalíder verification database
- [ ] Email notifications for matches
- [ ] Photo uploads for donations
- [x] PT-BR by default, plus English and Spanish (Phase 2)
- [x] LGPD basics, accessibility (WCAG 2.1 AA) and mobile-first (Phase 2)
- [ ] Admin panel
- [ ] PWA support

## 🤝 Contributing

This is a community initiative by Lalíderes, for Lalíderes. Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

[MIT License](LICENSE) — Feel free to use and adapt for similar causes.

---

Built with ❤️ by the LALA Community
