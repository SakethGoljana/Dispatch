import { filterAndPrepareRecipients, CustomFilterRule } from '../core/filters/recipientFilter';
import { NormalizedStudentRecord } from '../types';

describe('Universal Recipient Filtering with Custom Business Rules', () => {
  const sampleContacts: NormalizedStudentRecord[] = [
    {
      id: 'c-1',
      rowNumber: 1,
      studentName: 'Amit Shah',
      parentPhone: '+919876543210',
      rawPhone: '9876543210',
      outstandingBalance: 5000,
      isValidPhone: true,
      validationErrors: [],
      customFields: {
        City: 'Mumbai',
        Membership: 'Gold',
        Score: 92,
      },
    },
    {
      id: 'c-2',
      rowNumber: 2,
      studentName: 'Priya Sharma',
      parentPhone: '+919876543211',
      rawPhone: '9876543211',
      outstandingBalance: 0,
      isValidPhone: true,
      validationErrors: [],
      customFields: {
        City: 'Delhi',
        Membership: 'Silver',
        Score: 65,
      },
    },
    {
      id: 'c-3',
      rowNumber: 3,
      studentName: 'Rohan Verma',
      parentPhone: '+919876543212',
      rawPhone: '9876543212',
      outstandingBalance: 1200,
      isValidPhone: true,
      validationErrors: [],
      customFields: {
        City: 'Mumbai',
        Membership: 'Bronze',
        Score: 40,
      },
    },
    {
      id: 'c-4',
      rowNumber: 4,
      studentName: 'Invalid Contact',
      parentPhone: '',
      rawPhone: '123',
      outstandingBalance: 0,
      isValidPhone: false,
      validationErrors: ['Invalid phone'],
      customFields: {
        City: 'Delhi',
      },
    },
  ];

  const template = 'Hello {{Student Name}}, your dues are ₹{{Balance}}.';

  test('default filter includes all valid contacts regardless of 0 balance', () => {
    const result = filterAndPrepareRecipients(sampleContacts, template);
    expect(result.totalRecords).toBe(4);
    expect(result.eligibleCount).toBe(3); // 3 valid phones, 1 invalid excluded
    expect(result.excludedCount).toBe(1);
    expect(result.excludedRecipients[0].student.id).toBe('c-4');
  });

  test('filters by positive balance when onlyPositiveBalance is true', () => {
    const result = filterAndPrepareRecipients(sampleContacts, template, [], {
      onlyPositiveBalance: true,
    });
    expect(result.eligibleCount).toBe(2); // c-1 (5000) and c-3 (1200)
    expect(result.eligibleRecipients.map((r) => r.student.id)).toEqual(['c-1', 'c-3']);
  });

  test('applies customRule with "equals" operator', () => {
    const rule: CustomFilterRule = {
      id: 'r1',
      column: 'City',
      operator: 'equals',
      value: 'Mumbai',
    };
    const result = filterAndPrepareRecipients(sampleContacts, template, [], {
      customRules: [rule],
    });
    expect(result.eligibleCount).toBe(2);
    expect(result.eligibleRecipients.map((r) => r.student.id)).toEqual(['c-1', 'c-3']);
  });

  test('applies customRule with "greater_than" operator on numeric custom attributes', () => {
    const rule: CustomFilterRule = {
      id: 'r2',
      column: 'Score',
      operator: 'greater_than',
      value: '50',
    };
    const result = filterAndPrepareRecipients(sampleContacts, template, [], {
      customRules: [rule],
    });
    expect(result.eligibleCount).toBe(2); // Amit (92) and Priya (65)
    expect(result.eligibleRecipients.map((r) => r.student.id)).toEqual(['c-1', 'c-2']);
  });

  test('combines multiple customRules (AND condition)', () => {
    const cityRule: CustomFilterRule = {
      id: 'r1',
      column: 'City',
      operator: 'equals',
      value: 'Mumbai',
    };
    const scoreRule: CustomFilterRule = {
      id: 'r2',
      column: 'Score',
      operator: 'greater_than',
      value: '80',
    };
    const result = filterAndPrepareRecipients(sampleContacts, template, [], {
      customRules: [cityRule, scoreRule],
    });
    expect(result.eligibleCount).toBe(1);
    expect(result.eligibleRecipients[0].student.id).toBe('c-1');
  });

  test('discovers all available column names across records', () => {
    const result = filterAndPrepareRecipients(sampleContacts, template);
    expect(result.availableColumns).toContain('City');
    expect(result.availableColumns).toContain('Membership');
    expect(result.availableColumns).toContain('Score');
  });
});
