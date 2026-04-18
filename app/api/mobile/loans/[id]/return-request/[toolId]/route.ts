import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { uploadFileToGridFs } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id, toolId } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'technician') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });
    if (String(loan.borrowerId) !== String(payload.sub)) return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    const tool = await Tool.findById(toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== String(payload.sub)) {
      return mobileJson(req, { error: 'Tool tidak sedang dipinjam oleh user ini' }, { status: 403 });
    }
    if ((tool.condition || 'Good') !== 'Bad') {
      return mobileJson(req, { error: 'Tool belum berstatus BAD. Return request hanya untuk tool BAD.' }, { status: 400 });
    }

    const formData = (await req.formData()) as FormData;
    const note = (formData.get('note') as string) || '';
    const file = (formData.get('photo') as File | null) || null;

    if (!note.trim()) return mobileJson(req, { error: 'Keterangan/Resi wajib diisi' }, { status: 400 });
    if (!file || !(file instanceof File) || file.size === 0 || file.name === 'undefined') {
      return mobileJson(req, { error: 'Foto terakhir wajib diupload' }, { status: 400 });
    }

    const item = (loan.items || []).find((it: any) => String(it.toolId) === String(toolId) && !it.returnedAt);
    if (!item) return mobileJson(req, { error: 'Loan item tidak ditemukan / sudah dikembalikan' }, { status: 404 });

    const { url: photoUrl } = await uploadFileToGridFs(file, 'return');

    const now = new Date();
    item.status = 'Returning';
    item.returnShipmentRequestedAt = now;
    item.returnShipmentNote = note.trim();
    item.returnShipmentPhotoUrl = photoUrl;

    await loan.save();

    await Tool.findByIdAndUpdate(toolId, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
      },
    });

    return mobileJson(req, loan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to request return', detail }, { status: 500 });
  }
}
