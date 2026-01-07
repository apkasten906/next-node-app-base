import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest): Promise<Response> {
  return new Response('Not Implemented', { status: 501 });
}

export async function POST(_req: NextRequest): Promise<Response> {
  return new Response('Not Implemented', { status: 501 });
}
