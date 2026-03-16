import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import User from '@/models/User';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const borrowerId = searchParams.get('borrowerId');

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (borrowerId) query.borrowerId = borrowerId;

  try {
    const loans = await Loan.find(query).sort({ borrowedAt: -1 }).limit(200);
    return NextResponse.json(loans);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const borrowerId = typeof body.borrowerId === 'string' ? body.borrowerId : '';
    const toolIds = Array.isArray(body.toolIds) ? body.toolIds : [];

    const normalizedToolIds = toolIds.filter((t): t is string => typeof t === 'string' && t.length > 0);

    if (!borrowerId || normalizedToolIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tools = await Tool.find({ _id: { $in: normalizedToolIds }, status: true, isBorrowed: { $ne: true } });
    if (tools.length !== normalizedToolIds.length) {
      return NextResponse.json({ error: 'Some tools are unavailable' }, { status: 400 });
    }

    const now = new Date();
    const items = tools.map((tool) => ({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      borrowedAt: now,
      borrowedCondition: tool.condition || 'Good',
    }));

    const loan = await Loan.create({
      borrowerId: borrower._id,
      borrowerName: borrower.name,
      createdById: session.user.id,
      createdByName: session.user.name || 'Admin',
      status: 'Borrowed',
      items,
      borrowedAt: now,
    });

    await Tool.updateMany(
      { _id: { $in: tools.map((t) => t._id) } },
      {
        $set: {
          isBorrowed: true,
          currentBorrowerId: borrower._id,
          currentBorrowerName: borrower.name,
          currentLoanId: loan._id,
        },
      }
    );

    return NextResponse.json(loan, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}

