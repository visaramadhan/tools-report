import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Report from '@/models/Report';
import Tool from '@/models/Tool';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendReportEmail, sendSystemEmail } from '@/lib/email';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'technician') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const transfer = await Transfer.findById(id);
    if (!transfer) return mobileJson(req, { error: 'Transfer not found' }, { status: 404 });
    if (String(transfer.toTechnicianId) !== String(payload.sub)) return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    if (transfer.status !== 'Pending') return mobileJson(req, { error: 'Transfer sudah diproses' }, { status: 400 });

    const formData = (await req.formData()) as FormData;
    const condition = String(formData.get('condition') || '') as 'Good' | 'Bad';
    const note = String(formData.get('note') || '');
    const file = (formData.get('photo') as File | null) || null;

    if (condition !== 'Good' && condition !== 'Bad') return mobileJson(req, { error: 'Kondisi tidak valid' }, { status: 400 });
    if (!file || !(file instanceof File) || file.size === 0 || file.name === 'undefined') {
      return mobileJson(req, { error: 'Foto saat diterima wajib diupload' }, { status: 400 });
    }

    const tool = await Tool.findById(transfer.toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== String(transfer.fromTechnicianId)) {
      return mobileJson(req, { error: 'Tool sudah tidak di peminjam asal' }, { status: 400 });
    }

    const toUser = await User.findById(transfer.toTechnicianId);
    if (!toUser || !toUser.status || toUser.role !== 'technician') {
      return mobileJson(req, { error: 'Peminjam baru tidak valid' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `transfer-accept-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    const photoUrl = `/uploads/${filename}`;

    const now = new Date();

    if (transfer.fromLoanId) {
      const fromLoan = await Loan.findById(transfer.fromLoanId);
      if (fromLoan) {
        const item = (fromLoan.items || []).find((it: any) => String(it.toolId) === String(tool._id) && !it.returnedAt);
        if (item) {
          item.returnedAt = now;
          item.returnCondition = condition;
          item.returnDescription = `Transfer diterima ${toUser.name}${note.trim() ? ` | ${note.trim()}` : ''}`;
          item.returnPhotoUrl = photoUrl;
          item.status = 'Returned';
        }
        const allReturned = fromLoan.items.every((it: any) => !!it.returnedAt);
        const anyReturned = fromLoan.items.some((it: any) => !!it.returnedAt);
        fromLoan.status = allReturned ? 'Returned' : anyReturned ? 'PartiallyReturned' : 'Borrowed';
        if (allReturned) fromLoan.returnedAt = now;
        await fromLoan.save();
      }
    }

    let toLoan = await Loan.findOne({ borrowerId: toUser._id, status: 'Borrowed' }).sort({ borrowedAt: -1 });
    if (!toLoan) {
      toLoan = await Loan.create({
        borrowerId: toUser._id,
        borrowerName: toUser.name,
        createdById: payload.sub,
        createdByName: payload.name || toUser.name,
        status: 'Borrowed',
        borrowedAt: now,
        items: [],
      });
    }

    toLoan.items.push({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      borrowedAt: now,
      borrowedCondition: condition,
      borrowedPhotoUrl: photoUrl,
      shipmentNote: transfer.description || '',
      status: 'Borrowed',
    } as any);
    await toLoan.save();

    await Tool.findByIdAndUpdate(tool._id, {
      $set: {
        isBorrowed: true,
        currentBorrowerId: toUser._id,
        currentBorrowerName: toUser.name,
        currentLoanId: toLoan._id,
        condition,
        status: condition === 'Bad' ? false : true,
        lastCheckedAt: now,
      },
    });

    transfer.status = 'Accepted';
    transfer.acceptedAt = now;
    transfer.acceptedCondition = condition;
    transfer.acceptedDescription = note.trim() || undefined;
    transfer.acceptedPhotoUrl = photoUrl;
    await transfer.save();

    const report = await Report.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      technicianId: toUser._id,
      technicianName: toUser.name,
      examinerName: payload.name || toUser.name,
      condition,
      description: `Transfer Tools dari ${transfer.fromTechnicianName} ke ${toUser.name}${transfer.description ? ` | Pengiriman: ${transfer.description}` : ''}${note.trim() ? ` | Diterima: ${note.trim()}` : ''}`,
      photoUrl,
      photoUrls: [photoUrl],
    });
    await sendReportEmail(report);

    const emailStatus = await sendSystemEmail({
      subject: `[TRANSFER] Accepted - ${tool.toolCode || ''} ${tool.name || ''}`.trim(),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#16a34a; border-bottom: 2px solid #eee; padding-bottom: 10px;">Transfer Tools (Diterima)</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color:#666; width:150px;"><strong>Tools</strong></td><td style="padding: 6px 0;">: ${tool.toolCode || '-'} - ${tool.name || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Dari</strong></td><td style="padding: 6px 0;">: ${transfer.fromTechnicianName}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Ke</strong></td><td style="padding: 6px 0;">: ${toUser.name}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Kondisi Diterima</strong></td><td style="padding: 6px 0;">: ${condition}</td></tr>
            ${transfer.description ? `<tr><td style="padding: 6px 0; color:#666;"><strong>Resi/Keterangan</strong></td><td style="padding: 6px 0;">: ${transfer.description}</td></tr>` : ''}
          </table>
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    });

    return mobileJson(req, { ok: true, emailStatus });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to accept transfer', detail }, { status: 500 });
  }
}
