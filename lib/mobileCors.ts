import { NextResponse } from 'next/server';

function isAllowedOrigin(origin: string) {
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  if (/^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) return true;
  if (/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)) return true;
  return false;
}

export function mobileCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function mobileOptions(req: Request) {
  return new NextResponse(null, { status: 204, headers: mobileCorsHeaders(req) });
}

export function mobileJson(req: Request, data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: mobileCorsHeaders(req) });
}

