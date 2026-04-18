import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendSystemEmail } from '@/lib/email';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'technician') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const tool = await Tool.findById(id);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== String(payload.sub)) {
      return mobileJson(req, { error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
    }
    if (tool.isSingleUse) {
      return mobileJson(req, { error: 'Tools sekali pakai tidak bisa ditransfer' }, { status: 400 });
    }
    if (tool.status === false || (tool.condition || 'Good') === 'Bad') {
      return mobileJson(req, { error: 'Tools BAD / tidak aktif tidak bisa ditransfer' }, { status: 400 });
    }

    const formData = (await req.formData()) as FormData;
    const toTechnicianId = String(formData.get('toTechnicianId') || '');
    const condition = String(formData.get('condition') || '') as 'Good' | 'Bad';
    const note = String(formData.get('note') || '');
    const file = (formData.get('photo') as File | null) || null;

    if (!toTechnicianId) return mobileJson(req, { error: 'Peminjam baru wajib dipilih' }, { status: 400 });
    if (condition !== 'Good' && condition !== 'Bad') return mobileJson(req, { error: 'Kondisi tidak valid' }, { status: 400 });
    if (!note.trim()) return mobileJson(req, { error: 'Keterangan/No. Resi wajib diisi' }, { status: 400 });
    if (!file || !(file instanceof File) || file.size === 0 || file.name === 'undefined') {
      return mobileJson(req, { error: 'Foto terakhir wajib diupload' }, { status: 400 });
    }

    const toUser = await User.findById(toTechnicianId);
    if (!toUser || !toUser.status || toUser.role !== 'technician') {
      return mobileJson(req, { error: 'User tujuan tidak valid' }, { status: 400 });
    }
    if (String(toUser._id) === String(payload.sub)) {
      return mobileJson(req, { error: 'Tidak bisa transfer ke diri sendiri' }, { status: 400 });
    }
    const existingPending = await Transfer.findOne({
      toolId: tool._id,
      status: 'Pending',
    });
    if (existingPending) {
      return mobileJson(req, { error: 'Tools sedang dalam proses transfer' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `transfer-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    const photoUrl = `/uploads/${filename}`;

    const fromLoanId = tool.currentLoanId ? new mongoose.Types.ObjectId(String(tool.currentLoanId)) : undefined;

    const transfer = await Transfer.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      fromTechnicianId: new mongoose.Types.ObjectId(payload.sub),
      fromTechnicianName: payload.name || 'Unknown',
      toTechnicianId: toUser._id,
      toTechnicianName: toUser.name,
      fromLoanId,
      condition,
      description: note.trim(),
      photoUrl,
      status: 'Pending',
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const fullPhotoUrl = photoUrl ? `${baseUrl}${photoUrl}` : '';
    sendSystemEmail({
      subject: `[TRANSFER] Pending - ${tool.toolCode || ''} ${tool.name || ''}`.trim(),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#0E5E7E; border-bottom: 2px solid #eee; padding-bottom: 10px;">Transfer Tools (Sedang Pengiriman)</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color:#666; width:150px;"><strong>Tools</strong></td><td style="padding: 6px 0;">: ${tool.toolCode || '-'} - ${tool.name || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Dari</strong></td><td style="padding: 6px 0;">: ${payload.name || 'Unknown'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Ke</strong></td><td style="padding: 6px 0;">: ${toUser.name}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Kondisi Kirim</strong></td><td style="padding: 6px 0;">: ${condition}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Resi/Keterangan</strong></td><td style="padding: 6px 0;">: ${note.trim()}</td></tr>
          </table>
          ${fullPhotoUrl ? `<div style="margin-top: 14px;"><p style="color:#666; margin-bottom: 8px;"><strong>Foto sebelum kirim</strong></p><img src="${fullPhotoUrl}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" /></div>` : ''}
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    }).catch(() => undefined);

    return mobileJson(req, { transferId: String(transfer._id) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to transfer tool', detail }, { status: 500 });
  }
}
