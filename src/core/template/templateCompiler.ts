/**
 * Shared Template Compiler & Personalization Engine
 * Single unified implementation used for live preview, recipient validation, and sending.
 * Strictly avoids code execution (no eval).
 */

import { ColumnMappingConfig, NormalizedStudentRecord } from '../../types';

export interface RenderResult {
  renderedText: string;
  isValid: boolean;
  missingRequiredFields: string[];
  resolvedVariables: Record<string, string>;
}

export interface ExtractedToken {
  raw: string;          // e.g. "{{STUDENT_NAME}}" or "{{BALANCE | default: '0'}}"
  key: string;          // e.g. "STUDENT_NAME" or "BALANCE"
  fallback?: string;    // e.g. "0"
}

/**
 * Extracts all {{VARIABLE}} tokens from template text.
 * Supports optional fallback syntax: {{VARIABLE | default: 'value'}}
 */
export function extractTemplateTokens(templateText: string): ExtractedToken[] {
  const tokenRegex = /\{\{\s*([^}|]+?)(?:\s*\|\s*default:\s*['"](.*?)['"])?\s*\}\}/g;
  const tokens: ExtractedToken[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(templateText)) !== null) {
    tokens.push({
      raw: match[0],
      key: match[1].trim(),
      fallback: match[2],
    });
  }

  return tokens;
}

/**
 * Formats monetary numbers according to Indian numbering system (₹ XX,XXX)
 */
export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount)) return '0';
  return amount.toLocaleString('en-IN');
}

/**
 * Resolves a token value for a specific student record.
 * Supports exact spreadsheet column headers (e.g. {{25-26 Bal}}, {{25-26 balance}}),
 * active mapping configuration fields, semantic defaults (e.g. {{Balance}}, {{Name}}),
 * and custom fields.
 */
export function resolveTokenValue(
  tokenKey: string,
  student: NormalizedStudentRecord,
  mappingConfig?: ColumnMappingConfig
): string | undefined {
  const cleanToken = tokenKey.trim();
  const lowerToken = cleanToken.toLowerCase();
  const normToken = lowerToken.replace(/[^a-z0-9]/g, '');
  const upperKey = cleanToken.toUpperCase().replace(/[\s-]/g, '_');

  const formatVal = (val: string | number, isCurrencyHint?: boolean) => {
    if (typeof val === 'number') {
      return formatIndianCurrency(val);
    }
    const str = String(val).trim();
    if (isCurrencyHint) {
      const num = Number(str.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num) && str.length > 0 && /^\d+/.test(str)) {
        return formatIndianCurrency(num);
      }
    }
    return str;
  };

  // 1. Direct match in student.customFields (holds all raw spreadsheet columns with original headers)
  if (student.customFields) {
    // 1a. Exact key match
    if (student.customFields[cleanToken] !== undefined && student.customFields[cleanToken] !== null) {
      const val = student.customFields[cleanToken];
      if (String(val).trim() !== '') {
        const isBal = normToken.includes('bal') || normToken.includes('due') || normToken.includes('fee');
        return formatVal(val, isBal);
      }
    }

    // 1b. Case-insensitive & normalized match
    for (const [colName, val] of Object.entries(student.customFields)) {
      if (val === null || val === undefined || String(val).trim() === '') continue;
      const cleanCol = colName.trim();
      const lowerCol = cleanCol.toLowerCase();
      const normCol = lowerCol.replace(/[^a-z0-9]/g, '');

      if (lowerCol === lowerToken || normCol === normToken) {
        const isBal = normCol.includes('bal') || normCol.includes('due') || normCol.includes('fee');
        return formatVal(val, isBal);
      }
    }
  }

  // 2. Check ColumnMappingConfig mappings
  if (mappingConfig) {
    const isMappedTo = (mappedColHeader?: string) => {
      if (!mappedColHeader) return false;
      const cleanHeader = mappedColHeader.trim().toLowerCase();
      const normHeader = cleanHeader.replace(/[^a-z0-9]/g, '');
      return lowerToken === cleanHeader || normToken === normHeader;
    };

    if (
      isMappedTo(mappingConfig.balanceColumnKey) ||
      isMappedTo(mappingConfig.mappings.outstandingBalance)
    ) {
      if (student.outstandingBalance !== undefined && student.outstandingBalance !== null) {
        return formatIndianCurrency(student.outstandingBalance);
      }
    }

    if (isMappedTo(mappingConfig.mappings.studentName) && student.studentName) {
      return student.studentName;
    }

    if (isMappedTo(mappingConfig.mappings.parentPhone)) {
      return student.parentPhone || student.rawPhone || undefined;
    }

    if (isMappedTo(mappingConfig.mappings.class) && student.class) {
      return student.class;
    }

    if (isMappedTo(mappingConfig.mappings.section) && student.section) {
      return student.section;
    }

    if (isMappedTo(mappingConfig.mappings.remarks) && student.remarks) {
      return student.remarks;
    }

    if (isMappedTo(mappingConfig.mappings.surname) && student.surname) {
      return student.surname;
    }
  }

  // 3. Fuzzy / partial match in customFields (e.g. "25-26 balanace" or "25-26 balance" matching "25-26 Bal")
  if (student.customFields) {
    for (const [colName, val] of Object.entries(student.customFields)) {
      if (val === null || val === undefined || String(val).trim() === '') continue;
      const cleanCol = colName.trim();
      const normCol = cleanCol.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normCol.length >= 3 && (normCol.includes(normToken) || normToken.includes(normCol))) {
        const isBal = normCol.includes('bal') || normCol.includes('due') || normCol.includes('fee');
        return formatVal(val, isBal);
      }
    }
  }

  // 4. Semantic core fields check (covers default templates like {{Name}}, {{Balance}}, etc.)
  switch (upperKey) {
    case 'STUDENT_NAME':
    case 'NAME':
    case 'CONTACT_NAME':
    case 'CUSTOMER_NAME':
    case 'CLIENT_NAME':
    case 'PARENT_NAME':
      return student.studentName || student.surname || undefined;

    case 'SUR_NAME':
    case 'SURNAME':
    case 'INITIAL':
    case 'LAST_NAME':
      return student.surname || undefined;

    case 'FULL_NAME': {
      if (student.surname && student.studentName) {
        return `${student.surname} ${student.studentName}`;
      }
      return student.studentName || student.surname || undefined;
    }

    case 'CLASS':
    case 'GRADE':
    case 'STANDARD':
    case 'BATCH':
    case 'C':
      return student.class || undefined;

    case 'SECTION':
    case 'SEC':
    case 'DIVISION':
      return student.section || undefined;

    case 'CLASS_SECTION':
    case 'CLASS_SEC': {
      if (student.class && student.section) {
        return `${student.class}-${student.section}`;
      }
      return student.class || student.section || undefined;
    }

    case 'BALANCE':
    case 'OUTSTANDING_BALANCE':
    case 'DUE':
    case 'FEES_DUE':
    case 'FEE_BALANCE':
    case 'TOTAL_BALANCE':
    case 'AMOUNT':
    case 'PENDING_FEE':
    case 'PENDING_BALANCE': {
      if (student.outstandingBalance !== undefined && student.outstandingBalance !== null) {
        return formatIndianCurrency(student.outstandingBalance);
      }
      return undefined;
    }

    case 'PHONE':
    case 'PHONE_NO':
    case 'MOBILE':
    case 'MOBILE_NO':
    case 'CONTACT':
    case 'WHATSAPP':
    case 'WHATSAPP_NO':
      return student.parentPhone || student.rawPhone || undefined;

    case 'REMARKS':
    case 'REMARK':
    case 'NOTE':
    case 'NOTES':
      return student.remarks || undefined;
  }

  // 5. Dynamic Date & Time Tokens
  if (normToken === 'today' || normToken === 'date') {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (normToken === 'time') {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (normToken === 'month') {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  // Date offset expressions: e.g. "today + 5" or "date + 7 days" or "today - 2"
  const dateOffsetMatch = cleanToken.match(/^(?:today|date)\s*([+-])\s*(\d+)/i);
  if (dateOffsetMatch) {
    const sign = dateOffsetMatch[1] === '-' ? -1 : 1;
    const days = parseInt(dateOffsetMatch[2], 10) * sign;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Generic fallback if token literally is "balance" or "due"
  if (normToken === 'balance' || normToken === 'due' || normToken === 'dues' || normToken === 'feesdue') {
    if (student.outstandingBalance !== undefined && student.outstandingBalance !== null) {
      return formatIndianCurrency(student.outstandingBalance);
    }
  }

  // 6. Dynamic Math Expressions: e.g. "Balance - 500" or "Total - Paid" or "Fee + 200"
  const mathMatch = cleanToken.match(/^([a-zA-Z0-9_\-\s]+?)\s*([+\-*])\s*([a-zA-Z0-9_\-\s]+)$/);
  if (mathMatch) {
    const leftRaw = mathMatch[1].trim();
    const operator = mathMatch[2];
    const rightRaw = mathMatch[3].trim();

    // Check if operands are raw numbers or need token resolution
    const leftResolved = /^\d+(\.\d+)?$/.test(leftRaw)
      ? parseFloat(leftRaw)
      : parseFloat((resolveTokenValue(leftRaw, student, mappingConfig) || '').replace(/,/g, ''));

    const rightResolved = /^\d+(\.\d+)?$/.test(rightRaw)
      ? parseFloat(rightRaw)
      : parseFloat((resolveTokenValue(rightRaw, student, mappingConfig) || '').replace(/,/g, ''));

    if (!isNaN(leftResolved) && !isNaN(rightResolved)) {
      let calc = 0;
      if (operator === '+') calc = leftResolved + rightResolved;
      else if (operator === '-') calc = leftResolved - rightResolved;
      else if (operator === '*') calc = leftResolved * rightResolved;
      return formatIndianCurrency(calc);
    }
  }

  return undefined;
}

/**
 * Universal Message Renderer
 * Replaces tokens with student data. Blocks invalid records where required variables are missing.
 */
export function renderStudentMessage(
  templateText: string,
  student: NormalizedStudentRecord,
  requiredTokens: string[] = ['STUDENT_NAME'],
  mappingConfig?: ColumnMappingConfig
): RenderResult {
  const tokens = extractTemplateTokens(templateText);
  const missingRequiredFields: string[] = [];
  const resolvedVariables: Record<string, string> = {};

  let output = templateText;

  for (const token of tokens) {
    const resolved = resolveTokenValue(token.key, student, mappingConfig);
    const upperKey = token.key.toUpperCase().replace(/[\s-]/g, '_');

    if (resolved !== undefined && resolved !== '') {
      resolvedVariables[token.key] = resolved;
      output = output.split(token.raw).join(resolved);
    } else if (token.fallback !== undefined) {
      resolvedVariables[token.key] = token.fallback;
      output = output.split(token.raw).join(token.fallback);
    } else {
      // Missing value
      const isRequired = requiredTokens.some(
        (req) => req.toUpperCase().replace(/[\s-]/g, '_') === upperKey
      );

      if (isRequired) {
        missingRequiredFields.push(token.key);
      }

      // Preserve unresolved token in text so user can see it
      resolvedVariables[token.key] = `[MISSING: ${token.key}]`;
      output = output.split(token.raw).join(`[MISSING: ${token.key}]`);
    }
  }

  const isValid = missingRequiredFields.length === 0;

  return {
    renderedText: output,
    isValid,
    missingRequiredFields,
    resolvedVariables,
  };
}
