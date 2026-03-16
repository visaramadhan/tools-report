import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'technician') {
      return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const tools = await Tool.find({
      status: true,
      isBorrowed: true,
      currentBorrowerId: payload.sub,
    }).sort({ createdDate: -1 });

    return mobileJson(req, tools);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}
