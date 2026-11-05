import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITemplateVariable {
  token: string;
  label: string;
  required: boolean;
  defaultValue?: string;
}

export interface ITemplate extends Document {
  schoolId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name: string;
  category: string;
  body: string;
  variables: ITemplateVariable[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateVariableSchema = new Schema<ITemplateVariable>(
  {
    token: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    defaultValue: { type: String },
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'fee_reminder',
        'exam_results',
        'attendance',
        'homework',
        'announcement',
        'transport',
        'custom',
      ],
      default: 'custom',
    },
    body: { type: String, required: true },
    variables: [TemplateVariableSchema],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Multi-tenant index: Template name must be unique within a given school
TemplateSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);
