import mongoose, { Schema, Model } from 'mongoose';

export interface IEmailLog {
  kind: 'report' | 'system';
  to?: string;
  subject: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>({
  kind: { type: String, enum: ['report', 'system'], required: true },
  to: { type: String },
  subject: { type: String, required: true },
  ok: { type: Boolean, required: true },
  messageId: { type: String },
  error: { type: String },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

export default EmailLog;

