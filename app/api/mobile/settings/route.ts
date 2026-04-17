import dbConnect from '@/lib/mongodb';
import Setting from '@/models/Setting';
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
    await verifyMobileToken(token);
    await dbConnect();
    const setting = await Setting.findOne({});
    if (!setting) {
      return mobileJson(req, {
        companyName: 'My Company',
        primaryColor: '#3b82f6',
      });
    }
    return mobileJson(req, setting);
  } catch (error) {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const body = await req.json();
    const setting = await Setting.findOneAndUpdate({}, body, { new: true, upsert: true });
    return mobileJson(req, setting);
  } catch (error) {
    return mobileJson(req, { error: 'Failed to update settings' }, { status: 500 });
  }
}
