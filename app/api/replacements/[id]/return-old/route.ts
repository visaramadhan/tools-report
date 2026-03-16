import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Replacement, { ReplacementStatus } from '@/models/Replacement';
import Tool from '@/models/Tool';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await dbConnect();
  try {
    const repl = await Replacement.findById(id);
    if (!repl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (String(repl.requesterId) !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const form = await readFormData(req);
    const condition = form.get('condition');
    const description = form.get('description');
    const file = form.get('photo') as File | null;
    if (condition !== 'Good' && condition !== 'Bad') {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
    }
    if (repl.status !== 'ReplacementReceived') {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `repl-old-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    repl.status = 'OldToolInTransit' as ReplacementStatus;
    repl.oldShippedAt = new Date();
    repl.note = 'Tools lama sedang dikirim';
    await repl.save();

    // Tools lama sudah tidak dipegang teknisi
    await Tool.findByIdAndUpdate(repl.oldToolId, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
      },
    });

    return NextResponse.json({ replacement: repl, shippingPhotoUrl: photoUrl });
  } catch {
    return NextResponse.json({ error: 'Failed to return old tool' }, { status: 500 });
  }
}
