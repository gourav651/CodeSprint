import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/problems',          // Problems list page only (not individual problems)
  '/auth(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/execute/health(.*)', // Health check for monitoring
  '/api/webhooks(.*)',
]);

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/submissions(.*)',
  '/api/submissions(.*)',
  '/api/execute(.*)',
  '/api/users(.*)',
  '/leaderboard(.*)',
  '/problems/.+',        // Individual problem pages require login
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) return;
  // Protect all other routes
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};