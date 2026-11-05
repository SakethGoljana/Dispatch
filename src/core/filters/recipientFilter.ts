/**
 * Universal Recipient Filter & Custom Rule Engine
 * Allows users to filter any business or institutional dataset by
 * custom column conditions, phone validity, and optional presets.
 */

import { ColumnMappingConfig, NormalizedStudentRecord } from '../../types';
import { renderStudentMessage } from '../template/templateCompiler';

export interface CustomFilterRule {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty' | 'is_empty';
  value: string;
}

export interface RecipientFilterCriteria {
  customRules?: CustomFilterRule[];
  onlyPositiveBalance?: boolean;     // Optional toggle: requires balance > 0
  selectedClass?: string;           // Optional legacy/school: 'ALL' or class number
  selectedSection?: string;         // Optional legacy/school: 'ALL' or section letter
  manuallyExcludedIds?: Set<string>; // Manual individual exclusions
}

export interface PreparedRecipient {
  student: NormalizedStudentRecord;
  renderedMessage: string;
  isSharedPhone: boolean;
  isValid: boolean;
  exclusionReason?: string;
}

export interface RecipientFilterResult {
  eligibleRecipients: PreparedRecipient[];
  excludedRecipients: PreparedRecipient[];
  totalRecords: number;
  eligibleCount: number;
  excludedCount: number;
  sharedPhoneGroupCount: number;
  availableClasses: string[];
  availableSections: string[];
  availableColumns: string[];
}

export function filterAndPrepareRecipients(
  records: NormalizedStudentRecord[],
  templateBody: string,
  requiredTokens: string[] = ['STUDENT_NAME'],
  criteria: RecipientFilterCriteria = {},
  mappingConfig?: ColumnMappingConfig
): RecipientFilterResult {
  const {
    customRules = [],
    selectedClass = 'ALL',
    selectedSection = 'ALL',
    onlyPositiveBalance = false, // Universal default: include all contacts by default
    manuallyExcludedIds = new Set<string>(),
  } = criteria;

  // Extract distinct classes and sections if present in the dataset
  const classSet = new Set<string>();
  const sectionSet = new Set<string>();
  const columnSet = new Set<string>();

  for (const r of records) {
    if (r.class) classSet.add(r.class);
    if (r.section) sectionSet.add(r.section);
    if (r.rawRow) {
      for (const col of Object.keys(r.rawRow)) {
        if (!col.startsWith('__')) columnSet.add(col);
      }
    }
    if (r.customFields) {
      for (const col of Object.keys(r.customFields)) {
        if (!col.startsWith('__')) columnSet.add(col);
      }
    }
  }

  // Count phone frequency to flag shared / duplicate numbers
  const phoneCount = new Map<string, number>();
  for (const r of records) {
    if (r.isValidPhone && r.parentPhone) {
      phoneCount.set(r.parentPhone, (phoneCount.get(r.parentPhone) || 0) + 1);
    }
  }

  const eligibleRecipients: PreparedRecipient[] = [];
  const excludedRecipients: PreparedRecipient[] = [];

  for (const student of records) {
    // 1. Check manual exclusion
    if (manuallyExcludedIds.has(student.id)) {
      excludedRecipients.push({
        student,
        renderedMessage: '',
        isSharedPhone: false,
        isValid: false,
        exclusionReason: 'Manually excluded from campaign',
      });
      continue;
    }

    // 2. Check Phone validity (Primary operational requirement)
    if (!student.isValidPhone || !student.parentPhone) {
      excludedRecipients.push({
        student,
        renderedMessage: '',
        isSharedPhone: false,
        isValid: false,
        exclusionReason: 'Invalid or missing 10-digit WhatsApp number',
      });
      continue;
    }

    // 3. Check Custom User Rules (Universal filter for any business column)
    if (customRules.length > 0) {
      let failedRuleReason: string | null = null;

      for (const rule of customRules) {
        if (!rule.column) continue;
        const rawVal = student.rawRow?.[rule.column] ?? student.customFields?.[rule.column] ?? (student as any)[rule.column];
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        const targetVal = (rule.value || '').trim();
        let matched = true;

        switch (rule.operator) {
          case 'equals':
            matched = valStr.toLowerCase() === targetVal.toLowerCase();
            break;
          case 'not_equals':
            matched = valStr.toLowerCase() !== targetVal.toLowerCase();
            break;
          case 'contains':
            matched = valStr.toLowerCase().includes(targetVal.toLowerCase());
            break;
          case 'greater_than': {
            const numVal = parseFloat(valStr.replace(/,/g, ''));
            const numTarget = parseFloat(targetVal.replace(/,/g, ''));
            matched = !isNaN(numVal) && !isNaN(numTarget) && numVal > numTarget;
            break;
          }
          case 'less_than': {
            const numVal = parseFloat(valStr.replace(/,/g, ''));
            const numTarget = parseFloat(targetVal.replace(/,/g, ''));
            matched = !isNaN(numVal) && !isNaN(numTarget) && numVal < numTarget;
            break;
          }
          case 'not_empty':
            matched = valStr.length > 0;
            break;
          case 'is_empty':
            matched = valStr.length === 0;
            break;
        }

        if (!matched) {
          failedRuleReason = `${rule.column} does not match filter condition (${rule.operator} ${rule.value || ''})`.trim();
          break;
        }
      }

      if (failedRuleReason) {
        excludedRecipients.push({
          student,
          renderedMessage: '',
          isSharedPhone: false,
          isValid: false,
          exclusionReason: failedRuleReason,
        });
        continue;
      }
    }

    // 4. Optional: Check Class filter (if specified by user)
    if (selectedClass !== 'ALL' && student.class && student.class !== selectedClass) {
      excludedRecipients.push({
        student,
        renderedMessage: '',
        isSharedPhone: false,
        isValid: false,
        exclusionReason: `Class ${student.class} does not match filter ${selectedClass}`,
      });
      continue;
    }

    // 5. Optional: Check Section filter (if specified by user)
    if (selectedSection !== 'ALL' && student.section && student.section !== selectedSection) {
      excludedRecipients.push({
        student,
        renderedMessage: '',
        isSharedPhone: false,
        isValid: false,
        exclusionReason: `Section ${student.section} does not match filter ${selectedSection}`,
      });
      continue;
    }

    // 6. Optional: Outstanding Balance filter (only when enabled by user)
    if (onlyPositiveBalance) {
      const bal = student.outstandingBalance ?? 0;
      if (bal <= 0) {
        excludedRecipients.push({
          student,
          renderedMessage: '',
          isSharedPhone: false,
          isValid: false,
          exclusionReason: bal === 0 ? 'Fee balance is ₹0 / Cleared' : `Credit balance (₹${bal})`,
        });
        continue;
      }
    }

    // 7. Render personalized message and validate template tokens
    const render = renderStudentMessage(templateBody, student, requiredTokens, mappingConfig);

    if (!render.isValid) {
      excludedRecipients.push({
        student,
        renderedMessage: render.renderedText,
        isSharedPhone: false,
        isValid: false,
        exclusionReason: `Missing required template variable: ${render.missingRequiredFields.join(', ')}`,
      });
      continue;
    }

    // Recipient is fully eligible!
    const isShared = (phoneCount.get(student.parentPhone) || 0) > 1;

    eligibleRecipients.push({
      student,
      renderedMessage: render.renderedText,
      isSharedPhone: isShared,
      isValid: true,
    });
  }

  // Count shared groups among eligible recipients
  let sharedPhoneGroupCount = 0;
  const eligiblePhoneMap = new Map<string, number>();
  for (const el of eligibleRecipients) {
    eligiblePhoneMap.set(el.student.parentPhone, (eligiblePhoneMap.get(el.student.parentPhone) || 0) + 1);
  }
  for (const count of eligiblePhoneMap.values()) {
    if (count > 1) sharedPhoneGroupCount++;
  }

  return {
    eligibleRecipients,
    excludedRecipients,
    totalRecords: records.length,
    eligibleCount: eligibleRecipients.length,
    excludedCount: excludedRecipients.length,
    sharedPhoneGroupCount,
    availableClasses: Array.from(classSet).sort(),
    availableSections: Array.from(sectionSet).sort(),
    availableColumns: Array.from(columnSet).sort(),
  };
}
