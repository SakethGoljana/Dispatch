/**
 * Universal Header Row Detector
 * Intelligently locates the actual table header row in arbitrary school spreadsheets,
 * correctly handling metadata rows, school banners, or blank rows at the top.
 */

// Common keywords across school administrative spreadsheets
const COMMON_HEADER_KEYWORDS = [
  'name',
  'student',
  'pupil',
  'ward',
  'candidate',
  'surname',
  'roll',
  'phone',
  'mobile',
  'contact',
  'whatsapp',
  'class',
  'sec',
  'section',
  'standard',
  'bal',
  'balance',
  'fee',
  'due',
  'paid',
  'receipt',
  's.no',
  'sno',
  'sl',
  'no',
  'marks',
  'total',
  'attendance',
  'status',
  'date',
  'remark',
  'village',
  'vehicle',
];

export interface HeaderDetectionResult {
  headerRowIndex: number; // 0-indexed row position
  headers: string[];
  confidence: number;
}

export function detectHeaderRow(rawMatrix: any[][], maxSearchRows = 10): HeaderDetectionResult {
  if (!rawMatrix || rawMatrix.length === 0) {
    return { headerRowIndex: 0, headers: [], confidence: 0 };
  }

  let bestRowIndex = 0;
  let highestScore = -1;
  let bestHeaders: string[] = [];

  const limit = Math.min(rawMatrix.length, maxSearchRows);

  for (let r = 0; r < limit; r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let matchCount = 0;
    let stringCellCount = 0;
    const candidateHeaders: string[] = [];

    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        const strVal = String(val).trim();
        candidateHeaders.push(strVal);
        stringCellCount++;

        const lowerVal = strVal.toLowerCase();
        for (const kw of COMMON_HEADER_KEYWORDS) {
          if (lowerVal.includes(kw)) {
            matchCount++;
            break;
          }
        }
      }
    }

    // A row is a strong header candidate if:
    // 1. It has multiple non-empty string cells
    // 2. Contains multiple domain keywords
    const score = matchCount * 2 + stringCellCount;

    if (score > highestScore && stringCellCount >= 2) {
      highestScore = score;
      bestRowIndex = r;
      bestHeaders = candidateHeaders;
    }
  }

  // If no strong match, default to first non-empty row
  if (highestScore <= 0) {
    for (let r = 0; r < limit; r++) {
      const row = rawMatrix[r];
      if (row && row.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) {
        bestRowIndex = r;
        bestHeaders = row
          .map((c, i) => (c ? String(c).trim() : `Column_${i + 1}`))
          .filter(Boolean);
        break;
      }
    }
  }

  return {
    headerRowIndex: bestRowIndex,
    headers: bestHeaders,
    confidence: highestScore,
  };
}
