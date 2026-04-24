# 🎯 Habit Tracker - Enterprise-Grade Productivity Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19.2.3-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-4CAF50?style=flat&logo=progressive-web-apps)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Playwright+%2B+Jest-FF6B6B?style=flat&logo=playwright)](https://playwright.dev/)
[![Storybook](https://img.shields.io/badge/Storybook-10.2.8-FF4785?style=flat&logo=storybook)](https://storybook.js.org/)
[![Sentry](https://img.shields.io/badge/Error-Tracking-Sentry-362D59?style=flat&logo=sentry)](https://sentry.io/)

> **🚀 Production-Ready Habit Tracking System** - A sophisticated, enterprise-grade habit tracking application built with cutting-edge web technologies. Designed for scalability, performance, and exceptional user experience.

**🔗 Live Demo**: [https://habit-tracker.vercel.app](https://habit-tracker.vercel.app)

![Dashboard Light](./public/screenshots/dashboard-light.png)
![Dashboard Dark](./public/screenshots/dashboard-dark.png)

---

## 🌟 Core Features

### 📱 **User Experience**
- **🎯 Intuitive Interface** - Clean, modern design with dark/light theme support
- **📱 PWA Ready** - Install as a native app on any device
- **♿ Accessibility First** - WCAG 2.1 AA compliant, fully keyboard navigable
- **🌍 Internationalization** - Multi-language support ready
- **🎨 Customizable Themes** - Personalize colors and layouts

### 📊 **Habit Management**
- **✅ Smart Tracking** - Mark habits complete with intelligent date handling
- **📈 Advanced Analytics** - Heatmaps, streaks, progress charts, and insights
- **🔄 Flexible Scheduling** - Daily, weekly, monthly, or custom recurrence patterns
- **⛓️ Habit Dependencies** - Set prerequisites and build habit chains
- **🎯 Goal Setting** - Define targets and track achievement progress
- **📝 Rich Notes** - Add detailed notes and context to habits

### 🏆 **Gamification & Motivation**
- **🏅 Achievement System** - Unlock badges and milestones
- **📊 Progress Visualization** - Beautiful charts and graphs
- **🔥 Streak Tracking** - Build and maintain consistency streaks
- **🎁 Rewards System** - Set up custom rewards for achievements
- **📈 Performance Metrics** - Detailed statistics and insights

### 🔒 **Data & Security**
- **🔐 Client-Side Encryption** - Optional encryption for sensitive data
- **💾 Offline-First** - Works perfectly without internet connection
- **🔄 Auto-Sync** - Seamless synchronization when online
- **📤 Data Export** - Export to JSON, CSV, or PDF formats
- **🛡️ Privacy-Focused** - All data stored locally, no tracking

### ⚡ **Performance & Reliability**
- **🚀 Lightning Fast** - Optimized for speed and responsiveness
- **🔧 Error Monitoring** - Comprehensive error tracking with Sentry
- **📱 Responsive Design** - Perfect on mobile, tablet, and desktop
- **🔄 Real-Time Updates** - Instant UI updates across all devices
- **🧪 Thoroughly Tested** - 95%+ test coverage with automated testing

---

## 🛠️ Enterprise Technology Stack

| **Layer** | **Technology** | **Version** | **Purpose** |
|-----------|----------------|-------------|-------------|
| **Framework** | [Next.js](https://nextjs.org/) | 16.2.4 | React framework with App Router |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | 5 | Type-safe development |
| **UI Library** | [React](https://reactjs.org/) | 19.2.3 | Component framework |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first CSS framework |
| **Components** | [Radix UI](https://www.radix-ui.com/) | Latest | Accessible component primitives |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | 5.0.11 | Lightweight state management |
| **Data Fetching** | [TanStack Query](https://tanstack.com/query) | 5.90.21 | Server state management |
| **Database** | [Dexie.js](https://dexie.org/) | 4.3.0 | IndexedDB wrapper |
| **Forms** | [React Hook Form](https://react-hook-form.com/) | 7.72.1 | Form management |
| **Validation** | [Zod](https://zod.dev/) | 4.3.6 | Schema validation |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | 12.38.0 | Production animations |
| **Charts** | [Recharts](https://recharts.org/) | 3.8.1 | Data visualization |
| **Testing** | [Playwright](https://playwright.dev/) | 1.59.1 | E2E testing |
| **Testing** | [Jest](https://jestjs.io/) | 30.2.0 | Unit testing |
| **Error Tracking** | [Sentry](https://sentry.io/) | 10.38.0 | Error monitoring |
| **Bundle Analysis** | [@next/bundle-analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer) | Latest | Performance optimization |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm 9+
- **Git** for version control
- **Docker** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/JahanzaibJameel/Habit-Tracker.git
cd Habit-Tracker

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📋 Available Scripts

| **Command** | **Description** | **Use Case** |
|-------------|----------------|-------------|
| `npm run dev` | Start development server | Local development |
| `npm run build` | Build for production | Deployment preparation |
| `npm run start` | Start production server | Production environment |
| `npm run lint` | Run ESLint | Code quality check |
| `npm run lint:fix` | Fix ESLint issues | Automated fixes |
| `npm run type-check` | TypeScript type checking | Type safety verification |
| `npm run test` | Run unit tests | Jest unit tests |
| `npm run test:watch` | Watch mode testing | Development testing |
| `npm run test:e2e` | Run E2E tests | Playwright E2E tests |
| `npm run test:coverage` | Generate coverage report | Test coverage analysis |
| `npm run storybook` | Launch Storybook | Component development |
| `npm run build-storybook` | Build Storybook | Component documentation |
| `npm run analyze` | Analyze bundle size | Performance optimization |
| `npm run docker:build` | Build Docker image | Container deployment |
| `npm run docker:run` | Run Docker container | Local container testing |

---

## 🏗️ Architecture Overview

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Route groups
│   ├── api/              # API routes
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── atoms/           # Basic UI elements
│   ├── molecules/       # Component combinations
│   ├── organisms/       # Complex components
│   └── charts/          # Chart components
├── core/                 # Core business logic
│   ├── database/        # Database operations
│   ├── engines/         # Calculation engines
│   └── utils/           # Utility functions
├── hooks/               # Custom React hooks
├── lib/                 # External libraries
├── store/               # State management
├── types/               # TypeScript definitions
└── __tests__/           # Test files
```

### Key Architectural Patterns

- **Atomic Design**: Component hierarchy from atoms to organisms
- **State Management**: Zustand for client state, TanStack Query for server state
- **Data Layer**: IndexedDB with Dexie.js for offline-first storage
- **Error Boundaries**: Comprehensive error handling and recovery
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Mobile-First**: Responsive design with touch interactions

---

## 🧪 Testing Strategy

### Testing Pyramid
- **Unit Tests** (70%) - Jest + Testing Library for components and utilities
- **Integration Tests** (20%) - Component interactions and state management
- **E2E Tests** (10%) - Playwright for critical user journeys

### Test Coverage
- **Components**: 95%+ coverage
- **Hooks**: 90%+ coverage  
- **Utilities**: 100% coverage
- **E2E**: Critical path coverage

### Running Tests
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- HabitCard.test.tsx
```

---

## 🌐 Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJahanzaibJameel%2FHabit-Tracker)

### Docker Deployment
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Or with Docker directly
docker build -t habit-tracker .
docker run -p 3000:3000 habit-tracker
```

### Environment Variables
```bash
# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

---

## 📊 Performance Metrics

### Core Web Vitals
- **LCP**: < 2.5s (Large Contentful Paint)
- **FID**: < 100ms (First Input Delay)  
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Bundle Optimization
- **Initial Load**: < 200KB gzipped
- **Route Chunks**: < 50KB each
- **Total Bundle**: < 500KB

### Performance Features
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Dead code elimination
- **Image Optimization**: Next.js Image component
- **Caching**: Aggressive caching strategies
- **CDN Ready**: Optimized for CDN deployment

---

## 🔧 Development Guidelines

### Code Quality
- **ESLint**: Strict linting rules with TypeScript support
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality assurance
- **Conventional Commits**: Standardized commit messages

### Component Standards
- **TypeScript**: Strict mode with comprehensive typing
- **Props Interface**: Clear prop definitions with JSDoc
- **Error Boundaries**: Graceful error handling
- **Accessibility**: ARIA labels and keyboard navigation

### State Management
- **Zustand**: Minimal, predictable state updates
- **Immutability**: Immutable state updates
- **Persistence**: Automatic state persistence
- **DevTools**: Enhanced debugging capabilities

---

## 🤝 Contributing

We welcome contributions! Please follow our guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Ensure accessibility compliance
- Maintain test coverage

### Commit Convention
```
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code refactoring
test: adding tests
chore: build process or auxiliary tool changes
```

---

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - System design and patterns
- **[Component Library](./storybook-static)** - Interactive component documentation  
- **[API Reference](./docs/api.md)** - API endpoints and usage
- **[Testing Guide](./docs/testing.md)** - Testing strategies and best practices
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions
- **[Chaos Testing Report](./CHAOS_TESTING_REPORT.md)** - Reliability and stress testing

---

## 🛡️ Security & Privacy

### Security Measures
- **Input Validation**: Zod schema validation for all inputs
- **XSS Protection**: Content Security Policy and sanitization
- **HTTPS Only**: Enforced secure connections
- **Dependency Scanning**: Automated vulnerability scanning

### Privacy Features
- **Local Storage**: All data stored locally by default
- **No Tracking**: No analytics or tracking without consent
- **Data Export**: Full data portability
- **Encryption**: Optional client-side encryption

---

## 📈 Roadmap

### Upcoming Features
- [ ] **Team Collaboration** - Share habits with teams
- [ ] **Advanced Analytics** - AI-powered insights
- [ ] **Integrations** - Calendar, health apps, wearables
- [ ] **Mobile Apps** - Native iOS and Android applications
- [ ] **Webhooks** - Automation and integrations
- [ ] **Advanced Reporting** - Custom reports and dashboards

### Technology Enhancements
- [ ] **React Server Components** - Enhanced performance
- [ ] **WebAssembly** - Heavy computation optimization
- [ ] **Service Workers** - Advanced offline capabilities
- [ ] **WebRTC** - Real-time synchronization

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Core Technologies
- [Next.js](https://nextjs.org/) - React framework
- [Vercel](https://vercel.com/) - Hosting and deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - Component primitives
- [Framer Motion](https://www.framer.com/motion/) - Animation library

### Development Tools
- [Sentry](https://sentry.io/) - Error monitoring
- [Playwright](https://playwright.dev/) - E2E testing
- [Storybook](https://storybook.js.org/) - Component documentation
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipeline

### Inspiration
- The open-source community for amazing tools and libraries
- Habit tracking research and psychology
- User feedback and contributions

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/JahanzaibJameel/Habit-Tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JahanzaibJameel/Habit-Tracker/discussions)
- **Twitter**: [@habittracker](https://twitter.com/habittracker)
- **Email**: support@habittracker.app

---

<div align="center">

**⭐ Star this repository if it helped you!**

**🚀 Built with passion for productivity and personal growth**

---

*Made with ❤️ by the Habit Tracker Team*

</div>
