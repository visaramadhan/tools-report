import mongoose, { Model, Schema } from 'mongoose';

export type ReplacementStatus =
  | 'Requested'
  | 'Approved'
  | 'Shipped'
  | 'ReplacementReceived'
  | 'OldToolInTransit'
  | 'OldReturned'
  | 'Verified'
  | 'Completed'
  | 'Rejected';

export interface IReplacement {
  reportId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  requesterName: string;
  oldToolId: mongoose.Types.ObjectId;
  oldToolCode: string;
  oldToolName: string;
  newToolId?: mongoose.Types.ObjectId;
  newToolCode?: string;
  newToolName?: string;
  status: ReplacementStatus;
  note?: string;
  returnCondition?: 'Good' | 'Bad';
  returnDescription?: string;
  returnPhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  shippedAt?: Date;
  replacementReceivedAt?: Date;
  oldShippedAt?: Date;
  oldReturnedAt?: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
}

const ReplacementSchema = new Schema<IReplacement>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true, unique: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String, required: true },
    oldToolId: { type: Schema.Types.ObjectId, ref: 'Tool', required: true },
    oldToolCode: { type: String, required: true },
    oldToolName: { type: String, required: true },
    newToolId: { type: Schema.Types.ObjectId, ref: 'Tool' },
    newToolCode: { type: String },
    newToolName: { type: String },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Shipped', 'ReplacementReceived', 'OldToolInTransit', 'OldReturned', 'Verified', 'Completed', 'Rejected'],
      default: 'Requested',
    },
    note: { type: String },
    returnCondition: { type: String, enum: ['Good', 'Bad'] },
    returnDescription: { type: String },
    returnPhotoUrl: { type: String },
    approvedAt: { type: Date },
    shippedAt: { type: Date },
    replacementReceivedAt: { type: Date },
    oldShippedAt: { type: Date },
    oldReturnedAt: { type: Date },
    verifiedAt: { type: Date },
    completedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true }
);

ReplacementSchema.index({ status: 1, updatedAt: -1 });

const Replacement: Model<IReplacement> =
  mongoose.models.Replacement || mongoose.model<IReplacement>('Replacement', ReplacementSchema);

export default Replacement;
