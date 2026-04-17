import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import mongoose from 'mongoose';
import { sendReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

type Item = {
  toolId: string;
  condition: 'Good' | 'Bad';
  description?: string;
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await dbConnect();
  try {
    const body = (await req.json()) as { items: Item[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const invalidItems = body.items.filter((it) => {
      if (!it || typeof it.toolId !== 'string') return true;
      if (it.toolId === 'undefined' || it.toolId === 'null') return true;
      if (!mongoose.isValidObjectId(it.toolId)) return true;
      if (it.condition !== 'Good' && it.condition !== 'Bad') return true;
      return false;
    });
    if (invalidItems.length > 0) {
      return NextResponse.json({ error: 'Invalid items', invalidItems }, { status: 400 });
    }

    const loan = await Loan.findById(id);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

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
            examinerName: session.user.name || 'Admin',
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
    return NextResponse.json({ message: 'Bulk returned', loan });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    const name = error instanceof Error ? error.name : 'Error';
    console.error('Bulk return error:', error);
    return NextResponse.json({ error: 'Failed bulk return', name, detail }, { status: 500 });
  }
}
