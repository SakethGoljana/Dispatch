/**
 * Campaign Excel & CSV Audit Exporter
 * Generates formatted spreadsheet reports with delivery receipts and timestamps,
 * and launches native sharing for instant download or emailing.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { CampaignRecord } from '../campaign/campaignStorage';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export async function exportCampaignToExcel(campaign: CampaignRecord): Promise<ExportResult> {
  try {
    // 1. Format recipient data rows
    const rows = campaign.recipients.map((rec, index) => ({
      'S.No': index + 1,
      'Recipient Name': rec.studentName || 'N/A',
      'Mobile Number': rec.parentPhone || 'N/A',
      'Amount Due (₹)': rec.balance !== undefined ? rec.balance : 0,
      'Dispatch Status':
        rec.status === 'CONFIRMED_SENT_BY_USER' || rec.status === 'API_SENT' || rec.status === 'API_DELIVERED'
          ? 'SENT ✓'
          : rec.status === 'SKIPPED'
          ? 'SKIPPED'
          : 'PENDING',
      'Sent Timestamp': rec.timestamp ? new Date(rec.timestamp).toLocaleString() : 'N/A',
      'Personalized Message': rec.renderedMessage || '',
    }));

    // 2. Summary stats block
    const summaryRows = [
      { 'S.No': '', 'Recipient Name': '--- CAMPAIGN SUMMARY ---', 'Mobile Number': '', 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
      { 'S.No': '', 'Recipient Name': 'Campaign Title:', 'Mobile Number': campaign.title, 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
      { 'S.No': '', 'Recipient Name': 'Total Recipients:', 'Mobile Number': campaign.totalCount, 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
      { 'S.No': '', 'Recipient Name': 'Confirmed Sent:', 'Mobile Number': campaign.confirmedSentCount, 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
      { 'S.No': '', 'Recipient Name': 'Skipped / Unsent:', 'Mobile Number': campaign.skippedCount, 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
      { 'S.No': '', 'Recipient Name': 'Export Date:', 'Mobile Number': new Date().toLocaleString(), 'Amount Due (₹)': '', 'Dispatch Status': '', 'Sent Timestamp': '', 'Personalized Message': '' },
    ];

    const allData = [...rows, ...summaryRows];

    // 3. Create Workbook & Worksheet
    const worksheet = XLSX.utils.json_to_sheet(allData);

    // Set auto-fit column widths
    worksheet['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 24 }, // Name
      { wch: 18 }, // Mobile
      { wch: 16 }, // Amount
      { wch: 18 }, // Status
      { wch: 22 }, // Timestamp
      { wch: 45 }, // Message
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Statement');

    // 4. Generate base64 string
    const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 5. Clean filename and save to cache directory using modern Expo File API
    const sanitizedTitle = campaign.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const fileName = `Dispatch_Audit_${sanitizedTitle}_${timestamp}.xlsx`;
    const targetFile = new File(Paths.cache, fileName);

    await targetFile.write(base64Data, { encoding: 'base64' });

    // 6. Launch native share dialog if available
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(targetFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Export ${campaign.title} Audit`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    }

    return { success: true, filePath: targetFile.uri };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export Excel file.' };
  }
}

export async function exportGenericWorkbook(
  sheetData: any[],
  sheetName = 'Sheet1',
  fileName = 'Export.xlsx',
  dialogTitle = 'Export Spreadsheet'
): Promise<ExportResult> {
  try {
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const targetFile = new File(Paths.cache, fileName);
    await targetFile.write(base64Data, { encoding: 'base64' });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(targetFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle,
        UTI: 'com.microsoft.excel.xlsx',
      });
    }

    return { success: true, filePath: targetFile.uri };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export Excel file.' };
  }
}
