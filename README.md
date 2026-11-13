# 🌉 LALA Bridge

**Empowering Lalíderes Through Equipment Donations**

LALA Bridge is a web platform that connects generous donors with verified Lalíderes (youth from the [Latin American Leadership Academy](https://latinamericanleadershipacademy.org)) for donating laptops, phones, and other study/work equipment.

## 🌟 Features

- **Verified Lalíderes**: Every Lalíder must provide their unique LALA verification code to register — preventing fraud and ensuring authenticity.
- **Two User Roles**: Donors can only donate; Lalíderes can request and receive equipment.
- **Smart Matching**: Browse available donations and open requests with filters by category, urgency, and country.
- **Premium UI**: Dark mode with glassmorphism, smooth animations, and responsive design.
- **Camp Integration**: Support for both VLB (Virtual) and BLB (In-person) camp cohorts.

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

The site is static, so it runs on GitHub Pages. `.github/workflows/deploy.yml` publishes it on every push to `master`, after lint and tests pass. One-time setup: **Settings → Pages → Source: GitHub Actions**. The demo then lives at `https://exewall.github.io/lala-bridge/`.

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
├── index.html, register.html, login.html, dashboard.html, donate.html, browse.html
├── css/styles.css        # Design system & all styles
├── js/
│   ├── config.js         # DEMO_MODE flag
│   ├── mock-data.js      # Verification codes, categories and demo data
│   ├── auth.js           # Accounts, password hashing, LALA code verification
│   ├── donations.js      # Donations & requests (needs)
│   ├── offers.js         # Offers: the matching flow
│   ├── migrations.js     # localStorage schema migrations
│   ├── app.js            # UI utilities, escaping, cards, modals, action router
│   └── pages/            # One script per page
├── tests/                # Vitest unit tests
└── docs/PLANO_DE_ACAO.md # Action plan (AI4Good 2027)
```

## 🔒 Security & privacy notes

This MVP still stores everything in the browser's `localStorage`. It is **not ready for real personal data**:

- Passwords are hashed with PBKDF2-SHA256 + salt, but this is only a stopgap; real auth comes with the backend (Phase 3).
- The session can still be edited in DevTools. Roles are read from the account record, not from the session.
- All user-provided text is escaped before rendering (`App.escapeHTML`).

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
- [ ] Multi-language support (EN/ES/PT)
- [ ] Admin panel
- [ ] PWA support

## 🤝 Contributing

This is a community initiative by Lalíderes, for Lalíderes. Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

[MIT License](LICENSE) — Feel free to use and adapt for similar causes.

---

Built with ❤️ by the LALA Community
