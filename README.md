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

1. Clone this repository
2. Open `index.html` in your browser (no build step needed!)
3. Use demo accounts or register a new user

### Demo Accounts

| Type | Email | Password |
|------|-------|----------|
| Donor | techcorp@example.com | demo123 |
| Donor | sarah@example.com | demo123 |

To test as a Lalíder, register with one of these verification codes:
- `LALA-VLB32-001` through `LALA-VLB32-004`
- `LALA-BLB10-001` through `LALA-BLB10-004`
- And more (see `js/mock-data.js`)

## 📁 Project Structure

```
lala-bridge/
├── index.html          # Landing page
├── register.html       # Registration (Lalíder + Donor)
├── login.html          # Login page
├── dashboard.html      # User dashboard
├── donate.html         # Create a donation
├── browse.html         # Browse donations & requests
├── css/
│   └── styles.css      # Design system & all styles
├── js/
│   ├── app.js          # Core app logic & UI utilities
│   ├── auth.js         # Authentication system
│   ├── donations.js    # Donations & needs management
│   └── mock-data.js    # Mock database (replace with API)
└── README.md
```

## 🔧 Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, glassmorphism, Grid/Flexbox
- **Vanilla JavaScript** — No frameworks, lightweight & fast
- **localStorage** — MVP data persistence (replace with backend)

## 🗺️ Roadmap

- [ ] Backend API (Node.js / Supabase)
- [ ] Real Lalíder verification database
- [ ] Email notifications for matches
- [ ] Photo uploads for donations
- [ ] Multi-language support (EN/ES/PT)
- [ ] Admin panel
- [ ] PWA support

## 🤝 Contributing

This is a community initiative by Lalíderes, for Lalíderes. Contributions are welcome!

## 📄 License

MIT License — Feel free to use and adapt for similar causes.

---

Built with ❤️ by the LALA Community
