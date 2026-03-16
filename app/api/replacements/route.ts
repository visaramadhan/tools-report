import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Replacement from '@/models/Replacement';
import Report from '@/models/Report';
import Tool from '@/models/Tool';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const requesterId = searchParams.get('requesterId');

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (requesterId) query.requesterId = requesterId;

  try {
    // Admin can see all, user can only see own
    if (session.user.role !== 'admin') {
      query.requesterId = session.user.id;
    }
    const replacements = await Replacement.find(query).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(replacements);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch replacements' }, { status: 500 });
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
    const reportId = typeof body.reportId === 'string' ? body.reportId : '';
    if (!reportId) return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });

    const existing = await Replacement.findOne({ reportId });
    if (existing) return NextResponse.json(existing);

    const report = await Report.findById(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (report.condition !== 'Bad') return NextResponse.json({ error: 'Only Bad reports can be replaced' }, { status: 400 });

    const tool = await Tool.findById(report.toolId);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    const replacement = await Replacement.create({
      reportId: report._id,
      requesterId: report.technicianId,
      requesterName: report.technicianName,
      oldToolId: tool._id,
      oldToolCode: tool.toolCode,
      oldToolName: tool.name,
      status: 'Requested',
    });

    await Report.findByIdAndUpdate(report._id, { $set: { replacementId: replacement._id } });

    return NextResponse.json(replacement, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create replacement' }, { status: 500 });
  }
}
