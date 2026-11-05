/**
 * Dynamic Column Mapping Engine
 * Intelligently suggests semantic mappings for any spreadsheet, detects multiple balance columns,
 * and preserves all other columns as custom template variables.
 */

import { ColumnMappingConfig, SemanticFieldDefinition, SemanticFieldKey } from '../../types';

export const SEMANTIC_FIELDS: SemanticFieldDefinition[] = [
  {
    key: 'studentName',
    label: 'Student Name',
    required: true,
    description: "Student's first or full name",
    aliases: [
      'student name',
      'student_name',
      'name',
      'candidate name',
      'ward name',
      'child name',
      'pupil name',
      'student',
    ],
  },
  {
    key: 'surname',
    label: 'Surname / Initial',
    required: false,
    description: 'Family name, surname, or initial (common in Indian registers)',
    aliases: ['sur name', 'surname', 'last name', 'initial', 'initials'],
  },
  {
    key: 'class',
    label: 'Class / Grade',
    required: false,
    description: 'Academic grade or class',
    aliases: ['class', 'c', 'grade', 'standard', 'std'],
  },
  {
    key: 'section',
    label: 'Section',
    required: false,
    description: 'Division or class section',
    aliases: ['sec', 'section', 'div', 'division'],
  },
  {
    key: 'parentPhone',
    label: 'Parent WhatsApp Phone',
    required: true,
    description: 'Mobile number for WhatsApp communication',
    aliases: [
      'phone no',
      'phone_no',
      'phoneno',
      'phone',
      'mobile no',
      'mobile_no',
      'mobileno',
      'mobile',
      'whatsapp',
      'contact no',
      'contact',
      'cell',
      'parent phone',
      'father mobile',
      'mother mobile',
    ],
  },
  {
    key: 'outstandingBalance',
    label: 'Fee Balance / Outstanding',
    required: false,
    description: 'Pending dues or payable balance',
    aliases: [
      'bal',
      'balance',
      'due',
      'dues',
      'pending',
      'outstanding',
      'fee balance',
      'fee due',
      'total balance',
      'total due',
      't2.bal',
      's2.bal',
      'b2.bal',
    ],
  },
  {
    key: 'attendanceStatus',
    label: 'Attendance Status',
    required: false,
    description: 'Present, Absent, Leave',
    aliases: ['attendance', 'status', 'present', 'absent', 'att status'],
  },
  {
    key: 'marks',
    label: 'Marks / Score',
    required: false,
    description: 'Exam score, marks obtained, or grade',
    aliases: ['marks', 'score', 'total marks', 'percentage', 'grade', 'result'],
  },
  {
    key: 'date',
    label: 'Date',
    required: false,
    description: 'Date for notices, attendance, or transactions',
    aliases: ['date', 'dated', 'dt'],
  },
  {
    key: 'remarks',
    label: 'Remarks / Notes',
    required: false,
    description: 'Administrative remarks or notes',
    aliases: ['remarks', 'remark', 'notes', 'comments'],
  },
];

export interface AutoMappingResult {
  config: ColumnMappingConfig;
  balanceAmbiguityDetected: boolean;
  candidateBalanceColumns: string[];
  mappedCount: number;
  unmappedColumns: string[];
}

export function autoDetectMappings(
  availableHeaders: string[],
  defaultCountryCode = '+91'
): AutoMappingResult {
  const mappings: Partial<Record<SemanticFieldKey, string>> = {};
  const usedHeaders = new Set<string>();

  // 1. Identify all candidate balance columns first to check for ambiguity
  const candidateBalanceColumns: string[] = [];
  const balanceField = SEMANTIC_FIELDS.find((f) => f.key === 'outstandingBalance')!;

  for (const header of availableHeaders) {
    const clean = header.toLowerCase().trim();
    for (const alias of balanceField.aliases) {
      if (clean === alias || clean.includes(alias)) {
        candidateBalanceColumns.push(header);
        break;
      }
    }
  }

  const isBalanceAmbiguous = candidateBalanceColumns.length > 1;

  function getMatchScore(cleanHeader: string, fieldKey: SemanticFieldKey, aliases: string[]): number {
    // Prevent cross-contamination between surname and studentName
    if (fieldKey === 'studentName' && (cleanHeader.includes('sur') || cleanHeader.includes('last'))) {
      return 0;
    }
    if (fieldKey === 'surname' && cleanHeader.includes('student')) {
      return 0;
    }

    for (const alias of aliases) {
      if (cleanHeader === alias) return 100;
      if (cleanHeader.replace(/[\s_.-]/g, '') === alias.replace(/[\s_.-]/g, '')) return 90;
      const words = cleanHeader.split(/[\s_.-]+/);
      if (words.includes(alias)) return 75;
      if (alias.length > 3 && cleanHeader.includes(alias)) return 50;
    }
    return 0;
  }

  // 2. Map semantic fields using highest score match
  for (const field of SEMANTIC_FIELDS) {
    if (field.key === 'outstandingBalance') continue;

    let bestHeader: string | undefined;
    let highestScore = 0;

    for (const header of availableHeaders) {
      if (usedHeaders.has(header)) continue;
      const clean = header.toLowerCase().trim();
      const score = getMatchScore(clean, field.key, field.aliases);

      if (score > highestScore) {
        highestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader && highestScore > 0) {
      mappings[field.key] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  // 3. Resolve balance mapping if not ambiguous
  let resolvedBalanceColumn: string | undefined;
  if (candidateBalanceColumns.length === 1) {
    resolvedBalanceColumn = candidateBalanceColumns[0];
    mappings.outstandingBalance = resolvedBalanceColumn;
    usedHeaders.add(resolvedBalanceColumn);
  } else if (candidateBalanceColumns.length > 1) {
    // Check if there is a column explicitly representing TOTAL balance
    const totalMatch = candidateBalanceColumns.find((c) => {
      const lower = c.toLowerCase();
      return lower.includes('total') || lower.includes('t2.bal') || lower.includes('up to t');
    });
    // We suggest the total match as default if found, but still flag ambiguity!
    resolvedBalanceColumn = totalMatch || candidateBalanceColumns[0];
    mappings.outstandingBalance = resolvedBalanceColumn;
  }

  // 4. Any header not mapped is preserved as an unmapped column (usable in templates)
  const unmappedColumns = availableHeaders.filter((h) => !usedHeaders.has(h));

  const mappedCount = Object.keys(mappings).length;

  return {
    config: {
      mappings,
      balanceColumnKey: resolvedBalanceColumn,
      unmappedColumns,
      defaultCountryCode,
    },
    balanceAmbiguityDetected: isBalanceAmbiguous,
    candidateBalanceColumns,
    mappedCount,
    unmappedColumns,
  };
}
