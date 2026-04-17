import nodemailer from 'nodemailer';
import Setting from '@/models/Setting';
import dbConnect from '@/lib/mongodb';
import EmailLog from '@/models/EmailLog';

export type EmailSendResult = {
  ok: boolean;
  to?: string;
  subject: string;
  messageId?: string;
  error?: string;
};

function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '465');
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  const secure = typeof process.env.EMAIL_SECURE === 'string' ? process.env.EMAIL_SECURE === 'true' : port === 465;
  return { host, port, user, pass, secure };
}

export async function sendSystemEmail(payload: { subject: string; html: string; kind?: 'report' | 'system'; meta?: Record<string, any> }): Promise<EmailSendResult> {
  await dbConnect();
  const settings = await Setting.findOne({});
  const to = (settings?.emailManagement || '').trim();
  const subject = payload.subject;

  if (!to) {
    const result: EmailSendResult = { ok: false, subject, error: 'EMAIL_DESTINATION_NOT_CONFIGURED' };
    await EmailLog.create({ kind: payload.kind || 'system', to, subject, ok: false, error: result.error, meta: payload.meta });
    return result;
  }

  const smtp = getSmtpConfig();
  if (!smtp.user || !smtp.pass) {
    const result: EmailSendResult = { ok: false, to, subject, error: 'SMTP_NOT_CONFIGURED' };
    await EmailLog.create({ kind: payload.kind || 'system', to, subject, ok: false, error: result.error, meta: payload.meta });
    return result;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const mailOptions = {
    from: `"Tools Report System" <${smtp.user}>`,
    to,
    subject,
    html: payload.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const result: EmailSendResult = { ok: true, to, subject, messageId: info?.messageId };
    await EmailLog.create({ kind: payload.kind || 'system', to, subject, ok: true, messageId: result.messageId, meta: payload.meta });
    return result;
  } catch (e: any) {
    if (smtp.port === 465) {
      try {
        const fallback = nodemailer.createTransport({
          host: smtp.host,
          port: 587,
          secure: false,
          auth: { user: smtp.user, pass: smtp.pass },
        });
        const info = await fallback.sendMail(mailOptions);
        const result: EmailSendResult = { ok: true, to, subject, messageId: info?.messageId };
        await EmailLog.create({
          kind: payload.kind || 'system',
          to,
          subject,
          ok: true,
          messageId: result.messageId,
          meta: { ...(payload.meta || {}), usedFallback: true },
        });
        return result;
      } catch (e2: any) {
        const error = e2 instanceof Error ? e2.message : String(e2 || 'UNKNOWN_ERROR');
        const result: EmailSendResult = { ok: false, to, subject, error };
        await EmailLog.create({ kind: payload.kind || 'system', to, subject, ok: false, error, meta: payload.meta });
        return result;
      }
    }

    const error = e instanceof Error ? e.message : String(e || 'UNKNOWN_ERROR');
    const result: EmailSendResult = { ok: false, to, subject, error };
    await EmailLog.create({ kind: payload.kind || 'system', to, subject, ok: false, error, meta: payload.meta });
    return result;
  }
}

export async function sendReportEmail(report: any): Promise<EmailSendResult> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: ${report.condition === 'Bad' ? '#ef4444' : '#0E5E7E'}; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        Laporan Kondisi Alat: ${report.condition === 'Bad' ? 'RUSAK' : 'BAIK'}
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Nama Tool</strong></td>
          <td style="padding: 8px 0;">: ${report.toolName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Kode Tool</strong></td>
          <td style="padding: 8px 0;">: ${report.toolCode || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Kategori</strong></td>
          <td style="padding: 8px 0;">: ${report.toolId?.category || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Sub Kategori</strong></td>
          <td style="padding: 8px 0;">: ${report.toolId?.subCategory || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Pelapor</strong></td>
          <td style="padding: 8px 0;">: ${report.technicianName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Tanggal</strong></td>
          <td style="padding: 8px 0;">: ${new Date(report.createdAt).toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Keterangan</strong></td>
          <td style="padding: 8px 0;">: ${report.description || '-'}</td>
        </tr>
      </table>

      ${report.photoUrls && report.photoUrls.length > 0 ? `
        <div style="margin-top: 20px;">
          <p style="color: #666; margin-bottom: 10px;"><strong>Foto Kondisi:</strong></p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${report.photoUrls.map((url: string) => `
              <img src="${baseUrl}${url}" 
                   style="width: 180px; height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" 
                   alt="Tool Photo" />
            `).join('')}
          </div>
        </div>
      ` : report.photoUrl ? `
        <div style="margin-top: 20px;">
          <p style="color: #666; margin-bottom: 10px;"><strong>Foto Kondisi:</strong></p>
          <img src="${baseUrl}${report.photoUrl}" 
               style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" 
               alt="Tool Photo" />
        </div>
      ` : ''}
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
        Pesan ini dikirim secara otomatis oleh Sistem Pelaporan Tools via SMTP.
      </div>
    </div>
  `;

  return sendSystemEmail({
    subject: `[REPORT] ${String(report.condition || '').toUpperCase()} - ${report.toolName}`,
    html: htmlContent,
    kind: 'report',
    meta: {
      reportId: String(report?._id || ''),
      toolId: String(report?.toolId?._id || report?.toolId || ''),
      condition: String(report?.condition || ''),
    },
  });
}
