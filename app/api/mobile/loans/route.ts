import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { writeFile } from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const borrowerId = searchParams.get('borrowerId');

    const query: any = {};
    if (payload.role !== 'admin') {
      query.borrowerId = new mongoose.Types.ObjectId(payload.sub);
    } else if (borrowerId) {
      query.borrowerId = new mongoose.Types.ObjectId(borrowerId);
    }

    if (status && status !== 'all') query.status = status;

    const loans = await Loan.find(query).sort({ borrowedAt: -1 }).limit(200);
    return mobileJson(req, loans);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    await dbConnect();

    const contentType = req.headers.get('content-type') || '';
    let borrowerId = '';
    let itemDetails: Array<{ toolId: string; borrowedCondition: 'Good' | 'Bad'; photoIndex?: number }> = [];
    let photos: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      borrowerId = payload.role === 'admin' ? String(formData.get('borrowerId') || '') : payload.sub;
      const itemsJson = formData.get('items') as string;
      itemDetails = JSON.parse(itemsJson || '[]') as any[];
      photos = formData.getAll('photos') as File[];
    } else {
      const body = await req.json();
      borrowerId = payload.role === 'admin' ? String(body.borrowerId || '') : payload.sub;
      const toolIds = Array.isArray(body.toolIds) ? body.toolIds.filter(Boolean) : [];
      itemDetails = toolIds.map((id: string) => ({ toolId: id, borrowedCondition: 'Good' }));
    }

    if (!borrowerId) return mobileJson(req, { error: 'Borrower wajib diisi' }, { status: 400 });
    const borrower = await User.findById(borrowerId);
    if (!borrower || !borrower.status) return mobileJson(req, { error: 'User tidak ditemukan' }, { status: 400 });

    if (itemDetails.length === 0) {
      return mobileJson(req, { error: 'Pilih minimal 1 tools' }, { status: 400 });
    }

    const toolIds = itemDetails.map((it) => it.toolId);
    const tools = await Tool.find({
      _id: { $in: toolIds },
      status: true,
      condition: { $ne: 'Bad' },
      isBorrowed: { $ne: true },
      isReservedForReplacement: { $ne: true },
    });
    if (tools.length !== toolIds.length) {
      return mobileJson(req, { error: 'Ada tools yang tidak tersedia / sudah dipinjam' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const loanAt = new Date();
    const loanItems: any[] = [];

    for (let i = 0; i < itemDetails.length; i++) {
      const detail = itemDetails[i];
      const tool = tools.find((t) => t._id.toString() === detail.toolId)!;
      let photoUrl = '';

      if (typeof detail.photoIndex === 'number' && photos[detail.photoIndex]) {
        const file = photos[detail.photoIndex];
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `loan-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        photoUrl = `/uploads/${filename}`;
      }

      loanItems.push({
        toolId: tool._id,
        toolCode: tool.toolCode,
        toolName: tool.name,
        category: tool.category,
        subCategory: tool.subCategory,
        borrowedAt: loanAt,
        borrowedCondition: detail.borrowedCondition || 'Good',
        status: 'Borrowed',
        borrowedPhotoUrl: photoUrl,
      });
    }

    const loan = await Loan.create({
      borrowerId: borrower._id,
      borrowerName: borrower.name,
      createdById: payload.sub,
      createdByName: payload.name || borrower.name,
      status: 'Borrowed',
      borrowedAt: loanAt,
      items: loanItems,
    });

    await Tool.updateMany(
      { _id: { $in: toolIds } },
      {
        $set: {
          isBorrowed: true,
          currentBorrowerId: borrower._id,
          currentBorrowerName: borrower.name,
          currentLoanId: loan._id,
        },
      }
    );

    return mobileJson(req, loan, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to create loan', detail }, { status: 500 });
  }
}
