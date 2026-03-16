import dbConnect from '@/lib/mongodb';
import Replacement from '@/models/Replacement';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await dbConnect();
  try {
    const payload = await verifyMobileToken(token);
    const repl = await Replacement.findById(id);
    if (!repl) return mobileJson(req, { error: 'Not found' }, { status: 404 });
    if (payload.role !== 'admin' && String(repl.requesterId) !== payload.sub) {
      return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    }
    if (repl.status !== 'Shipped') {
      return mobileJson(req, { error: 'Status tidak valid' }, { status: 400 });
    }
    repl.status = 'ReplacementReceived';
    repl.replacementReceivedAt = new Date();
    await repl.save();
    return mobileJson(req, repl);
  } catch {
    return mobileJson(req, { error: 'Failed to accept' }, { status: 500 });
  }
}
