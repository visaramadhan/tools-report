import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendReportEmail } from '@/lib/email';
import { uploadFileToGridFs } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const { id, toolId } = await params;
    const loan = await Loan.findById(id);
    if (!loan) return mobileJson(req, { error: 'Loan not found' }, { status: 404 });

    const formData = (await req.formData()) as FormData;
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const description = (formData.get('description') as string) || '';
    const photo = formData.get('photo') as File | null;

    const item = loan.items.find((it) => it.toolId.toString() === toolId);
    if (!item) return mobileJson(req, { error: 'Tool not found in this loan' }, { status: 404 });
    if (item.returnedAt) return mobileJson(req, { error: 'Tool already returned' }, { status: 400 });

    const tool = await Tool.findById(toolId);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });

    const isAlreadyBad = tool.condition === 'Bad';
    const finalCondition = isAlreadyBad ? 'Bad' : condition;
    if (!isAlreadyBad && finalCondition !== 'Good' && finalCondition !== 'Bad') {
      return mobileJson(req, { error: 'Invalid condition' }, { status: 400 });
    }

    let photoUrl = '';
    if (!isAlreadyBad && photo && photo.size > 0 && photo.name !== 'undefined') {
      const uploaded = await uploadFileToGridFs(photo, 'return');
      photoUrl = uploaded.url;
    }

    item.returnedAt = new Date();
    item.returnCondition = finalCondition as 'Good' | 'Bad';
    item.returnDescription = isAlreadyBad ? '' : description;
    item.returnPhotoUrl = isAlreadyBad ? undefined : photoUrl;
    item.status = 'Returned';

    const allReturned = loan.items.every((it) => !!it.returnedAt);
    const anyReturned = loan.items.some((it) => !!it.returnedAt);
    loan.status = allReturned ? 'Returned' : anyReturned ? 'PartiallyReturned' : 'Borrowed';
    if (allReturned) loan.returnedAt = new Date();

    await loan.save();

    await Tool.findByIdAndUpdate(toolId, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
        condition: finalCondition as 'Good' | 'Bad',
        status: finalCondition === 'Bad' ? false : tool.status,
        lastCheckedAt: new Date(),
      },
    });

    if (!isAlreadyBad) {
      const report = await Report.create({
        toolId: tool._id,
        toolCode: tool.toolCode,
        toolName: tool.name,
        category: tool.category,
        subCategory: tool.subCategory,
        technicianId: loan.borrowerId,
        technicianName: loan.borrowerName,
        examinerName: payload.name || 'Admin',
        condition: finalCondition as 'Good' | 'Bad',
        description,
        photoUrl,
      });
      await sendReportEmail(report);
    }

    return mobileJson(req, loan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to return tool', detail }, { status: 500 });
  }
}
