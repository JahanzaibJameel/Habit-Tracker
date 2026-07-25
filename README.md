<div align="center">

# Habit Tracker 
### *Build better habits. Track with clarity.*

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-4CAF50?style=flat&logo=progressive-web-apps)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat&logo=opensourceinitiative)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-30%2F30_passing-2E7D32?style=flat&logo=vitest)](https://vitest.dev/)
[![Storybook](https://img.shields.io/badge/storybook-documented-FF4785?style=flat&logo=storybook)](https://storybook.js.org/)

</div>

---

# 📖 Overview

**Habit Tracker Pro** is a modern, full-stack habit management application built with performance, offline capability, and accessibility at its core. It offers smart tracking, rich analytics, gamification, and end-to-end encryption—all in a clean, responsive interface.

### 🌐 Live Demo

- **Primary:** https://habit-tracker25.netlify.app/
- **Alternative:** https://habit-tracker-eight-iota-17.vercel.app/

---

# ✨ Features

- 🧠 **Smart Habit Tracking** — Flexible recurrence (daily, weekly, custom), intelligent date handling, and dependency chains.
- 📊 **Powerful Analytics** — Heatmaps, streak visualizations, completion charts, and performance insights powered by Recharts.
- 🏆 **Gamification** — Unlockable achievements, milestone badges, and a rewards system.
- 📱 **Offline-First & PWA** — Install on any device and continue tracking without an internet connection.
- ⚡ **Enterprise Reliability** — Zod validation, error boundaries, circuit-breaker patterns, and Core Web Vitals monitoring.
- ♿ **Accessibility** — WCAG 2.1 AA compliant with keyboard navigation and internationalization support.
- 🔒 **Privacy & Security** — Client-side encryption, XSS/CSRF protection, strict CSP, and zero third-party tracking.
- 📦 **Data Portability** — Export your habits anytime as JSON, CSV, or PDF.

---

# 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **UI** | React, Tailwind CSS, Radix UI, Framer Motion |
| **State Management** | Zustand, Immer, TanStack Query |
| **Database** | Dexie.js (IndexedDB) |
| **Forms & Validation** | React Hook Form, Zod |
| **Charts** | Recharts |
| **Testing** | Vitest, Testing Library, Playwright |
| **Monitoring** | Sentry |
| **Bundle Analysis** | @next/bundle-analyzer |
| **CI/CD** | GitHub Actions, Vercel, Netlify |

---

# 🏗 Architecture

```mermaid
graph TD
    A[User Interface] --> B[Next.js App Router]
    B --> C[Zustand Store]
    B --> D[TanStack Query]
    C --> E[IndexedDB / Dexie]
    D --> F[API Routes]
    C --> G[LocalStorage]
    H[Error Boundaries] --> B
    I[Sentry] --> H
    J[Performance Monitor] --> B
    K[Validation Layer] --> B
    L[Security Layer] --> B
```

### Architecture Highlights

- Atomic Design (Atoms → Molecules → Organisms)
- Offline-first storage with automatic database migrations
- Progressive enhancement
- Secure client-side architecture
- High-performance rendering
- Modular and scalable project structure

---

# 📁 Project Structure

```text
src/
├── app/                     # Next.js App Router pages & API routes
├── components/
│   ├── atoms/               # Primitive UI elements
│   ├── molecules/           # Composed UI components
│   ├── organisms/           # Complex UI sections
│   └── charts/              # Recharts visualizations
├── core/                    # Business logic & utilities
├── hooks/                   # Custom React hooks
├── lib/                     # Third-party wrappers
├── store/                   # Zustand stores
├── types/                   # Global TypeScript types
└── __tests__/               # Unit & integration tests
```

---

# 🚀 Getting Started

## Prerequisites

- Node.js **20+**
- npm **10+**

## Installation

```bash
git clone https://github.com/JahanzaibJameel/Habit-Tracker.git

cd Habit-Tracker

npm install

cp .env.example .env.local

npm run dev
```

Application will start at:

```
http://localhost:3000
```

---

# 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint the project |
| `npm run type-check` | TypeScript checking |
| `npm test` | Run unit & integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run storybook` | Launch Storybook |
| `npm run analyze` | Analyze bundle size |

---

# 🧪 Testing

### Stack

- **Vitest**
- **Testing Library**
- **Playwright**

### Run Tests

```bash
npm test

npm run test:e2e

npm test -- --coverage
```

---

# 🚀 Deployment

## Vercel

Deploy instantly using Vercel.

https://vercel.com/new

---

## Docker

```bash
docker build -t habit-tracker .

docker run -p 3000:3000 habit-tracker
```

---

# ⚙ Environment Variables

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

SENTRY_AUTH_TOKEN=your_auth_token

NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

---

# ⚡ Performance

- ✅ LCP < 2.5s
- ✅ FID < 100ms
- ✅ CLS < 0.1
- ✅ Bundle < 200KB (gzipped)
- ✅ Route Chunks < 50KB

### Optimizations

- Automatic Code Splitting
- Tree Shaking
- Next.js Image Optimization
- CDN Ready
- Aggressive Caching
- Lazy Loading

---

# 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Commit using Conventional Commits.

```bash
feat: add amazing feature
```

4. Push your changes.

5. Open a Pull Request.

Please follow the existing code style, include tests for new functionality, and maintain accessibility standards.

---

# 📚 Documentation

- Architecture Guide
- Component Library (Storybook)
- API Reference
- Testing Guide
- Deployment Guide

---

# 📄 License

This project is licensed under the **MIT License**.

See the **LICENSE** file for more details.

---

<div align="center">

### Built with focus, for personal growth.

⭐ **If you found this project useful, consider giving it a Star!**

</div>
