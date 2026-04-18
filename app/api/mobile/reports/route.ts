import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import Tool from '@/models/Tool';
import Replacement from '@/models/Replacement';
import Loan from '@/models/Loan';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { sendReportEmail } from '@/lib/email';
import { sendSystemEmail } from '@/lib/email';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { uploadFileToGridFs } from '@/lib/uploads';

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
    await dbConnect();

    const formData = (await req.formData()) as FormData;
    const toolId = formData.get('toolId') as string;
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const description = (formData.get('description') as string) || '';
    const expectedPhotoCountRaw = formData.get('expectedPhotoCount');
    const files = formData.getAll('photo') as File[];

    if (!toolId || (condition !== 'Good' && condition !== 'Bad')) {
      return mobileJson(req, { error: 'Missing required fields' }, { status: 400 });
    }
    const expectedPhotoCount = typeof expectedPhotoCountRaw === 'string' ? Number(expectedPhotoCountRaw) : 0;
    if (expectedPhotoCount > 0 && (!files || files.length === 0)) {
      return mobileJson(req, { error: 'Foto tidak diterima server (upload gagal). Silakan coba ulang.' }, { status: 400 });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });

    if (!tool.status || tool.condition === 'Bad') {
      return mobileJson(
        req,
        { error: 'Tools berstatus BAD / tidak aktif. Tidak bisa dibuat laporan lagi sebelum diperbaiki.' },
        { status: 400 }
      );
    }
    
    // Technician only can report tools they borrow
    if (payload.role === 'technician') {
      if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== payload.sub) {
        return mobileJson(req, { error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
      }
    }

    const photoUrls: string[] = [];
    for (const file of files) {
      if (file && file.size > 0 && file.name !== 'undefined') {
        const uploaded = await uploadFileToGridFs(file, 'report');
        photoUrls.push(uploaded.url);
      }
    }

    const report = await Report.create({
      toolId,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      technicianId: payload.sub,
      technicianName: payload.name || 'Unknown',
      examinerName: payload.name || 'Unknown',
      condition,
      description,
      photoUrl: photoUrls[0] || '',
      photoUrls,
    });

    if (condition === 'Bad') {
      const now = new Date();
      await Tool.findByIdAndUpdate(tool._id, {
        $set: {
          condition: 'Bad',
          status: false,
          lastCheckedAt: now,
          ...(tool.isSingleUse
            ? {
                isBorrowed: false,
                currentBorrowerId: null,
                currentBorrowerName: null,
                currentLoanId: null,
              }
            : {}),
        },
      });

      try {
        if (tool.currentLoanId) {
          await Loan.updateOne(
            { _id: tool.currentLoanId, 'items.toolId': tool._id, 'items.returnedAt': { $exists: false } },
            {
              $set: {
                'items.$.reportedCondition': 'Bad',
                'items.$.reportedAt': now,
                ...(tool.isSingleUse
                  ? {
                      'items.$.returnedAt': now,
                      'items.$.returnCondition': 'Bad',
                      'items.$.returnDescription': 'Tools sekali pakai (BAD) - tidak perlu pengembalian',
                      'items.$.status': 'Returned',
                    }
                  : {}),
              },
            }
          );
        }
      } catch {}

      if (payload.role === 'technician' && !tool.isSingleUse) {
        const replacement = await Replacement.create({
          reportId: report._id,
          requesterId: payload.sub,
          requesterName: payload.name || 'Unknown',
          oldToolId: tool._id,
          oldToolCode: tool.toolCode,
          oldToolName: tool.name,
          oldLoanId: tool.currentLoanId || undefined,
          oldSubCategory: tool.subCategory || undefined,
          status: 'Requested',
        });
        await Report.findByIdAndUpdate(report._id, { $set: { replacementId: replacement._id } });
      }
    }

    const reportWithTool = await Report.findById(report._id).populate('toolId');
    const emailStatus = await sendReportEmail(reportWithTool || report);

    const plain = (report as any)?.toObject ? (report as any).toObject() : report;
    return mobileJson(req, { ...plain, emailStatus });
  } catch (e: any) {
    const detail = e instanceof Error ? e.message : 'Unknown error';
    console.error('Report error:', e);
    return mobileJson(req, { error: 'Gagal membuat laporan', detail }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const body = (await req.json().catch(() => ({}))) as any;
    const ids = Array.isArray(body?.ids) ? body.ids.map((x: any) => String(x)) : [];
    if (ids.length === 0) return mobileJson(req, { error: 'ids required' }, { status: 400 });

    const reports = await Report.find({ _id: { $in: ids } });
    const replacementIds = reports.map((r: any) => r.replacementId).filter(Boolean).map((x: any) => String(x));

    await Report.deleteMany({ _id: { $in: ids } });

    if (replacementIds.length > 0) {
      const repls = await Replacement.find({ _id: { $in: replacementIds } });
      const reservedToolIds = repls.map((r: any) => r.newToolId).filter(Boolean);
      await Replacement.deleteMany({ _id: { $in: replacementIds } });
      if (reservedToolIds.length > 0) {
        await Tool.updateMany(
          { _id: { $in: reservedToolIds } },
          { $set: { isReservedForReplacement: false, reservedReplacementId: null } }
        );
      }
    }

    const listHtml = reports
      .map((r: any) => `<li>${r.toolCode ? `${r.toolCode} - ` : ''}${r.toolName || ''} (${r.condition || '-'}) • ${new Date(r.createdAt).toLocaleString('id-ID')}</li>`)
      .join('');
    const emailStatus = await sendSystemEmail({
      subject: `[REPORT] Deleted (${ids.length})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#ef4444; border-bottom: 2px solid #eee; padding-bottom: 10px;">Report Dihapus</h2>
          <p style="margin-top: 12px; color:#374151;">Jumlah report dihapus: <strong>${ids.length}</strong></p>
          <p style="margin-top: 8px; color:#374151;">Dihapus oleh: <strong>${payload.name || 'Admin'}</strong></p>
          ${listHtml ? `<ul style="margin-top: 12px; color:#111827;">${listHtml}</ul>` : ''}
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    });

    return mobileJson(req, { deleted: ids.length, emailStatus });
  } catch (e: any) {
    const detail = e instanceof Error ? e.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to delete reports', detail }, { status: 500 });
  }
}
