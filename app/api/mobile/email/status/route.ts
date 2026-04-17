import dbConnect from '@/lib/mongodb';
import Setting from '@/models/Setting';
import EmailLog from '@/models/EmailLog';
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
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const settings = await Setting.findOne({});
    const destination = (settings?.emailManagement || '').trim();
    const smtpConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const logs = await EmailLog.find({}).sort({ createdAt: -1 }).limit(20);
    return mobileJson(req, { destination, smtpConfigured, logs });
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

