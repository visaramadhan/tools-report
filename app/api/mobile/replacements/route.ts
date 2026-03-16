import dbConnect from '@/lib/mongodb';
import Replacement from '@/models/Replacement';
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
    const query: Record<string, unknown> = {};
    if (payload.role !== 'admin') query.requesterId = payload.sub;
    const replacements = await Replacement.find(query).sort({ updatedAt: -1 }).limit(200);
    return mobileJson(req, replacements);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}
