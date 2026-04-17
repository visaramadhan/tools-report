import dbConnect from '@/lib/mongodb';
import Replacement, { ReplacementStatus } from '@/models/Replacement';
import Tool from '@/models/Tool';
import Loan from '@/models/Loan';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { readFormData } from '@/lib/formData';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

function isReplacementStatus(value: string): value is ReplacementStatus {
  return (
    value === 'Requested' ||
    value === 'Approved' ||
    value === 'Shipped' ||
    value === 'ReplacementReceived' ||
    value === 'OldToolInTransit' ||
    value === 'OldReturned' ||
    value === 'Verified' ||
    value === 'Completed' ||
    value === 'Rejected'
  );
}

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyMobileToken(token).catch(() => null);
  if (!payload || payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await dbConnect();

  try {
    const replacement = await Replacement.findById(id);
    if (!replacement) return mobileJson(req, { error: 'Replacement not found' }, { status: 404 });

    const contentType = req.headers.get('content-type') || '';
    const now = new Date();

    if (contentType.includes('multipart/form-data')) {
      const formData = await readFormData(req);
      const statusRaw = formData.get('status');
      const returnConditionRaw = formData.get('returnCondition');
      const returnDescriptionRaw = formData.get('returnDescription');
      const noteRaw = formData.get('note');
      const newToolIdRaw = formData.get('newToolId');
      const file = formData.get('returnPhoto') as File | null;
      const shipFile = formData.get('shipPhoto') as File | null;

      if (typeof statusRaw !== 'string' || !isReplacementStatus(statusRaw)) {
        return mobileJson(req, { error: 'Invalid status' }, { status: 400 });
      }

      replacement.status = statusRaw;
      replacement.note = typeof noteRaw === 'string' ? noteRaw : replacement.note;

      if (statusRaw === 'Shipped') {
        const newToolId = typeof newToolIdRaw === 'string' ? newToolIdRaw : '';
        if (!newToolId) return mobileJson(req, { error: 'newToolId required for Shipped' }, { status: 400 });
        if (!shipFile || shipFile.size === 0 || shipFile.name === 'undefined') {
          return mobileJson(req, { error: 'Foto barang yang akan dikirim wajib diupload' }, { status: 400 });
        }

        const oldSub = replacement.oldSubCategory ? String(replacement.oldSubCategory) : '';
        const newTool = await Tool.findOne({
          _id: newToolId,
          status: true,
          condition: { $ne: 'Bad' },
          isBorrowed: { $ne: true },
          isReservedForReplacement: { $ne: true },
        });
        if (!newTool) return mobileJson(req, { error: 'New tool unavailable' }, { status: 400 });
        if (oldSub && String(newTool.subCategory) !== oldSub) {
          return mobileJson(req, { error: 'Tools pengganti harus sub kategori yang sama' }, { status: 400 });
        }

        const bytes = await shipFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `replacement-ship-${Date.now()}-${shipFile.name.replace(/\\s/g, '_')}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);
        const shippedPhotoUrl = `/uploads/${filename}`;
        replacement.shippedPhotoUrl = shippedPhotoUrl;

        replacement.newToolId = newTool._id;
        replacement.newToolCode = newTool.toolCode;
        replacement.newToolName = newTool.name;
        replacement.shippedAt = now;

        const loanId = replacement.oldLoanId ? String(replacement.oldLoanId) : '';
        if (loanId) {
          const loan = await Loan.findById(loanId);
          if (loan) {
            const oldIdx = loan.items.findIndex((it: any) => String(it.toolId) === String(replacement.oldToolId) && !it.returnedAt);
            if (oldIdx >= 0) {
              loan.items[oldIdx] = {
                ...(loan.items[oldIdx] as any),
                returnedAt: now,
                returnCondition: 'Bad',
                returnDescription: 'Tools diganti (BAD)',
                status: 'Exchanged',
              };
            }

            loan.items.push({
              toolId: newTool._id,
              toolCode: newTool.toolCode,
              toolName: newTool.name,
              category: newTool.category,
              subCategory: newTool.subCategory,
              borrowedAt: now,
              borrowedCondition: 'Good',
              borrowedPhotoUrl: shippedPhotoUrl,
              shipmentNote: typeof noteRaw === 'string' ? noteRaw : '',
              status: 'Borrowed',
            } as any);
            await loan.save();
          }
        }

        await Tool.findByIdAndUpdate(newTool._id, {
          $set: {
            isBorrowed: true,
            currentBorrowerId: replacement.requesterId,
            currentBorrowerName: replacement.requesterName,
            currentLoanId: loanId || null,
            isReservedForReplacement: false,
            reservedReplacementId: null,
          },
        });

        await Tool.findByIdAndUpdate(replacement.oldToolId, {
          $set: {
            isBorrowed: false,
            currentBorrowerId: null,
            currentBorrowerName: null,
            currentLoanId: null,
          },
        });
      }

      if (statusRaw === 'OldReturned') {
        if (typeof returnConditionRaw !== 'string' || (returnConditionRaw !== 'Good' && returnConditionRaw !== 'Bad')) {
          return mobileJson(req, { error: 'Invalid returnCondition' }, { status: 400 });
        }
        replacement.returnCondition = returnConditionRaw;
        replacement.returnDescription = typeof returnDescriptionRaw === 'string' ? returnDescriptionRaw : '';

        if (file && file.size > 0 && file.name !== 'undefined') {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `replacement-return-${Date.now()}-${file.name.replace(/\\s/g, '_')}`;
          const uploadDir = path.join(process.cwd(), 'public/uploads');
          await mkdir(uploadDir, { recursive: true });
          await writeFile(path.join(uploadDir, filename), buffer);
          replacement.returnPhotoUrl = `/uploads/${filename}`;
        }

        replacement.oldReturnedAt = now;
        await Tool.findByIdAndUpdate(replacement.oldToolId, {
          $set: {
            isBorrowed: false,
            currentBorrowerId: null,
            currentBorrowerName: null,
            currentLoanId: null,
            condition: replacement.returnCondition,
            lastCheckedAt: now,
          },
        });
      }

      if (statusRaw === 'Approved') replacement.approvedAt = now;
      if (statusRaw === 'Verified') replacement.verifiedAt = now;
      if (statusRaw === 'Completed') replacement.completedAt = now;
      if (statusRaw === 'Rejected') replacement.rejectedAt = now;

      await replacement.save();
      return mobileJson(req, replacement);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const statusRaw = typeof body.status === 'string' ? body.status : '';
    const noteRaw = typeof body.note === 'string' ? body.note : undefined;
    const newToolId = typeof body.newToolId === 'string' ? body.newToolId : '';

    if (statusRaw && !isReplacementStatus(statusRaw)) {
      return mobileJson(req, { error: 'Invalid status' }, { status: 400 });
    }

    if (noteRaw !== undefined) replacement.note = noteRaw;

    const status = statusRaw ? (statusRaw as ReplacementStatus) : undefined;
    if (status) {
      replacement.status = status;
      if (status === 'Approved') replacement.approvedAt = now;
      if (status === 'Verified') replacement.verifiedAt = now;
      if (status === 'Completed') replacement.completedAt = now;
      if (status === 'Rejected') replacement.rejectedAt = now;
    }

    if (newToolId) {
      const newTool = await Tool.findOne({
        _id: newToolId,
        status: true,
        isBorrowed: { $ne: true },
        isReservedForReplacement: { $ne: true },
      });
      if (!newTool) return mobileJson(req, { error: 'New tool unavailable' }, { status: 400 });
      replacement.newToolId = newTool._id;
      replacement.newToolCode = newTool.toolCode;
      replacement.newToolName = newTool.name;
    }

    if (replacement.status === 'Approved') {
      if (!replacement.newToolId) return mobileJson(req, { error: 'Pilih tools pengganti dulu' }, { status: 400 });
      await Tool.findByIdAndUpdate(replacement.newToolId, {
        $set: { isReservedForReplacement: true, reservedReplacementId: replacement._id },
      });
    }

    if (replacement.status === 'Shipped') {
      if (!replacement.newToolId) return mobileJson(req, { error: 'newToolId required for Shipped' }, { status: 400 });
      replacement.shippedAt = now;
      await Tool.findByIdAndUpdate(replacement.newToolId, {
        $set: {
          isBorrowed: true,
          currentBorrowerId: replacement.requesterId,
          currentBorrowerName: replacement.requesterName,
          isReservedForReplacement: false,
          reservedReplacementId: null,
        },
      });
    }

    if (replacement.status === 'Rejected' || replacement.status === 'Completed') {
      if (replacement.newToolId) {
        await Tool.findByIdAndUpdate(replacement.newToolId, {
          $set: { isReservedForReplacement: false, reservedReplacementId: null },
        });
      }
    }

    await replacement.save();
    return mobileJson(req, replacement);
  } catch {
    return mobileJson(req, { error: 'Failed to update replacement' }, { status: 500 });
  }
}
