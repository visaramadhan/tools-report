import dbConnect from '@/lib/mongodb';
import Replacement from '@/models/Replacement';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await dbConnect();
  try {
    const payload = await verifyMobileToken(token);
    const repl = await Replacement.findById(id);
    if (!repl) return mobileJson(req, { error: 'Not found' }, { status: 404 });
    if (payload.role !== 'admin' && String(repl.requesterId) !== payload.sub) {
      return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    }
    if (repl.status !== 'ReplacementReceived') {
      return mobileJson(req, { error: 'Status tidak valid' }, { status: 400 });
    }

    const form = await readFormData(req);
    const condition = form.get('condition');
    const description = form.get('description');
    const file = form.get('photo') as File | null;
    if (condition !== 'Good' && condition !== 'Bad') {
      return mobileJson(req, { error: 'Invalid condition' }, { status: 400 });
    }

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `repl-old-${Date.now()}-${file.name.replace(/\\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    repl.status = 'OldToolInTransit';
    repl.oldShippedAt = new Date();
    repl.note = typeof description === 'string' && description.trim() ? description : 'Tools lama sedang dikirim';
    await repl.save();

    await Tool.findByIdAndUpdate(repl.oldToolId, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
      },
    });

    return mobileJson(req, { replacement: repl, shippingPhotoUrl: photoUrl });
  } catch {
    return mobileJson(req, { error: 'Failed to return old tool' }, { status: 500 });
  }
}
