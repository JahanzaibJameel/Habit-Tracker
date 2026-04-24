import type { Metadata, Viewport } from 'next';

import { ErrorBoundary } from '@/components/atoms/ErrorBoundary';

import { Providers } from './providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Habit Tracker - Build Better Habits',
  description:
    'Track your daily habits, build streaks, and achieve your goals with our modern habit tracking app.',
  keywords: ['habits', 'tracker', 'productivity', 'goals', 'streaks'],
  authors: [{ name: 'Habit Tracker Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        {/* Enterprise-grade error monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Enterprise error monitoring setup
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  console.error('Global error:', e.error);
                });
                
                window.addEventListener('unhandledrejection', function(e) {
                  console.error('Unhandled promise rejection:', e.reason);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
