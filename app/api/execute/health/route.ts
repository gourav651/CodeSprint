import { NextResponse } from 'next/server';
import { healthCheck, HealthStatus } from '@/lib/execute/client';

/**
 * GET /api/execute/health
 *
 * Health check endpoint for the code execution backend.
 * Useful for monitoring and debugging deployment connectivity.
 *
 * Response:
 *   200: { status: "ok", backend: "piston", url: "...", runtimes: [...] }
 *   503: { status: "error", backend: "piston", url: "...", message: "..." }
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const result = await healthCheck();

  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
  });
}
