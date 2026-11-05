import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import {
  saveCustomTemplate,
  getCustomTemplates,
  deleteCustomTemplate,
  getAllTemplates,
} from '../core/template/templateStorage';
import {
  saveCampaignRecord,
  getSavedCampaigns,
  deleteCampaignRecord,
  CampaignRecord,
} from '../core/campaign/campaignStorage';
import { BUILT_IN_TEMPLATES } from '../core/template/templateLibrary';
import { renderStudentMessage } from '../core/template/templateCompiler';
import { NormalizedStudentRecord } from '../types';

describe('Phase 7: Perfect Workflow & Data Persistence Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Simplified Template Management (User Requirement 1)', () => {
    test('saves template with just Title and Body without forcing variable declarations', async () => {
      const created = await saveCustomTemplate(
        'Annual Sports Day',
        'Dear Parent, Please note that Sports Day will be held this Saturday.'
      );

      expect(created.id).toMatch(/^custom-tpl-/);
      expect(created.name).toBe('Annual Sports Day');
      expect(created.body).toContain('Sports Day');
      expect(created.variables).toEqual([]); // No forced variable requirements

      const savedList = await getCustomTemplates();
      expect(savedList.length).toBe(1);
      expect(savedList[0].name).toBe('Annual Sports Day');
    });

    test('getAllTemplates combines custom templates with built-in templates', async () => {
      await saveCustomTemplate('Holiday Notice', 'School is closed tomorrow.');
      const all = await getAllTemplates();

      expect(all.length).toBe(BUILT_IN_TEMPLATES.length + 1);
      expect(all[0].name).toBe('Holiday Notice');
    });

    test('deletes custom template cleanly', async () => {
      const t = await saveCustomTemplate('To Delete', 'Text');
      let list = await getCustomTemplates();
      expect(list.length).toBe(1);

      await deleteCustomTemplate(t.id);
      list = await getCustomTemplates();
      expect(list.length).toBe(0);
    });
  });

  describe('Dynamic Variable Matching with Arbitrary Columns', () => {
    test('renders message with arbitrary columns inserted dynamically', () => {
      const student: NormalizedStudentRecord = {
        id: 'std-1',
        rowNumber: 2,
        studentName: 'Aarav Sharma',
        parentPhone: '+919059478739',
        rawPhone: '9059478739',
        outstandingBalance: 12500,
        customFields: {
          BusRoute: 'Route 14',
          FatherName: 'Rajesh Sharma',
        },
        isValidPhone: true,
        validationErrors: [],
      };

      const template = 'Dear {{FatherName}}, {{STUDENT_NAME}} will take {{BusRoute}}. Balance: ₹{{BALANCE}}.';
      const result = renderStudentMessage(template, student);

      expect(result.renderedText).toBe(
        'Dear Rajesh Sharma, Aarav Sharma will take Route 14. Balance: ₹12,500.'
      );
    });
  });

  describe('Campaign Record & Ephemeral Data Security (User Requirement 2)', () => {
    test('persists campaign record with recipients in history', async () => {
      const campaign: CampaignRecord = {
        id: 'camp-test-1',
        title: 'Fee Ledger September',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalCount: 2,
        confirmedSentCount: 2,
        skippedCount: 0,
        status: 'COMPLETED',
        method: 'link_mode',
        recipients: [
          {
            studentId: 'std-1',
            studentName: 'Aarav Sharma',
            parentPhone: '+919059478739',
            balance: 12500,
            renderedMessage: 'Dear Parent, fee is ₹12,500',
            status: 'CONFIRMED_SENT_BY_USER',
            timestamp: new Date().toISOString(),
          },
          {
            studentId: 'std-2',
            studentName: 'Diya Patel',
            parentPhone: '+919059478739',
            balance: 8000,
            renderedMessage: 'Dear Parent, fee is ₹8,000',
            status: 'CONFIRMED_SENT_BY_USER',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await saveCampaignRecord(campaign);

      const saved = await getSavedCampaigns();
      expect(saved.length).toBe(1);
      expect(saved[0].title).toBe('Fee Ledger September');
      expect(saved[0].recipients.length).toBe(2);
      expect(saved[0].recipients[0].studentName).toBe('Aarav Sharma');
      expect(saved[0].recipients[1].studentName).toBe('Diya Patel');

      // Delete capability
      await deleteCampaignRecord('camp-test-1');
      const afterDelete = await getSavedCampaigns();
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('Self-Service Meta Cloud API Integration', () => {
    test('saves, retrieves, and clears local Meta credentials on device', async () => {
      const {
        saveStoredMetaCredentials,
        getStoredMetaCredentials,
        clearStoredMetaCredentials,
      } = require('../core/whatsapp/metaClient');

      await saveStoredMetaCredentials({
        phoneNumberId: '104829104820194',
        accessToken: 'EAAG_TEST_TOKEN_123',
        verifiedName: 'Greenwood High School',
        verifiedNumber: '+919059478739',
      });

      const creds = await getStoredMetaCredentials();
      expect(creds).not.toBeNull();
      expect(creds.phoneNumberId).toBe('104829104820194');
      expect(creds.verifiedName).toBe('Greenwood High School');

      await clearStoredMetaCredentials();
      const emptyCreds = await getStoredMetaCredentials();
      expect(emptyCreds).toBeNull();
    });
  });
});
