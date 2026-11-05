/**
 * Message Template Types
 */

export type TemplateCategory =
  | 'fee_reminder'
  | 'appointment'
  | 'order'
  | 'exam_results'
  | 'attendance'
  | 'homework'
  | 'announcement'
  | 'transport'
  | 'custom';

export interface TemplateVariableSpec {
  token: string;          // e.g. "STUDENT_NAME", "BALANCE", "VILLAGE_NAME"
  label: string;          // User-facing label
  required: boolean;
  defaultValue?: string;  // Fallback text if field is empty
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;           // Template string with {{TOKEN}} variables
  variables: TemplateVariableSpec[];
  updatedAt: string;
  createdAt: string;
}
