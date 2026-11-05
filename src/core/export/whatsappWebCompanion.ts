/**
 * WhatsApp Web / Desktop Companion Exporter
 * Generates ready-to-run desktop automation payloads and web links
 * for users operating Dispatch campaigns from PC / Mac / Chrome.
 */

import { NormalizedStudentRecord } from '../../types';
import { renderStudentMessage } from '../template/templateCompiler';
import { exportGenericWorkbook, ExportResult } from './exportService';

export interface WhatsAppWebPayloadItem {
  phone: string;
  name: string;
  balance: number | string;
  message: string;
  webLink: string;
}

export function generateWhatsAppWebDataset(
  records: NormalizedStudentRecord[],
  templateText: string,
  mappingConfig?: any
): WhatsAppWebPayloadItem[] {
  return records.map((record) => {
    const rawPhone = record.parentPhone || record.rawPhone || '';
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `91${digits}`;
    }

    const { renderedText } = renderStudentMessage(templateText, record, [], mappingConfig);
    const webLink = digits
      ? `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(renderedText)}`
      : '';

    return {
      phone: digits,
      name: record.studentName,
      balance: record.outstandingBalance !== undefined ? record.outstandingBalance : 'N/A',
      message: renderedText,
      webLink,
    };
  });
}

/**
 * Exports a Desktop Companion Excel Sheet formatted with 1-click WhatsApp Web launch links
 */
export async function exportWhatsAppWebExcel(
  records: NormalizedStudentRecord[],
  templateText: string,
  fileName = 'Dispatch_WhatsApp_Web_Companion'
): Promise<ExportResult> {
  const dataset = generateWhatsAppWebDataset(records, templateText);

  const formattedRows = dataset.map((item, index) => ({
    'S.No': index + 1,
    'Recipient Name': item.name,
    'WhatsApp Number': item.phone,
    'Outstanding Balance': item.balance,
    'Message Text': item.message,
    'Direct WhatsApp Web Link': item.webLink,
  }));

  return exportGenericWorkbook(
    formattedRows,
    'WhatsApp Web Links',
    `${fileName}_${Date.now()}.xlsx`,
    'Export WhatsApp Web Companion'
  );
}
