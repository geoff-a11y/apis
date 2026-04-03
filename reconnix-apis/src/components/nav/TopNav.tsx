'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Overview' },
  { href: '/models', label: 'Models' },
  { href: '/fingerprints', label: 'Fingerprints' },
  { href: '/dimensions', label: 'Dimensions' },
  { href: '/score', label: 'Page Assessment' },
  { href: '/apis/benchmarks', label: 'Page Benchmarks' },
  { href: '/apis/pricing', label: 'Pricing Study' },
  { href: '/apis/page-optimizer-v2', label: 'Page Optimizer' },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="sticky top-0 z-50 h-16"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span
                className="font-display text-xl"
                style={{ color: 'var(--color-text)' }}
              >
                Reconnix
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span
                className="font-semibold text-lg"
                style={{ color: 'var(--color-accent)' }}
              >
                APIS
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Tab style like DSS */}
          <div className="hidden md:flex items-center gap-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium transition-colors relative"
                style={{
                  color: isActive(link.href)
                    ? 'var(--color-text)'
                    : 'var(--color-text-soft)',
                  borderBottom: isActive(link.href)
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://osf.io/et4nf"
              target="_blank"
              rel="noopener noreferrer"
              className="badge badge-green text-xs"
            >
              Pre-Registered
            </a>
            <Link
              href="/methodology"
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--color-text-soft)' }}
            >
              Methodology
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-text)' }}
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderBottom: '1px solid var(--color-border-subtle)'
          }}
        >
          <div className="px-4 py-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm font-medium rounded-md transition-colors"
                style={{
                  color: isActive(link.href)
                    ? 'var(--color-text)'
                    : 'var(--color-text-soft)',
                  backgroundColor: isActive(link.href)
                    ? 'var(--color-surface)'
                    : 'transparent',
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div
              className="pt-2 mt-2"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}
            >
              <Link
                href="/methodology"
                className="block px-3 py-2 text-sm"
                style={{ color: 'var(--color-text-soft)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Methodology
              </Link>
              <a
                href="https://osf.io/et4nf"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-sm"
                style={{ color: 'var(--color-text-soft)' }}
              >
                OSF Registration
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
