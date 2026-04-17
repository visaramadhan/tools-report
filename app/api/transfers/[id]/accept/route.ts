import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Transfer from '@/models/Transfer';
import Tool from '@/models/Tool';
import Loan from '@/models/Loan';
import User from '@/models/User';
import Report from '@/models/Report';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';
import { sendReportEmail, sendSystemEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await dbConnect();

  try {
    const transfer = await Transfer.findById(id);
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (transfer.status !== 'Pending') return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    if (String(transfer.toTechnicianId) !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await readFormData(req);
    const conditionRaw = formData.get('condition');
    const descriptionRaw = formData.get('description');
    const file = formData.get('photo') as File | null;

    if (conditionRaw !== 'Good' && conditionRaw !== 'Bad') {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
    }
    const acceptedDescription = typeof descriptionRaw === 'string' ? descriptionRaw : '';

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `transfer-accept-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const tool = await Tool.findById(transfer.toolId);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    const toUser = await User.findById(transfer.toTechnicianId);
    if (!toUser) return NextResponse.json({ error: 'Teknisi tujuan tidak valid' }, { status: 400 });

    const now = new Date();

    const fromLoanId = transfer.fromLoanId || tool.currentLoanId;
    if (fromLoanId) {
      const loan = await Loan.findById(fromLoanId);
      if (loan) {
        const idx = loan.items.findIndex((it) => String(it.toolId) === String(tool._id));
        if (idx >= 0 && !loan.items[idx]?.returnedAt) {
          loan.items[idx] = {
            ...loan.items[idx],
            returnedAt: now,
            returnCondition: conditionRaw,
            returnDescription: `Oper Tools ke ${toUser.name}${acceptedDescription ? ` - ${acceptedDescription}` : ''}`,
            returnPhotoUrl: photoUrl || undefined,
            status: 'Exchanged',
          };
          const remaining = loan.items.filter((it) => !it.returnedAt).length;
          loan.status = remaining === 0 ? 'Returned' : 'PartiallyReturned';
          loan.returnedAt = remaining === 0 ? now : undefined;
          await loan.save();
        }
      }
    }

    const newLoan = await Loan.create({
      borrowerId: toUser._id,
      borrowerName: toUser.name,
      createdById: transfer.fromTechnicianId,
      createdByName: transfer.fromTechnicianName,
      status: 'Borrowed',
      borrowedAt: now,
      items: [
        {
          toolId: tool._id,
          toolCode: tool.toolCode,
          toolName: tool.name,
          category: tool.category,
          subCategory: tool.subCategory,
          borrowedAt: now,
          borrowedCondition: conditionRaw,
          borrowedPhotoUrl: photoUrl || undefined,
          status: 'Borrowed',
        },
      ],
    });

    await Tool.findByIdAndUpdate(tool._id, {
      $set: {
        isBorrowed: true,
        currentBorrowerId: toUser._id,
        currentBorrowerName: toUser.name,
        currentLoanId: newLoan._id,
        condition: conditionRaw,
        status: conditionRaw === 'Bad' ? false : tool.status,
        lastCheckedAt: now,
      },
    });

    transfer.status = 'Accepted';
    transfer.acceptedAt = now;
    transfer.acceptedCondition = conditionRaw;
    transfer.acceptedDescription = acceptedDescription;
    transfer.acceptedPhotoUrl = photoUrl || undefined;
    await transfer.save();

    const report = await Report.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      technicianId: toUser._id,
      technicianName: toUser.name,
      examinerName: toUser.name,
      condition: conditionRaw,
      description: `Oper Tools dari ${transfer.fromTechnicianName} ke ${toUser.name}${transfer.description ? ` | Keterangan awal: ${transfer.description}` : ''}${acceptedDescription ? ` | Keterangan terima: ${acceptedDescription}` : ''}`,
      photoUrl: photoUrl || transfer.photoUrl || undefined,
    });
    await sendReportEmail(report);

    await sendSystemEmail({
      subject: `[TRANSFER] Accepted - ${tool.toolCode || ''} ${tool.name || ''}`.trim(),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#16a34a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Transfer Tools (Diterima)</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color:#666; width:150px;"><strong>Tools</strong></td><td style="padding: 6px 0;">: ${tool.toolCode || '-'} - ${tool.name || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Dari</strong></td><td style="padding: 6px 0;">: ${transfer.fromTechnicianName}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Ke</strong></td><td style="padding: 6px 0;">: ${toUser.name}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Kondisi Diterima</strong></td><td style="padding: 6px 0;">: ${conditionRaw}</td></tr>
          </table>
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    });

    return NextResponse.json({ transfer, newLoan });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to accept transfer', detail }, { status: 500 });
  }
}
