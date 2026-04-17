import dbConnect from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import mongoose from 'mongoose';

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
    const type = String(searchParams.get('type') || 'incoming');

    const me = new mongoose.Types.ObjectId(payload.sub);
    const query: any = {};
    if (type === 'outgoing') query.fromTechnicianId = me;
    else query.toTechnicianId = me;

    const transfers = await Transfer.find(query).sort({ updatedAt: -1 }).limit(200);
    return mobileJson(req, transfers);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

