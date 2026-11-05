/**
 * Google Sheets Live Sync Engine
 * Direct real-time synchronization of Google Sheets via shared URL.
 * Automatically resolves sheet ID, gid, and CSV export endpoint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSpreadsheet, ParsedSpreadsheetResult } from './spreadsheetParser';

const LAST_SYNCED_SHEET_KEY = 'dispatch_last_synced_gsheet_url';
const LAST_SYNCED_TITLE_KEY = 'dispatch_last_synced_gsheet_title';

export interface ExtractedGoogleSheetInfo {
  sheetId: string;
  gid?: string;
  isPublished: boolean;
  exportCsvUrl: string;
}

/**
 * Extracts sheet ID and builds the direct CSV export URL from any Google Sheets link
 */
export function extractGoogleSheetCsvUrl(rawUrl: string): ExtractedGoogleSheetInfo {
  const trimmed = rawUrl.trim();

  // Published sheet format: /spreadsheets/d/e/2PACX-.../pubhtml or /pub
  const publishedMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (publishedMatch) {
    const pubId = publishedMatch[1];
    const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : undefined;
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
    return {
      sheetId: pubId,
      gid,
      isPublished: true,
      exportCsvUrl,
    };
  }

  // Standard sheet format: /spreadsheets/d/{SHEET_ID}
  const standardMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (standardMatch) {
    const sheetId = standardMatch[1];
    const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    return {
      sheetId,
      gid,
      isPublished: false,
      exportCsvUrl,
    };
  }

  throw new Error(
    'Invalid Google Sheets URL. Please copy and paste the link directly from your browser address bar or Share button.'
  );
}

/**
 * Fetches and parses a live Google Sheet into a structured ParsedSpreadsheetResult
 */
export async function fetchLiveGoogleSheet(
  sheetUrl: string,
  timeoutMs = 15000
): Promise<{ parsedResult: ParsedSpreadsheetResult; csvText: string; title: string }> {
  const { exportCsvUrl, sheetId } = extractGoogleSheetCsvUrl(sheetUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(exportCsvUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dispatch/2.0',
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out while connecting to Google Sheets. Please check your internet connection.');
    }
    throw new Error(`Failed to connect to Google Sheets: ${err?.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new Error(
        'Google Sheet is private or inaccessible.\n\nPlease open your Google Sheet, tap "Share", and change General Access to "Anyone with the link can view".'
      );
    }
    throw new Error(`Google Sheets responded with error code ${response.status}.`);
  }

  const csvText = await response.text();

  // If response is an HTML sign-in page, it's not a public CSV
  if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html') || csvText.includes('accounts.google.com')) {
    throw new Error(
      'Google Sheet requires Google sign-in.\n\nPlease open your Google Sheet → tap "Share" → set to "Anyone with the link can view".'
    );
  }

  if (!csvText.trim()) {
    throw new Error('The Google Sheet was fetched successfully, but the selected sheet tab is completely empty.');
  }

  // Parse CSV text using Dispatch spreadsheet parser
  const parsedResult = parseSpreadsheet(csvText, { type: 'string' });

  const title = `Google Sheet (${sheetId.slice(0, 8)}...)`;

  // Persist for quick 1-tap refresh
  try {
    await AsyncStorage.setItem(LAST_SYNCED_SHEET_KEY, sheetUrl);
    await AsyncStorage.setItem(LAST_SYNCED_TITLE_KEY, title);
  } catch (_e) {
    // Non-fatal
  }

  return { parsedResult, csvText, title };
}

/**
 * Gets the last successfully synced Google Sheet URL
 */
export async function getLastSyncedGoogleSheet(): Promise<{ url: string; title: string } | null> {
  try {
    const url = await AsyncStorage.getItem(LAST_SYNCED_SHEET_KEY);
    const title = (await AsyncStorage.getItem(LAST_SYNCED_TITLE_KEY)) || 'Saved Google Sheet';
    if (url) return { url, title };
  } catch (_e) {
    // ignore
  }
  return null;
}
