import dbConnect from '@/lib/mongodb';
import { mobileCorsHeaders } from '@/lib/mobileCors';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: mobileCorsHeaders(req) });
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const filename = Array.isArray(path) ? path.join('/') : String(path || '');

  if (!filename) {
    return new NextResponse('Not found', { status: 404, headers: mobileCorsHeaders(req) });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) {
    return new NextResponse('Not found', { status: 404, headers: mobileCorsHeaders(req) });
  }

  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  const files = await bucket.find({ filename }).limit(1).toArray();
  const file = files[0];
  if (!file) {
    return new NextResponse('Not found', { status: 404, headers: mobileCorsHeaders(req) });
  }

  const downloadStream = bucket.openDownloadStream(file._id);
  const chunks: Buffer[] = [];
  for await (const chunk of downloadStream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  const headers = new Headers(mobileCorsHeaders(req));
  headers.set('Content-Type', String((file as any)?.metadata?.contentType || 'application/octet-stream'));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(body, { status: 200, headers });
}
