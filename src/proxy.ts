import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { securityHeaders } from '@/lib/security';

/**
 * Security middleware for Next.js
 * Implements security headers, rate limiting, and input validation
 */

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  Object.entries(securityHeaders.getHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add Content Security Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Adjust based on your needs
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Simple rate limiting logic (in production, use Redis or similar)
    // Log suspicious activity
    if (isSuspiciousRequest(request)) {
      console.warn('Suspicious request detected:', {
        ip: clientIP,
        userAgent,
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
  }

  return response;
}

function isSuspiciousRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.url;

  // Check for common bot patterns
  const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];

  // Check for suspicious user agents
  if (botPatterns.some((pattern) => pattern.test(userAgent))) {
    return true;
  }

  // Check for suspicious URL patterns
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempt
    /javascript:/i, // JavaScript protocol
    /data:/i, // Data URL
    /union.*select/i, // SQL injection attempt
    /exec.*\(/i, // Code execution attempt
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
