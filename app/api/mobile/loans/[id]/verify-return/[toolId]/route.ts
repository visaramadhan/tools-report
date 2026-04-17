import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id, toolId } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });

    const item = (loan.items || []).find((it: any) => String(it.toolId) === String(toolId) && !it.returnedAt);
    if (!item) return mobileJson(req, { error: 'Loan item tidak ditemukan / sudah dikembalikan' }, { status: 404 });

    const tool = await Tool.findById(toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });

    const formData = (await req.formData()) as FormData;
    const note = (formData.get('note') as string) || '';
    const file = (formData.get('photo') as File | null) || null;
    if (!file || !(file instanceof File) || file.size === 0 || file.name === 'undefined') {
      return mobileJson(req, { error: 'Foto penerimaan wajib diupload' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `receive-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    const photoUrl = `/uploads/${filename}`;

    const now = new Date();
    item.returnedAt = now;
    item.returnCondition = 'Bad';
    item.returnReceivedAt = now;
    item.returnReceivedNote = note.trim();
    item.returnReceivedPhotoUrl = photoUrl;
    item.status = 'Returned';

    const allReturned = loan.items.every((it: any) => !!it.returnedAt);
    const anyReturned = loan.items.some((it: any) => !!it.returnedAt);
    loan.status = allReturned ? 'Returned' : anyReturned ? 'PartiallyReturned' : 'Borrowed';
    if (allReturned) loan.returnedAt = now;

    await loan.save();

    await Tool.findByIdAndUpdate(toolId, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
        condition: 'Bad',
        status: false,
        lastCheckedAt: now,
      },
    });

    return mobileJson(req, loan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to verify return', detail }, { status: 500 });
  }
}

