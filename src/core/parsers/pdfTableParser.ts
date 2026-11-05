/**
 * Pure JavaScript PDF & Text Document Table Parser
 * Extracts tabular text from PDF streams (handling FlateDecode via pako,
 * hex strings, escape sequences, kerning arrays, and layout operators)
 * and reconstructs contacts, phone numbers, and balances without native modules.
 */

import pako from 'pako';
import { RawSpreadsheetRow } from '../../types';

export interface ExtractedDocumentResult {
  headers: string[];
  rows: RawSpreadsheetRow[];
  rawText: string;
  sourceType: 'pdf' | 'text';
}

export interface PDFInspectionResult {
  rawText: string;
  hasTextLayer: boolean;
  isScannedImageOnly: boolean;
  isVectorOutlineOnly: boolean;
  imageCount: number;
  producer?: string;
  title?: string;
  userAdvice?: string;
}

/**
 * Decodes PDF literal string escape sequences and UTF-16BE markers.
 */
export function decodePdfLiteral(s: string): string {
  if (s.startsWith('þÿ') || s.startsWith('\xfe\xff')) {
    let res = '';
    for (let i = 2; i < s.length; i += 2) {
      const code = (s.charCodeAt(i) << 8) | s.charCodeAt(i + 1);
      if (code !== 0) res += String.fromCharCode(code);
    }
    return res;
  }

  return s
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, '$1');
}

/**
 * Decodes hexadecimal PDF strings (e.g. <00410042> or <4142>).
 */
export function decodePdfHex(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length < 2 || clean.length % 2 !== 0) return '';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }

  // UTF-16BE with BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let s = '';
    for (let i = 2; i < bytes.length; i += 2) {
      const code = (bytes[i] << 8) | bytes[i + 1];
      if (code !== 0) s += String.fromCharCode(code);
    }
    return s;
  }

  // Double-byte UTF-16BE without explicit BOM (common in PDF print drivers)
  if (bytes.length >= 2 && bytes[0] === 0x00 && bytes[1] > 0) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 2) {
      const code = (bytes[i] << 8) | bytes[i + 1];
      if (code !== 0) s += String.fromCharCode(code);
    }
    return s;
  }

  return String.fromCharCode.apply(null, bytes);
}

/**
 * Parses individual PDF text operators inside a decompressed content stream.
 * Handles (text) Tj, <hex> Tj, and [(array)] TJ operators.
 */
function parsePDFTextOperators(streamStr: string): string {
  const result: string[] = [];

  // 1. Match TJ arrays: e.g. [ (Part1) -20 (Part2) ] TJ or [ <0041> -10 <0042> ] TJ
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ\b/g;
  let tjMatch: RegExpExecArray | null;

  while ((tjMatch = tjArrayRegex.exec(streamStr)) !== null) {
    const arrayContent = tjMatch[1];
    const tokenRegex = /\(([\s\S]*?)\)|<([0-9a-fA-F\s]+)>/g;
    let tokenMatch: RegExpExecArray | null;
    const lineParts: string[] = [];

    while ((tokenMatch = tokenRegex.exec(arrayContent)) !== null) {
      if (tokenMatch[1] !== undefined) {
        lineParts.push(decodePdfLiteral(tokenMatch[1]));
      } else if (tokenMatch[2] !== undefined) {
        lineParts.push(decodePdfHex(tokenMatch[2]));
      }
    }

    const line = lineParts.join('').trim();
    if (line.length > 0) {
      result.push(line);
    }
  }

  // 2. Match simple literal Tj: (text) Tj
  const singleTjRegex = /\(([\s\S]*?)\)\s*Tj\b/g;
  let singleMatch: RegExpExecArray | null;

  while ((singleMatch = singleTjRegex.exec(streamStr)) !== null) {
    const text = decodePdfLiteral(singleMatch[1]).trim();
    if (text.length > 0) {
      result.push(text);
    }
  }

  // 3. Match simple hex Tj: <hex> Tj
  const singleHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj\b/g;
  let hexMatch: RegExpExecArray | null;

  while ((hexMatch = singleHexRegex.exec(streamStr)) !== null) {
    const text = decodePdfHex(hexMatch[1]).trim();
    if (text.length > 0) {
      result.push(text);
    }
  }

  return result.join('\n');
}

/**
 * Extracts raw text from binary PDF data by inflating streams and decoding text operators.
 */
export function extractTextFromPDFBytes(pdfBytes: Uint8Array): string {
  let binaryStr = '';
  const len = pdfBytes.length;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = pdfBytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
  }

  const extractedLines: string[] = [];

  // Match all PDF streams: e.g. "stream\r?\n...endstream"
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(binaryStr)) !== null) {
    const streamContent = match[1];
    const streamStartIndex = match.index;

    // Check header before this stream
    const headerSlice = binaryStr.slice(Math.max(0, streamStartIndex - 400), streamStartIndex);

    // Skip image streams completely (JPEG photos, scanners, graphics)
    if (
      headerSlice.includes('/Subtype /Image') ||
      headerSlice.includes('/Subtype/Image') ||
      headerSlice.includes('/Image') ||
      headerSlice.includes('/DCTDecode') ||
      headerSlice.includes('/JPXDecode')
    ) {
      continue;
    }

    const isFlate = headerSlice.includes('/FlateDecode') || headerSlice.includes('/Fl');
    let decompressedText = '';

    if (isFlate) {
      try {
        const streamBytes = new Uint8Array(streamContent.length);
        for (let j = 0; j < streamContent.length; j++) {
          streamBytes[j] = streamContent.charCodeAt(j) & 0xff;
        }
        const inflated = pako.inflate(streamBytes);
        decompressedText = String.fromCharCode.apply(null, Array.from(inflated));
      } catch (_err) {
        decompressedText = '';
      }
    } else {
      decompressedText = streamContent;
    }

    if (decompressedText.length > 0) {
      const textChunk = parsePDFTextOperators(decompressedText);
      if (textChunk.trim().length > 0) {
        extractedLines.push(textChunk);
      }
    }
  }

  // Fallback: If no stream text found, scan for literal strings
  if (extractedLines.length === 0) {
    const literalMatches = binaryStr.match(/\(([^()]{3,})\)\s*(?:Tj|TJ)\b/g);
    if (literalMatches) {
      for (const lm of literalMatches) {
        const cleaned = lm.replace(/^[(\s]+|[)\sTjTJ]+$/g, '');
        if (cleaned.length > 2) extractedLines.push(cleaned);
      }
    }
  }

  return extractedLines.join('\n');
}

/**
 * Inspects the PDF document structure to diagnose whether it has a digital text layer,
 * is an image scan (e.g. from OKEN Scanner), or has vectorized text outlines.
 */
export function inspectPDFDocument(pdfBytes: Uint8Array): PDFInspectionResult {
  let binaryStr = '';
  const len = pdfBytes.length;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = pdfBytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
  }

  const rawText = extractTextFromPDFBytes(pdfBytes);
  const hasTextLayer = rawText.trim().length > 10;

  // Count image objects (/Subtype /Image)
  const imageMatches = binaryStr.match(/\/Subtype\s*\/Image/g) || binaryStr.match(/\/Image\b/g) || [];
  const imageCount = imageMatches.length;

  // Extract Producer and Title metadata
  const prodMatch = binaryStr.match(/\/Producer\s*(?:\(([\s\S]*?)\)|<([0-9a-fA-F]+)>)/i);
  let producer = '';
  if (prodMatch) {
    if (prodMatch[1]) producer = decodePdfLiteral(prodMatch[1]).replace(/^[^\w]+/, '').trim();
    else if (prodMatch[2]) producer = decodePdfHex(prodMatch[2]).trim();
  }

  const titleMatch = binaryStr.match(/\/Title\s*(?:\(([\s\S]*?)\)|<([0-9a-fA-F]+)>)/i);
  let title = '';
  if (titleMatch) {
    if (titleMatch[1]) title = decodePdfLiteral(titleMatch[1]).replace(/^[^\w]+/, '').trim();
    else if (titleMatch[2]) title = decodePdfHex(titleMatch[2]).trim();
  }

  const isScannedImageOnly = !hasTextLayer && imageCount > 0;
  const isVectorOutlineOnly = !hasTextLayer && !isScannedImageOnly && (
    binaryStr.includes('Print To PDF') ||
    producer.includes('Print To PDF') ||
    binaryStr.includes('Microsoft')
  );

  let userAdvice: string | undefined = undefined;
  if (isScannedImageOnly) {
    userAdvice = `This PDF contains scanned photos (${producer || 'Scanner App'}) without an embedded text layer. You can paste the roster text directly or sync via Google Sheets.`;
  } else if (isVectorOutlineOnly) {
    userAdvice = `This document was printed to PDF with text vectorized as shapes. Please sync directly using the original Google Sheet URL or paste raw text.`;
  }

  return {
    rawText,
    hasTextLayer,
    isScannedImageOnly,
    isVectorOutlineOnly,
    imageCount,
    producer: producer || undefined,
    title: title || undefined,
    userAdvice,
  };
}

/**
 * Smart Line-to-Table Parser
 * Analyzes unstructured text lines (from PDF, OCR, or copy-paste),
 * identifies 10-digit Indian phone numbers, names, and monetary values,
 * and outputs structured records.
 * Supports both single-line tabular rows and multi-line card/block layouts.
 */
export function parseRawTextToStructuredRecords(rawText: string): ExtractedDocumentResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedRows: RawSpreadsheetRow[] = [];

  const indianPhoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{9}\b/;
  const currencyAmountRegex = /(?:₹|Rs\.?|INR)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/i;
  const standardAmountRegex = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d{3,6})\b/g;

  // Header and noise keywords to skip when searching for names
  const noiseKeywords = /^(?:s\.?no|sl\.?no|receipt|phone|mobile|balance|fee|amount|class|sec|section|grade|roll|student|name|remarks|status|total|due|date|action)\b/i;

  let rowCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Strip leading serial numbers (e.g. "1. ", "10) ", "#1 ")
    const lineWithoutSNo = rawLine.replace(/^\s*(?:#|\d+[\.\)\-:\s])\s*/, '');

    // Check if line contains a valid Indian phone number
    const phoneMatch = lineWithoutSNo.match(indianPhoneRegex);
    if (!phoneMatch) continue; // Skip non-contact lines

    const rawPhone = phoneMatch[0];
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    let name = '';
    let balance: number | undefined = undefined;

    // Check if name and amount are on the SAME line
    const remainingAfterPhone = lineWithoutSNo.replace(rawPhone, ' ').trim();
    if (remainingAfterPhone.length > 2) {
      const currMatch = remainingAfterPhone.match(currencyAmountRegex);
      if (currMatch) {
        const rawAmt = currMatch[1].replace(/,/g, '');
        const parsedAmt = parseFloat(rawAmt);
        if (!isNaN(parsedAmt)) balance = parsedAmt;
      } else {
        const numMatches = remainingAfterPhone.match(standardAmountRegex);
        if (numMatches) {
          for (const nm of numMatches) {
            const rawAmt = nm.replace(/,/g, '');
            const parsedAmt = parseFloat(rawAmt);
            if (!isNaN(parsedAmt) && parsedAmt > 10 && rawAmt !== cleanPhone) {
              balance = parsedAmt;
              break;
            }
          }
        }
      }

      const nameCandidate = remainingAfterPhone
        .replace(currencyAmountRegex, '')
        .replace(standardAmountRegex, '')
        .replace(/^[\d\s.\-_|#]+/, '')
        .replace(/[\s\t,;|]+/g, ' ')
        .trim();

      if (nameCandidate.length >= 2 && !noiseKeywords.test(nameCandidate)) {
        name = nameCandidate;
      }
    }

    // If name was NOT on the same line, look at preceding lines (multi-line layout)
    if (!name || name.length < 2) {
      for (let prevIdx = i - 1; prevIdx >= Math.max(0, i - 4); prevIdx--) {
        const candidate = lines[prevIdx].replace(/^\s*(?:#|\d+[\.\)\-:\s])\s*/, '').trim();
        // Skip phone numbers, numbers-only, or header noise
        if (
          candidate.length >= 2 &&
          !candidate.match(indianPhoneRegex) &&
          !candidate.match(/^\d+$/) &&
          !noiseKeywords.test(candidate)
        ) {
          name = candidate;
          break;
        }
      }
    }

    // If balance was NOT on the same line, look at succeeding lines (multi-line layout)
    if (balance === undefined) {
      for (let nextIdx = i + 1; nextIdx <= Math.min(lines.length - 1, i + 3); nextIdx++) {
        const nextLine = lines[nextIdx].trim();
        if (nextLine.match(indianPhoneRegex)) break; // Stop at next student
        const currMatch = nextLine.match(currencyAmountRegex);
        if (currMatch) {
          const rawAmt = currMatch[1].replace(/,/g, '');
          const parsedAmt = parseFloat(rawAmt);
          if (!isNaN(parsedAmt)) {
            balance = parsedAmt;
            break;
          }
        } else {
          const numMatches = nextLine.match(standardAmountRegex);
          if (numMatches) {
            for (const nm of numMatches) {
              const rawAmt = nm.replace(/,/g, '');
              const parsedAmt = parseFloat(rawAmt);
              if (!isNaN(parsedAmt) && parsedAmt > 10 && rawAmt !== cleanPhone) {
                balance = parsedAmt;
                break;
              }
            }
          }
        }
      }
    }

    const rowObj: RawSpreadsheetRow = {
      __rowNumber: rowCounter,
      Name: name.length > 0 ? name : `Recipient ${rowCounter}`,
      Mobile: cleanPhone,
    };

    if (balance !== undefined) {
      rowObj['Balance'] = balance;
    }

    parsedRows.push(rowObj);
    rowCounter++;
  }

  return {
    headers: ['Name', 'Mobile', 'Balance'],
    rows: parsedRows,
    rawText,
    sourceType: 'pdf',
  };
}
