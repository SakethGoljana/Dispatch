import mongoose, { Document, Schema, Types } from 'mongoose';

export type PersistentStatus =
  | 'PENDING'
  | 'LINK_OPENED'
  | 'CONFIRMED_SENT_BY_USER'
  | 'SKIPPED'
  | 'API_QUEUED'
  | 'API_SENT'
  | 'API_DELIVERED'
  | 'API_READ'
  | 'API_FAILED';

export interface ICampaignRecipient {
  studentId: string;
  studentName: string;
  parentPhone: string;
  outstandingBalance?: number;
  renderedMessage: string;
  status: PersistentStatus;
  statusTimestamp?: Date;
  notes?: string;
}

export interface ICampaign extends Document {
  schoolId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  templateId?: Types.ObjectId;
  method: 'link_mode' | 'api_mode';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalCount: number;
  confirmedSentCount: number;
  skippedCount: number;
  recipients: ICampaignRecipient[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    outstandingBalance: { type: Number },
    renderedMessage: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'PENDING',
        'LINK_OPENED',
        'CONFIRMED_SENT_BY_USER',
        'SKIPPED',
        'API_QUEUED',
        'API_SENT',
        'API_DELIVERED',
        'API_READ',
        'API_FAILED',
      ],
      default: 'PENDING',
    },
    statusTimestamp: { type: Date },
    notes: { type: String },
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    method: { type: String, enum: ['link_mode', 'api_mode'], default: 'link_mode' },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'IN_PROGRESS',
    },
    totalCount: { type: Number, default: 0 },
    confirmedSentCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    recipients: [CampaignRecipientSchema],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

CampaignSchema.index({ schoolId: 1, createdAt: -1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
