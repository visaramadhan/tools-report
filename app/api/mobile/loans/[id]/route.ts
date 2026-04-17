import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    await dbConnect();
    const { id } = await params;
    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });
    if (payload.role !== 'admin' && loan.borrowerId.toString() !== payload.sub) {
      return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    }
    return mobileJson(req, loan);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const { id } = await params;
    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { toolIds?: string[] };
    const toolIds = Array.isArray(body.toolIds) ? body.toolIds.filter(Boolean) : [];
    if (toolIds.length === 0) return mobileJson(req, { error: 'Pilih minimal 1 tools' }, { status: 400 });

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

    const newItems = tools.map((t) => ({
      toolId: t._id.toString(),
      toolCode: t.toolCode,
      toolName: t.name,
      category: t.category,
      subCategory: t.subCategory,
      borrowedAt: new Date(),
      borrowedCondition: 'Good',
      status: 'Borrowed',
    }));

    loan.items.push(...(newItems as any));
    if (loan.status === 'Returned') {
      loan.status = 'PartiallyReturned';
    }
    await loan.save();

    await Tool.updateMany(
      { _id: { $in: toolIds } },
      {
        $set: {
          isBorrowed: true,
          currentBorrowerId: loan.borrowerId,
          currentBorrowerName: loan.borrowerName,
          currentLoanId: loan._id,
        },
      }
    );

    return mobileJson(req, loan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to update loan', detail }, { status: 500 });
  }
}
