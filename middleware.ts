import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes (never require auth)
const isPublicRoute = createRouteMatcher([
  '/',
  '/problems',
  '/auth(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/execute/health',   // Health check - public for monitoring
  '/api/webhooks(.*)',
]);

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/submissions(.*)',
  '/api/submissions(.*)',
  '/api/execute(.*)',
  '/api/users(.*)',
  '/leaderboard(.*)',
  '/problems/.+',        // Individual problem pages require login
]);

export default clerkMiddleware((auth, req) => {
  // Skip if explicitly public
  if (isPublicRoute(req)) return;
  // Protect if in protected list
  if (isProtectedRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};