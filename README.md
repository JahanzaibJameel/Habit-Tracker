 Habit Tracker
A modern, feature-rich habit tracking application built with Next.js 14, TypeScript, and Zustand. Track your daily habits, visualize progress, and build consistent routines with an intuitive interface.

https://via.placeholder.com/800x400/3b82f6/ffffff?text=10/10+Habit+Tracker+Dashboard

✨ Features
🎯 Core Features
Daily Habit Tracking: Mark habits as complete with one click

Weekly Scheduling: Set which days each habit should be tracked

Progress Visualization: Real-time statistics and completion rates

Goal Setting: Set weekly goals for each habit

Category Organization: Group habits by category for better organization

🎨 UI/UX
Dark/Light Mode: Full theme support with system preference detection

Responsive Design: Works seamlessly on desktop, tablet, and mobile

Visual Feedback: Color-coded habits with custom icons

Smooth Animations: Fade-in and slide-up transitions

Clean Interface: Minimalist design focused on usability

📊 Analytics
Daily Completion Rate: Track your success rate each day

Weekly Goal Progress: Monitor progress toward weekly targets

Active Habits Counter: Always know how many habits you're tracking

Total Completions: Lifetime achievement tracking

💾 Data Management
Local Storage: Data persists in browser local storage

Import/Export: Full data import/export capabilities

Store Reset: One-click reset for testing or starting fresh

Type Safety: Full TypeScript support with Zod validation

🚀 Quick Start
Prerequisites
Node.js 18.17 or later

npm, yarn, or pnpm

Installation
Clone the repository

bash
git clone https://github.com/yourusername/habit-tracker.git
cd habit-tracker
Install dependencies

bash
npm install
# or
yarn install
# or
pnpm install
Run the development server

bash
npm run dev
# or
yarn dev
# or
pnpm dev
Open your browser
Navigate to http://localhost:3000

📁 Project Structure
text
habit-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── page.tsx            # Main dashboard page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── atoms/              # Atomic components
│   │   │   ├── Button/
│   │   │   └── ThemeToggle/
│   │   └── molecules/          # Molecular components
│   │       └── QuickStats/
│   ├── lib/
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── schemas.ts          # Zod validation schemas
│   └── store/
│       ├── useStore.ts         # Zustand store implementation
│       └── types.ts            # Store-specific types
├── public/                     # Static assets
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── package.json
└── README.md
🛠️ Technology Stack
Frontend Framework: Next.js 14 (App Router)

Language: TypeScript

Styling: Tailwind CSS

State Management: Zustand

Validation: Zod

Icons: Lucide React

Theme: next-themes

UI Components: Custom with class-variance-authority

🧪 Development
Available Scripts
bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linter
npm run lint

# Format code with Prettier
npm run format
Adding a New Habit
Click "Add Sample Habit" to test with mock data

The application includes a mock habit "Morning Meditation" for testing

Habits automatically appear in "Today's Habits" based on schedule

Testing Store Actions
The application includes a debug panel to inspect store state:

Click "Show Debug" to view the current store state

Use "Reset Store" to clear all data

Toggle completion to see immediate state updates

📖 Usage Guide
Creating Habits
Click "Add Sample Habit" to start with a pre-configured habit

Customize the habit (future feature):

Set name and description

Choose color and icon

Define weekly goal (1-7 times per week)

Select schedule days

Add tags for organization

Tracking Progress
Daily Check-in:

View all scheduled habits for today

Click "Mark Complete" to log completion

Completed habits show green with checkmark

Progress Monitoring:

View daily completion percentage

Track weekly goal progress

See total completions over time

Theme Customization
Theme Toggle: Use the theme switcher in the top-right

☀️ Light mode

🌙 Dark mode

🖥️ System preference

🔧 Configuration
Environment Variables
Create a .env.local file in the root directory:

env
# Next.js configuration
NEXT_PUBLIC_APP_NAME="10/10 Habit Tracker"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
Tailwind Configuration
The project uses a custom color palette:

javascript
primary: {
  50: '#f0f9ff',
  100: '#e0f2fe',
  // ... more shades
  900: '#0c4a6e'
}
📱 Responsive Design
The application is fully responsive:

Desktop (≥1024px): 3-column layout with stats sidebar

Tablet (768px-1023px): 2-column layout

Mobile (<768px): Single column, optimized for touch

🧩 Component Architecture
Atomic Design Pattern
The project follows atomic design principles:

Atoms: Basic building blocks (Button, ThemeToggle)

Molecules: Groups of atoms working together (QuickStats)

Organisms: Complex UI sections (future: HabitList, CalendarView)

Templates: Page layouts (future)

Pages: Complete screens

State Management
The application uses Zustand for state management:

typescript
// Store structure
{
  habits: Habit[],           // All habits
  completions: Completion[], // Completion records
  preferences: UserPreferences, // User settings
  analytics: Analytics,      // Computed analytics
  // ... more state
}
Custom Hooks
typescript
// Get active (non-archived) habits
const activeHabits = useActiveHabits()

// Get today's completions
const todayCompletions = useTodayCompletions()

// Get analytics
const analytics = useAnalytics()

// Get store actions
const { addHabit, toggleCompletion, resetStore } = useStoreActions()
🔍 Type Safety
The project uses TypeScript with strict configuration:

Core Types
typescript
interface Habit {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  goal: number
  schedule: WeekSchedule
  // ... more properties
}
Validation Schemas
Zod schemas ensure data integrity:

typescript
const habitSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  goal: z.number().min(1, "Goal must be at least 1").max(7, "Goal cannot exceed 7"),
  // ... more validation
})
🚀 Deployment
Vercel (Recommended)
https://vercel.com/button

Push your code to GitHub

Import the repository to Vercel

Vercel will automatically detect Next.js and configure build settings

Your site will be deployed at https://your-project.vercel.app

Netlify
Build the project: npm run build

Deploy the out directory

Configure redirects for SPA routing

Docker Deployment
dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000
CMD ["npm", "start"]
📈 Future Enhancements
Planned Features
Habit creation form with full customization

Calendar view for monthly tracking

Streak tracking with longest/current streaks

Habit archives for completed/retired habits

Export data to CSV/JSON

Cloud sync with user accounts

Mobile app via React Native

Notifications for habit reminders

Social features for accountability partners

Achievements & badges for motivation

Technical Improvements
Unit tests with Jest and React Testing Library

E2E tests with Cypress

Performance monitoring with Lighthouse

Accessibility audit and improvements

PWA support for offline usage

Internationalization (i18n)

🤝 Contributing
We welcome contributions! Here's how you can help:

Fork the repository

Create a feature branch

bash
git checkout -b feature/amazing-feature
Commit your changes

bash
git commit -m 'Add amazing feature'
Push to the branch

bash
git push origin feature/amazing-feature
Open a Pull Request

Development Guidelines
Follow TypeScript strict mode

Use Tailwind CSS for styling

Maintain atomic design principles

Write descriptive commit messages

Update documentation as needed

Code Style
Components: Use functional components with TypeScript

State: Use Zustand for global state, React state for local

Styling: Use Tailwind CSS classes with className

Imports: Group imports (React, external, internal, assets)

Naming: PascalCase for components, camelCase for variables

🐛 Troubleshooting
Common Issues
Issue: Cannot find module '@/components/...'
Solution: Ensure TypeScript paths are configured in tsconfig.json

Issue: Hydration mismatch
Solution: Use useEffect for client-only code and suppressHydrationWarning where needed

Issue: LocalStorage is not defined
Solution: Zustand persistence uses createJSONStorage with conditional server check

Issue: Theme not persisting
Solution: Check browser localStorage and ensure next-themes is properly configured

Debugging
Enable Debug Panel: Click "Show Debug" to view store state

Check Console: Browser developer tools show errors and warnings

Reset Store: Use "Reset Store" to clear corrupted data

Clear Cache: Clear browser localStorage if issues persist

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Next.js Team for the amazing React framework

Zustand Maintainers for simple and effective state management

Tailwind CSS for the utility-first CSS framework

Lucide Icons for beautiful open-source icons

Atomic Design methodology by Brad Frost

📞 Support
GitHub Issues: Report bugs or request features

Documentation: This README and code comments

Community: (Future) Discord community for users

<div align="center"> <p>Built with ❤️ and ☕ by the 10/10 Habit Tracker team</p> <p>Start building better habits today!</p> </div>