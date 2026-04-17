import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendSystemEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const result = await sendSystemEmail({
      subject: `[TEST] Tools Report Email - ${now.toISOString()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#0E5E7E; border-bottom: 2px solid #eee; padding-bottom: 10px;">Test Email</h2>
          <p>Ini adalah email test dari sistem Tools Report.</p>
          <p>Waktu: <strong>${now.toLocaleString('id-ID')}</strong></p>
        </div>
      `,
      kind: 'system',
      meta: { type: 'test', by: payload.sub },
    });

    return mobileJson(req, { emailStatus: result });
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

