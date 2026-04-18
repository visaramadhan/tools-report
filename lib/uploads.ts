import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

function sanitizeFilename(name: string) {
  return String(name || 'upload')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

export async function uploadFileToGridFs(file: File, prefix: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const safe = sanitizeFilename(file.name);
  const filename = `${prefix}-${Date.now()}-${safe || 'upload'}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  const contentType = String((file as any).type || 'application/octet-stream');

  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, { metadata: { contentType } });
    stream.on('error', reject);
    stream.on('finish', () => resolve());
    stream.end(buffer);
  });

  return { filename, url: `/uploads/${filename}` };
}

