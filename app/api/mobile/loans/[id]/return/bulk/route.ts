import dbConnect from '@/lib/mongodb';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import mongoose from 'mongoose';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

type Item = {
  toolId: string;
  condition: 'Good' | 'Bad';
  description?: string;
};

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyMobileToken(token).catch(() => null);
  if (!payload || payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await dbConnect();
  try {
    const body = (await req.json()) as { items: Item[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return mobileJson(req, { error: 'No items' }, { status: 400 });
    }
    const invalidItems = body.items.filter((it) => {
      if (!it || typeof it.toolId !== 'string') return true;
      if (!mongoose.isValidObjectId(it.toolId)) return true;
      if (it.condition !== 'Good' && it.condition !== 'Bad') return true;
      return false;
    });
    if (invalidItems.length > 0) {
      return mobileJson(req, { error: 'Invalid items', invalidItems }, { status: 400 });
    }

    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });

    const toolIds = body.items.map((i) => i.toolId);
    const tools = await Tool.find({ _id: { $in: toolIds } });
    const toolsById = new Map(tools.map((t) => [String(t._id), t]));

    const now = new Date();
    for (const itm of body.items) {
      const idx = loan.items.findIndex((it) => String(it.toolId) === itm.toolId);
      if (idx < 0) continue;
      if (loan.items[idx]?.returnedAt) continue;
      const tool = toolsById.get(itm.toolId);
      const isAlreadyBad = tool?.condition === 'Bad';
      const finalCondition: 'Good' | 'Bad' = isAlreadyBad ? 'Bad' : itm.condition;
      loan.items[idx] = {
        ...loan.items[idx],
        returnedAt: now,
        returnCondition: finalCondition,
        returnDescription: isAlreadyBad ? '' : itm.description || '',
        status: 'Returned',
      };
      if (tool) {
        await Tool.findByIdAndUpdate(tool._id, {
          $set: {
            isBorrowed: false,
            currentBorrowerId: null,
            currentBorrowerName: null,
            currentLoanId: null,
            condition: finalCondition,
            status: finalCondition === 'Bad' ? false : tool.status,
            lastCheckedAt: now,
          },
        });
        if (!isAlreadyBad) {
          const report = await Report.create({
            toolId: tool._id,
            toolCode: tool.toolCode,
            toolName: tool.name,
            category: tool.category,
            subCategory: tool.subCategory,
            technicianId: loan.borrowerId,
            technicianName: loan.borrowerName,
            examinerName: payload.name || 'Admin',
            condition: finalCondition,
            description: itm.description || '',
          });
          await sendReportEmail(report);
        }
      }
    }

    const remaining = loan.items.filter((it) => !it.returnedAt).length;
    loan.status = remaining === 0 ? 'Returned' : 'PartiallyReturned';
    loan.returnedAt = remaining === 0 ? now : undefined;
    await loan.save();

    return mobileJson(req, { message: 'Bulk returned', loan });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed bulk return', detail }, { status: 500 });
  }
}
