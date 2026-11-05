/**
 * Template Token Auto-Matcher & Personalization Optimizer
 * Intelligently aligns template variable tokens with physical spreadsheet column headers.
 * Resolves semantic aliases, handles abbreviated column names (e.g. "C" -> Class, "25-26 Bal" -> Balance),
 * and provides transparent feedback on all replacements made.
 */

import { ColumnMappingConfig, SemanticFieldKey } from '../../types';
import { extractTemplateTokens } from './templateCompiler';
import { SEMANTIC_FIELDS } from '../mapper/columnMapper';

export interface TokenReplacementDetail {
  originalToken: string; // e.g. "Balance"
  matchedColumn: string; // e.g. "25-26 Bal"
  reason: string;        // e.g. "Active Balance Column" or "Semantic Alias Match"
}

export interface AutoMatchResult {
  updatedTemplate: string;
  matchedCount: number;
  replacements: TokenReplacementDetail[];
  alreadyMatchedCount: number;
  unmatchedTokens: string[];
}

/**
 * Normalizes a string by lowercasing and stripping non-alphanumeric characters.
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Computes a semantic match score between a template token and a spreadsheet column.
 * Higher score indicates stronger semantic alignment.
 */
function computeTokenColumnScore(
  token: string,
  colHeader: string,
  semanticKey?: SemanticFieldKey
): number {
  const normToken = normalize(token);
  const normCol = normalize(colHeader);

  // 1. Exact normalized match (e.g. "student_name" vs "student name")
  if (normToken === normCol) return 100;

  // 2. Direct equality
  if (token.toLowerCase().trim() === colHeader.toLowerCase().trim()) return 95;

  // 3. Known semantic field alias match
  if (semanticKey) {
    const fieldDef = SEMANTIC_FIELDS.find((f) => f.key === semanticKey);
    if (fieldDef) {
      for (const alias of fieldDef.aliases) {
        const normAlias = normalize(alias);
        if (normCol === normAlias) return 90;
        if (normCol.includes(normAlias) || normAlias.includes(normCol)) {
          if (normAlias.length >= 3) return 80;
        }
      }
    }
  }

  // 4. Common EdTech & Business Abbreviations
  const ABBREVIATIONS: Record<string, string[]> = {
    class: ['c', 'std', 'grade'],
    section: ['sec', 'div'],
    phone: ['ph', 'mob', 'contact', 'whatsapp', 'cell'],
    name: ['student', 'candidate', 'client', 'customer'],
    surname: ['initial', 'sur', 'lastname'],
    balance: ['bal', 'due', 'dues', 'fee', 'fees'],
  };

  for (const [key, abbrList] of Object.entries(ABBREVIATIONS)) {
    if (normToken.includes(key) || key === normToken) {
      for (const abbr of abbrList) {
        if (normCol === abbr || (abbr.length >= 3 && normCol.includes(abbr))) {
          return 85;
        }
      }
    }
    // Reverse check: token is abbreviation, column is full word
    if (abbrList.includes(normToken)) {
      if (normCol.includes(key)) return 85;
    }
  }

  // 5. Substring containment for multi-word or compound columns (e.g. "25-26 Bal" containing "bal")
  if (normCol.length >= 3 && normToken.length >= 3) {
    if (normCol.includes(normToken)) return 70;
    if (normToken.includes(normCol)) return 65;
  }

  return 0;
}

/**
 * Determines which semantic field key a token is asking for.
 */
function identifyTokenSemanticKey(token: string): SemanticFieldKey | undefined {
  const norm = normalize(token);
  if (norm.includes('bal') || norm.includes('due') || norm.includes('fee')) return 'outstandingBalance';
  if (norm.includes('sur') || norm === 'initial') return 'surname';
  if (norm.includes('name') || norm === 'student' || norm === 'customer') return 'studentName';
  if (norm === 'c' || norm.includes('class') || norm.includes('grade')) return 'class';
  if (norm === 'sec' || norm.includes('section')) return 'section';
  if (norm.includes('phone') || norm.includes('mob') || norm.includes('contact')) return 'parentPhone';
  if (norm.includes('remark') || norm.includes('note')) return 'remarks';
  if (norm.includes('mark') || norm.includes('score')) return 'marks';
  if (norm.includes('att') || norm.includes('present') || norm.includes('absent')) return 'attendanceStatus';
  if (norm.includes('date')) return 'date';
  return undefined;
}

/**
 * Efficiently matches template tokens to actual spreadsheet column headers.
 * Performs single-pass tokenization and atomic replacements.
 */
export function autoMatchTemplate(
  templateText: string,
  availableColumns: string[],
  mappingConfig?: ColumnMappingConfig
): AutoMatchResult {
  if (availableColumns.length === 0) {
    return {
      updatedTemplate: templateText,
      matchedCount: 0,
      replacements: [],
      alreadyMatchedCount: 0,
      unmatchedTokens: [],
    };
  }

  // Quick lookup sets for available columns
  const columnExactSet = new Set(availableColumns);
  const columnNormalizedMap = new Map<string, string>();
  for (const col of availableColumns) {
    columnNormalizedMap.set(normalize(col), col);
  }

  const tokens = extractTemplateTokens(templateText);

  // If template is empty or has no tokens, auto-generate a smart default template
  if (tokens.length === 0 || !templateText || templateText.trim() === '') {
    const balCol =
      mappingConfig?.balanceColumnKey ||
      mappingConfig?.mappings.outstandingBalance ||
      availableColumns.find((c) => /bal|due|fee/i.test(c));

    const nameCol =
      mappingConfig?.mappings.studentName ||
      availableColumns.find((c) => /name/i.test(c)) ||
      availableColumns[0];

    const generatedTemplate = `Dear {{${nameCol}}},\n\nThis is a polite reminder regarding the outstanding balance of ₹{{${balCol || 'Balance'}}} on your account.\n\nKindly arrange payment at your earliest convenience.\n\nThank you,\nAdministration`;

    const replacements: TokenReplacementDetail[] = [];
    if (nameCol) replacements.push({ originalToken: 'Name', matchedColumn: nameCol, reason: 'Generated Name Token' });
    if (balCol) replacements.push({ originalToken: 'Balance', matchedColumn: balCol, reason: 'Generated Balance Token' });

    return {
      updatedTemplate: generatedTemplate,
      matchedCount: replacements.length,
      replacements,
      alreadyMatchedCount: 0,
      unmatchedTokens: [],
    };
  }

  const replacements: TokenReplacementDetail[] = [];
  const replacementMap = new Map<string, string>(); // rawTokenString -> newRawTokenString
  let alreadyMatchedCount = 0;
  const unmatchedTokens: string[] = [];

  for (const token of tokens) {
    const key = token.key;

    // Case A: The token is ALREADY an exact physical spreadsheet column header
    if (columnExactSet.has(key)) {
      alreadyMatchedCount++;
      continue;
    }

    // Case B: The token is a normalized match to an existing column (e.g. case difference or punctuation)
    const normKey = normalize(key);
    if (columnNormalizedMap.has(normKey)) {
      const targetCol = columnNormalizedMap.get(normKey)!;
      if (targetCol !== key) {
        const newRaw = token.fallback !== undefined
          ? `{{${targetCol} | default: '${token.fallback}'}}`
          : `{{${targetCol}}}`;

        replacements.push({
          originalToken: key,
          matchedColumn: targetCol,
          reason: 'Casing & Character Normalization',
        });
        replacementMap.set(token.raw, newRaw);
      } else {
        alreadyMatchedCount++;
      }
      continue;
    }

    // Case C: Semantic field mapping lookup
    const semanticKey = identifyTokenSemanticKey(key);
    let matchedColumn: string | undefined;
    let matchReason = '';

    // Check mappingConfig explicitly first
    if (mappingConfig && semanticKey) {
      if (semanticKey === 'outstandingBalance') {
        matchedColumn = mappingConfig.balanceColumnKey || mappingConfig.mappings.outstandingBalance;
        if (matchedColumn) matchReason = 'Active Balance Column';
      } else if (mappingConfig.mappings[semanticKey]) {
        matchedColumn = mappingConfig.mappings[semanticKey];
        if (matchedColumn) matchReason = `Mapped ${semanticKey}`;
      }
    }

    // Case D: Fuzzy scoring against all available columns if not resolved by mappingConfig
    if (!matchedColumn) {
      let highestScore = 0;
      let bestCol: string | undefined;

      for (const col of availableColumns) {
        const score = computeTokenColumnScore(key, col, semanticKey);
        if (score > highestScore) {
          highestScore = score;
          bestCol = col;
        }
      }

      if (bestCol && highestScore >= 60) {
        matchedColumn = bestCol;
        matchReason = highestScore >= 80 ? 'Semantic Alias Match' : 'Fuzzy Column Match';
      }
    }

    if (matchedColumn && matchedColumn !== key) {
      const newRaw = token.fallback !== undefined
        ? `{{${matchedColumn} | default: '${token.fallback}'}}`
        : `{{${matchedColumn}}}`;

      replacements.push({
        originalToken: key,
        matchedColumn,
        reason: matchReason,
      });
      replacementMap.set(token.raw, newRaw);
    } else {
      unmatchedTokens.push(key);
    }
  }

  // Atomic single-pass string replacement
  let updatedTemplate = templateText;
  for (const [oldRaw, newRaw] of replacementMap.entries()) {
    updatedTemplate = updatedTemplate.split(oldRaw).join(newRaw);
  }

  return {
    updatedTemplate,
    matchedCount: replacements.length,
    replacements,
    alreadyMatchedCount,
    unmatchedTokens,
  };
}
