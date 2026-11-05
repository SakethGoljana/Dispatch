import {
  extractTemplateTokens,
  formatIndianCurrency,
  renderStudentMessage,
} from '../core/template/templateCompiler';
import { autoMatchTemplate } from '../core/template/templateAutoMatcher';
import { filterAndPrepareRecipients } from '../core/filters/recipientFilter';
import { SAMPLE_LEDGER_ROWS } from '../fixtures/sampleLedger';
import { autoDetectMappings } from '../core/mapper/columnMapper';
import { normalizeAndValidateDataset } from '../core/validator/recordValidator';

describe('Template Token Extraction & Formatting', () => {
  it('extracts variable tokens and default fallback values', () => {
    const text = 'Dear {{STUDENT_NAME}}, your fee of ₹{{BALANCE}} is due. Note: {{REMARKS | default: "None"}}.';
    const tokens = extractTemplateTokens(text);

    expect(tokens.length).toBe(3);
    expect(tokens[0].key).toBe('STUDENT_NAME');
    expect(tokens[1].key).toBe('BALANCE');
    expect(tokens[2].key).toBe('REMARKS');
    expect(tokens[2].fallback).toBe('None');
  });

  it('formats amounts in Indian numbering convention (en-IN)', () => {
    expect(formatIndianCurrency(11500)).toBe('11,500');
    expect(formatIndianCurrency(100000)).toBe('1,00,000');
    expect(formatIndianCurrency(0)).toBe('0');
  });
});

describe('Live Student Message Rendering', () => {
  const auto = autoDetectMappings(Object.keys(SAMPLE_LEDGER_ROWS[0]), '+91');
  const dataset = normalizeAndValidateDataset(SAMPLE_LEDGER_ROWS, auto.config);
  const students = dataset.records;

  it('renders personalized message for student #1 with currency formatting', () => {
    const template = 'Hello {{STUDENT_NAME}}, Class {{CLASS}}-{{SECTION}}. Balance is ₹{{BALANCE}}. Route: {{VEHICLE NO.}}.';
    const student1 = students[0]; // Aarav Sharma, Class 2-A, Balance 11500, MAGIC-1

    const result = renderStudentMessage(template, student1, ['STUDENT_NAME', 'BALANCE']);

    expect(result.isValid).toBe(true);
    expect(result.renderedText).toContain('Hello AARAV');
    expect(result.renderedText).toContain('Class 2-A');
    expect(result.renderedText).toContain('Balance is ₹11,500');
    expect(result.renderedText).toContain('Route: MAGIC-1');
  });

  it('evaluates dynamic dates and inline math formulas correctly', () => {
    const student1 = students[0]; // Aarav Sharma, Balance 11500
    const template = 'Fee is ₹{{BALANCE}}, early payment is ₹{{BALANCE - 1500}}, today is {{today}}.';
    const result = renderStudentMessage(template, student1, []);

    expect(result.isValid).toBe(true);
    expect(result.renderedText).toContain('Fee is ₹11,500');
    expect(result.renderedText).toContain('early payment is ₹10,000');
    expect(result.renderedText).not.toContain('{{today}}');
  });

  it('blocks message when required variable is missing', () => {
    const template = 'Dear {{STUDENT_NAME}}, your exam marks are {{EXAM_MARKS}}.';
    const student1 = students[0]; // Does not have EXAM_MARKS

    const result = renderStudentMessage(template, student1, ['STUDENT_NAME', 'EXAM_MARKS']);

    expect(result.isValid).toBe(false);
    expect(result.missingRequiredFields).toContain('EXAM_MARKS');
    expect(result.renderedText).toContain('[MISSING: EXAM_MARKS]');
  });

  it('uses fallback value when optional field is missing', () => {
    const template = 'Remarks: {{REMARKS | default: "No pending issues"}}.';
    const student1 = students[0]; // Aarav has empty remarks

    const result = renderStudentMessage(template, student1, []);
    expect(result.isValid).toBe(true);
    expect(result.renderedText).toBe('Remarks: No pending issues.');
  });

  it('accurately resolves exact hyphenated column name tokens (e.g. {{25-26 Bal}})', () => {
    // Row 2 is Priya Patel: '25-26 Bal': 4000, 'OLD/NEW': 'NEW'
    const priya = students[1];
    const template = 'Hello {{STUDENT NAME}}, your pending dues are ₹{{25-26 Bal}}. Category: {{OLD/NEW}}.';

    const result = renderStudentMessage(template, priya, ['STUDENT NAME', '25-26 Bal'], auto.config);

    expect(result.isValid).toBe(true);
    expect(result.renderedText).toContain('Hello PRIYA');
    expect(result.renderedText).toContain('pending dues are ₹4,000');
    expect(result.renderedText).toContain('Category: NEW');
  });

  it('resolves both exact column header {{25-26 Bal}} and alias {{Balance}} consistently', () => {
    const priya = students[1];
    const templateExact = 'Due: ₹{{25-26 Bal}}';
    const templateAlias = 'Due: ₹{{Balance}}';

    const resultExact = renderStudentMessage(templateExact, priya, [], auto.config);
    const resultAlias = renderStudentMessage(templateAlias, priya, [], auto.config);

    expect(resultExact.renderedText).toBe('Due: ₹4,000');
    expect(resultAlias.renderedText).toBe('Due: ₹10,000');
  });

  it('handles spelling variations and fuzzy column tokens like {{25-26 balance}}', () => {
    const priya = students[1];
    const template = 'Dues: ₹{{25-26 balance}}';

    const result = renderStudentMessage(template, priya, [], auto.config);
    expect(result.renderedText).toBe('Dues: ₹4,000');
  });
});

describe('Recipient Filtering Engine', () => {
  const auto = autoDetectMappings(Object.keys(SAMPLE_LEDGER_ROWS[0]), '+91');
  const dataset = normalizeAndValidateDataset(SAMPLE_LEDGER_ROWS, auto.config);
  const students = dataset.records;
  const template = 'Dear {{STUDENT_NAME}}, balance is ₹{{BALANCE}}.';

  it('filters by balance > 0 and blocks missing phone numbers', () => {
    // In our 5-student sample ledger:
    // Row 1 (Aarav): Valid phone, Balance 11500 -> ELIGIBLE
    // Row 2 (Priya): Valid phone, Balance 10000 -> ELIGIBLE
    // Row 3 (Vikram): Valid phone, Balance 3300 -> ELIGIBLE
    // Row 4 (Ananya): Missing phone, Balance 7500 -> EXCLUDED (no phone)
    // Row 5 (Rohit): Valid phone, Balance 0 -> EXCLUDED (0 balance)

    const result = filterAndPrepareRecipients(students, template, ['STUDENT_NAME', 'BALANCE'], {
      onlyPositiveBalance: true,
      selectedSection: 'ALL',
      selectedClass: 'ALL',
    });

    expect(result.totalRecords).toBe(5);
    expect(result.eligibleCount).toBe(3);
    expect(result.excludedCount).toBe(2);

    // Verify exclusions
    const excludedPhones = result.excludedRecipients.find((r) =>
      r.exclusionReason?.includes('WhatsApp number')
    );
    expect(excludedPhones?.student.studentName).toBe('ANANYA');

    const excludedZero = result.excludedRecipients.find((r) =>
      r.exclusionReason?.includes('Fee balance is ₹0')
    );
    expect(excludedZero?.student.studentName).toBe('ROHIT');
  });

  it('filters by section accurately', () => {
    const resultSecA = filterAndPrepareRecipients(students, template, ['STUDENT_NAME'], {
      onlyPositiveBalance: false,
      selectedSection: 'A',
    });

    // Rows in Sec A: Row 1 (Aarav), Row 2 (Priya), Row 5 (Rohit)
    expect(resultSecA.eligibleCount).toBe(3);
    for (const el of resultSecA.eligibleRecipients) {
      expect(el.student.section).toBe('A');
    }
  });

  it('identifies sibling shared phone numbers among eligible recipients', () => {
    // In our sample ledger, Aarav and Vikram share the phone number 9876543210
    const result = filterAndPrepareRecipients(students, template, ['STUDENT_NAME', 'BALANCE'], {
      onlyPositiveBalance: true,
    });

    const aarav = result.eligibleRecipients.find((r) => r.student.studentName === 'AARAV');
    const vikram = result.eligibleRecipients.find((r) => r.student.studentName === 'VIKRAM');

    expect(aarav?.isSharedPhone).toBe(true);
    expect(vikram?.isSharedPhone).toBe(true);
    expect(result.sharedPhoneGroupCount).toBe(1);
  });
});

describe('Template Token Auto-Matcher Engine', () => {
  const headers = [
    'S.NO',
    'C',
    'SEC',
    'STUDENT NAME',
    'PHONE NO',
    '25-26 Bal',
    'Up to T2.Bal',
    'REMARKS',
  ];
  const auto = autoDetectMappings(headers, '+91');

  it('aligns generic template tokens to real spreadsheet columns in a single pass', () => {
    const genericTemplate =
      'Dear {{Name}},\nYour child in Class {{Class}}-{{Section}} has fee balance ₹{{Balance}}.\nPhone: {{Phone}}.';

    const result = autoMatchTemplate(genericTemplate, headers, auto.config);

    expect(result.matchedCount).toBeGreaterThan(0);
    expect(result.updatedTemplate).toContain('{{STUDENT NAME}}');
    expect(result.updatedTemplate).toContain('{{C}}');
    expect(result.updatedTemplate).toContain('{{SEC}}');
    expect(result.updatedTemplate).toContain('{{PHONE NO}}');
  });

  it('preserves existing exact matches without mutating them', () => {
    const alreadyMatched = 'Hello {{STUDENT NAME}}, your balance is ₹{{25-26 Bal}}.';
    const result = autoMatchTemplate(alreadyMatched, headers, auto.config);

    expect(result.matchedCount).toBe(0);
    expect(result.alreadyMatchedCount).toBe(2);
    expect(result.updatedTemplate).toBe(alreadyMatched);
  });

  it('generates a tailored template when template is empty', () => {
    const result = autoMatchTemplate('', headers, auto.config);

    expect(result.updatedTemplate).toContain('{{STUDENT NAME}}');
    expect(result.matchedCount).toBeGreaterThan(0);
  });
});
