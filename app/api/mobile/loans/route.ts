import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

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
    const status = searchParams.get('status');

    const query: any = {};
    if (payload.role !== 'admin') query.borrowerId = payload.sub;
    if (status) query.status = status;

    const loans = await Loan.find(query).sort({ borrowedAt: -1 }).limit(200);
    return mobileJson(req, loans);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

