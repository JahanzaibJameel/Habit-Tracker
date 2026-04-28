import { Inter } from 'next/font/google';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/atoms/ErrorBoundary';

import { Providers } from './providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

export const metadata = {
  title: 'Habit Tracker - Build Better Habits',
  description:
    'Track your daily habits, build streaks, and achieve your goals with our modern habit tracking app.',
  keywords: ['habits', 'tracker', 'productivity', 'goals', 'streaks'],
  authors: [{ name: 'Habit Tracker Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

