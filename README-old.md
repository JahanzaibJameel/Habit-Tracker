# 🗓️ 10/10 Habit Tracker

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-ready-green)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GitHub Actions](https://img.shields.io/badge/CI-CD-success)](.github/workflows/ci.yml)

A modern, offline‑first habit tracking application built in 30 days with Next.js 14, TypeScript, and Tailwind CSS. Track your daily habits, build streaks, and achieve your goals with a beautiful, feature‑rich interface.

**Live Demo**: [https://habit-tracker.vercel.app](https://habit-tracker.vercel.app)

![Dashboard Light](./public/screenshots/dashboard-light.png)
![Dashboard Dark](./public/screenshots/dashboard-dark.png)

---

## ✨ Features

- ✅ **Offline‑first** – Works without internet, syncs when back online
- 📊 **Streak tracking** – Heatmaps, sparklines, and streak analytics
- 🎯 **Drag & drop reordering** – Arrange habits your way
- 🔁 **Recurrence patterns** – Daily, weekly, monthly, custom
- ⛓️ **Habit dependencies** – Define prerequisites for habits
- 🏆 **Gamification** – Badges, milestones, and levels
- 📱 **PWA ready** – Install as a standalone app on any device
- 🔔 **Push notifications** – Gentle reminders (optional)
- 🔒 **Client‑side encryption** – Encrypt sensitive data with a passphrase
- 📤 **Data export** – JSON or CSV backup
- ♿ **Accessible** – WCAG 2.1 AA compliant, keyboard navigable
- 🧪 **Comprehensive testing** – Unit, integration, and E2E tests
- 🐳 **Dockerized** – Easy production deployment

---

## 🛠️ Tech Stack

| Area                | Technology                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Framework**       | [Next.js 14 (App Router)](https://nextjs.org/)                                                 |
| **Language**        | [TypeScript](https://www.typescriptlang.org/)                                                  |
| **Styling**         | [Tailwind CSS](https://tailwindcss.com/) + [Headless UI](https://headlessui.com/) + Radix UI  |
| **State Management**| [Zustand](https://github.com/pmndrs/zustand) + [TanStack Query](https://tanstack.com/query)   |
| **Database**        | [Dexie.js](https://dexie.org/) (IndexedDB)                                                     |
| **Forms**           | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)                      |
| **Animations**      | [Framer Motion](https://www.framer.com/motion/)                                                |
| **Charts**          | [Recharts](https://recharts.org/) + [d3](https://d3js.org/)                                    |
| **Testing**         | [Jest](https://jestjs.io/), [Testing Library](https://testing-library.com/), [Playwright](https://playwright.dev/) |
| **Code Quality**    | [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Husky](https://typicode.github.io/husky/) |
| **PWA**             | [next-pwa](https://github.com/shadowwalker/next-pwa) + Workbox                                 |
| **Error Tracking**  | [Sentry](https://sentry.io/)                                                                   |
| **CI/CD**           | GitHub Actions, [Vercel](https://vercel.com/)                                                  |
| **Container**       | [Docker](https://www.docker.com/)                                                              |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/10-10-habit-tracker.git
   cd 10-10-habit-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Sentry DSN etc. (optional).

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Scripts

| Script               | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start development server                              |
| `npm run build`      | Build for production                                  |
| `npm run start`      | Start production server                               |
| `npm run lint`       | Run ESLint                                            |
| `npm run format`     | Format code with Prettier                             |
| `npm run type-check` | TypeScript type checking                              |
| `npm run test`       | Run unit tests (Jest)                                 |
| `npm run test:e2e`   | Run end‑to‑end tests (Playwright)                     |
| `npm run storybook`  | Launch Storybook                                      |
| `npm run analyze`    | Analyze bundle size                                   |
| `npm run docker:build`| Build Docker image                                   |
| `npm run docker:run` | Run Docker container                                  |

---

## 🏗️ Project Structure

The project follows **Atomic Design** principles. Below is a simplified overview:

```
src/
├── app/                 # Next.js app router pages
├── components/          # Atomic components
│   ├── atoms/           # Button, Input, Card, etc.
│   ├── molecules/       # Modal, Toast, Tabs, etc.
│   └── organisms/       # HabitCard, HabitForm, HeatmapCalendar, etc.
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, store, database, engines
├── mocks/               # MSW mock handlers & fixtures
├── types/               # TypeScript definitions
├── contracts/           # Zod schemas for API contracts
└── __tests__/           # Unit tests
```

For a detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🧪 Testing

The project includes:

- **Unit tests** (Jest + Testing Library) for utilities, hooks, and store.
- **Integration tests** for React Query hooks.
- **E2E tests** (Playwright) covering critical user flows.

Run tests with:

```bash
npm run test          # unit tests
npm run test:e2e      # E2E tests (requires dev server or build)
```

---

## 🌐 Deployment

### Deploy to Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2F10-10-habit-tracker)

### Deploy with Docker

```bash
npm run docker:build
npm run docker:run
```

The app will be available at `http://localhost:3000`.

---

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System design, data flow, component hierarchy
- [CONTRIBUTING.md](CONTRIBUTING.md) – Guidelines for contributors
- [CHANGELOG.md](CHANGELOG.md) – Version history

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Dexie.js](https://dexie.org/)
- [TanStack Query](https://tanstack.com/query)
- [Headless UI](https://headlessui.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

---

## 🎉 30-Day Build

This project was created as part of a 30‑day coding challenge. You can follow the journey on [Twitter](https://twitter.com/yourusername) or check out the [day‑by‑day blueprint](https://github.com/yourusername/10-10-habit-tracker/blob/main/BLUEPRINT.md).

**Happy habit tracking!** 🌟