import nodemailer from 'nodemailer';
import Setting from '@/models/Setting';
import dbConnect from '@/lib/mongodb';

export async function sendReportEmail(report: any) {
  await dbConnect();
  const settings = await Setting.findOne({});
  
  if (!settings?.emailManagement) {
    console.log('No management email configured');
    return;
  }

  const transporter = nodemailer.createTransport({
    // Configure your email service here
    // For demo purposes, we log it or use a test account
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: '"Tools Report System" <no-reply@example.com>',
    to: settings.emailManagement,
    subject: `[ALERT] Tool Reported BAD: ${report.toolName}`,
    html: `
      <h1>Tool Condition Alert</h1>
      <p><strong>Tool:</strong> ${report.toolName}</p>
      <p><strong>Technician:</strong> ${report.technicianName}</p>
      <p><strong>Condition:</strong> <span style="color: red;">BAD</span></p>
      <p><strong>Description:</strong> ${report.description}</p>
      ${report.photoUrl ? `<p><strong>Photo:</strong> <a href="${report.photoUrl}">View Photo</a></p>` : ''}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
