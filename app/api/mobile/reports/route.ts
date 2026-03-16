import dbConnect from '@/lib/mongodb';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import Report from '@/models/Report';
import Tool from '@/models/Tool';
import Replacement from '@/models/Replacement';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { sendReportEmail } from '@/lib/email';
import { readFormData } from '@/lib/formData';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

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
    const toolId = searchParams.get('toolId');
    const condition = searchParams.get('condition');

    const query: Record<string, unknown> = {};
    if (toolId) query.toolId = toolId;
    if (condition === 'Good' || condition === 'Bad') query.condition = condition;

    if (payload.role === 'admin') {
      const reports = await Report.find(query).sort({ createdAt: -1 }).limit(200);
      return mobileJson(req, reports);
    }
    query.technicianId = payload.sub;
    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(200);
    return mobileJson(req, reports);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'technician') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const formData = await readFormData(req);
    const toolId = formData.get('toolId') as string;
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const description = (formData.get('description') as string) || '';
    const file = formData.get('photo') as File | null;

    if (!toolId || (condition !== 'Good' && condition !== 'Bad')) {
      return mobileJson(req, { error: 'Missing required fields' }, { status: 400 });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== payload.sub) {
      return mobileJson(req, { error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
    }

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name.replace(/\\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const report = await Report.create({
      toolId,
      toolCode: tool.toolCode,
      toolName: tool.name,
      technicianId: payload.sub,
      technicianName: payload.name || 'Unknown',
      condition,
      description,
      photoUrl,
    });

    if (condition === 'Bad') {
      const replacement = await Replacement.create({
        reportId: report._id,
        requesterId: payload.sub,
        requesterName: payload.name || 'Unknown',
        oldToolId: tool._id,
        oldToolCode: tool.toolCode,
        oldToolName: tool.name,
        status: 'Requested',
      });
      await Report.findByIdAndUpdate(report._id, { $set: { replacementId: replacement._id } });
      await sendReportEmail(report);
    }

    return mobileJson(req, report, { status: 201 });
  } catch {
    return mobileJson(req, { error: 'Failed to create report' }, { status: 500 });
  }
}
