import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Replacement from '@/models/Replacement';
import Tool from '@/models/Tool';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await dbConnect();

  try {
    const repl = await Replacement.findById(id);
    if (!repl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (String(repl.requesterId) !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (repl.status === 'OldReturned' || repl.status === 'Verified' || repl.status === 'Completed' || repl.status === 'Rejected') {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const tool = await Tool.findById(repl.oldToolId);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== session.user.id) {
      return NextResponse.json({ error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
    }

    const formData = await readFormData(req);
    const descriptionRaw = formData.get('description');
    const file = formData.get('photo') as File | null;
    const description = typeof descriptionRaw === 'string' ? descriptionRaw : '';

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `damaged-return-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const now = new Date();
    repl.status = 'OldToolInTransit';
    repl.returnCondition = 'Bad';
    repl.returnDescription = description;
    repl.returnPhotoUrl = photoUrl || undefined;
    repl.oldShippedAt = now;
    await repl.save();

    return NextResponse.json(repl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to return damaged tool', detail }, { status: 500 });
  }
}
