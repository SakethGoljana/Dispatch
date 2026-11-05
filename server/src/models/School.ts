import mongoose, { Document, Schema } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  code: string;
  address?: string;
  defaultCountryCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, trim: true },
    defaultCountryCode: { type: String, default: '+91' },
  },
  { timestamps: true }
);

export const School = mongoose.model<ISchool>('School', SchoolSchema);
