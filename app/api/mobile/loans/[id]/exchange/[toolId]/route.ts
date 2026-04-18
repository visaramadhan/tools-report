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

export async function POST(req: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id, toolId } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });

    const oldItem = (loan.items || []).find((it: any) => String(it.toolId) === String(toolId) && !it.returnedAt);
    if (!oldItem) return mobileJson(req, { error: 'Loan item tidak ditemukan / sudah dikembalikan' }, { status: 404 });

    const oldTool = await Tool.findById(toolId);
    if (!oldTool) return mobileJson(req, { error: 'Tool lama tidak ditemukan' }, { status: 404 });
    const isBad = (oldTool.condition || 'Good') === 'Bad' || oldTool.status === false || oldItem.reportedCondition === 'Bad';
    if (!isBad) return mobileJson(req, { error: 'Tools belum berstatus BAD, tidak bisa diganti' }, { status: 400 });

    const formData = (await req.formData()) as FormData;
    const newToolId = String(formData.get('newToolId') || '');
    const note = String(formData.get('note') || '');
    const file = (formData.get('photo') as File | null) || null;

    if (!newToolId) return mobileJson(req, { error: 'Tool pengganti wajib dipilih' }, { status: 400 });
    if (!note.trim()) return mobileJson(req, { error: 'Keterangan/Resi wajib diisi' }, { status: 400 });
    if (!file || !(file instanceof File) || file.size === 0 || file.name === 'undefined') {
      return mobileJson(req, { error: 'Foto terakhir sebelum kirim wajib diupload' }, { status: 400 });
    }

    const newTool = await Tool.findOne({
      _id: newToolId,
      status: true,
      condition: { $ne: 'Bad' },
      isBorrowed: { $ne: true },
      isReservedForReplacement: { $ne: true },
    });
    if (!newTool) return mobileJson(req, { error: 'Tool pengganti tidak tersedia' }, { status: 400 });

    if (String(newTool.subCategory) !== String(oldTool.subCategory)) {
      return mobileJson(req, { error: 'Tool pengganti harus dari sub kategori yang sama' }, { status: 400 });
    }

    const { url: photoUrl } = await uploadFileToGridFs(file, 'ship');

    const now = new Date();
    const newItem: any = {
      toolId: newTool._id,
      toolCode: newTool.toolCode,
      toolName: newTool.name,
      category: newTool.category,
      subCategory: newTool.subCategory,
      borrowedAt: now,
      borrowedCondition: 'Good',
      borrowedPhotoUrl: photoUrl,
      shipmentNote: note.trim(),
      status: 'Borrowed',
    };
    loan.items.push(newItem);
    await loan.save();

    await Tool.findByIdAndUpdate(newTool._id, {
      $set: {
        isBorrowed: true,
        currentBorrowerId: loan.borrowerId,
        currentBorrowerName: loan.borrowerName,
        currentLoanId: loan._id,
      },
    });

    return mobileJson(req, loan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to exchange tool', detail }, { status: 500 });
  }
}
