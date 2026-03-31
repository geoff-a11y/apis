import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/nav/TopNav';
import { StatsStrip } from '@/components/nav/StatsStrip';
import { ContextProvider } from '@/lib/context';

export const metadata: Metadata = {
  title: 'APIS - Machine Likeability Intelligence',
  description: 'Empirical measurement of how AI agents evaluate content for purchase recommendations',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen">
        <ContextProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            Skip to main content
          </a>
          <TopNav />
          <StatsStrip />
          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" tabIndex={-1}>
            {children}
          </main>
        </ContextProvider>
      </body>
    </html>
  );
}
