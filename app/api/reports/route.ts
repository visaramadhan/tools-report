import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import Tool from '@/models/Tool';
import { auth } from '@/auth';
import Replacement from '@/models/Replacement';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import { sendReportEmail } from '@/lib/email';
import { readFormData } from '@/lib/formData';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  
  const { searchParams } = new URL(req.url);
  const toolId = searchParams.get('toolId');
  const technicianId = searchParams.get('technicianId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const condition = searchParams.get('condition');

  const query: any = {};
  
  // Role based filtering
  if (session.user.role === 'technician') {
    query.technicianId = session.user.id;
  } else if (technicianId) {
    query.technicianId = technicianId;
  }

  if (toolId) query.toolId = toolId;
  if (condition === 'Good' || condition === 'Bad') query.condition = condition;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  try {
    const reports = await Report.find(query).sort({ createdAt: -1 });
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'technician') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  
  try {
    const formData = await readFormData(req);
    const toolId = formData.get('toolId') as string;
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const description = formData.get('description') as string;
    const file = formData.get('photo') as File | null;

    if (!toolId || !condition) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate tool exists and is currently borrowed by this technician
    const tool = await Tool.findById(toolId);
    if (!tool) {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== session.user.id) {
      return NextResponse.json({ error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
    }

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create unique filename
      const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      const filepath = path.join(uploadDir, filename);
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(filepath, buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const report = await Report.create({
      toolId,
      toolCode: tool.toolCode,
      toolName: tool.name,
      technicianId: session.user.id,
      technicianName: session.user.name || 'Unknown',
      condition,
      description,
      photoUrl,
    });
    
    if (condition === 'Bad') {
        const existing = await Replacement.findOne({ reportId: report._id });
        if (!existing) {
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
        }
        // Send email
        await sendReportEmail(report);
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
