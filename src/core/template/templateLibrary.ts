/**
 * SheetPing Template Library & Category Manager
 * Pre-loaded versatile business, educational, and organizational templates.
 */

import { MessageTemplate, TemplateCategory } from '../../types';

export const BUILT_IN_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-payment-due',
    name: 'Payment & Balance Due Reminder',
    category: 'fee_reminder',
    body: 'Dear {{Name}},\n\nThis is a polite reminder regarding the outstanding balance of ₹{{Balance}} on your account.\n\nKindly arrange payment at your earliest convenience.\n\nThank you,\nAccounts & Administration',
    variables: [
      { token: 'Name', label: 'Contact Name', required: true },
      { token: 'Balance', label: 'Outstanding Balance', required: true },
    ],
    updatedAt: '2026-10-10',
    createdAt: '2026-10-10',
  },
  {
    id: 'tpl-appointment-alert',
    name: 'Appointment & Booking Confirmation',
    category: 'announcement',
    body: 'Hello {{Name}},\n\nYour appointment has been scheduled for {{Date}} at {{Time}}.\n\nPlease let us know if you need to make any changes.\n\nWarm regards,\nFront Desk & Scheduling',
    variables: [
      { token: 'Name', label: 'Contact Name', required: true },
      { token: 'Date', label: 'Date', required: false },
      { token: 'Time', label: 'Time', required: false },
    ],
    updatedAt: '2026-10-10',
    createdAt: '2026-10-10',
  },
  {
    id: 'tpl-order-dispatch',
    name: 'Order & Delivery Update',
    category: 'order',
    body: 'Hi {{Name}},\n\nYour order has been dispatched for delivery to {{Address}}.\n\nStatus: {{Status | default: "In Transit"}}\n\nThank you for choosing us!',
    variables: [
      { token: 'Name', label: 'Customer Name', required: true },
      { token: 'Address', label: 'Delivery Address', required: false },
      { token: 'Status', label: 'Status', required: false },
    ],
    updatedAt: '2026-10-10',
    createdAt: '2026-10-10',
  },
  {
    id: 'tpl-invoice-due',
    name: 'Invoice & Service Balance Due',
    category: 'fee_reminder',
    body: 'Dear {{Name}},\n\nThis is a reminder regarding invoice #{{Invoice}} with a pending balance of ₹{{Balance}}.\n\nKindly arrange payment before {{Due Date}}.\n\nThank you,\nFinance & Administration',
    variables: [
      { token: 'Name', label: 'Customer / Client Name', required: true },
      { token: 'Invoice', label: 'Invoice No', required: false },
      { token: 'Balance', label: 'Outstanding Balance', required: true },
      { token: 'Due Date', label: 'Due Date', required: false },
    ],
    updatedAt: '2026-10-10',
    createdAt: '2026-10-10',
  },
  {
    id: 'tpl-general-announcement',
    name: 'General Notice & Announcement',
    category: 'announcement',
    body: 'Dear {{Name}},\n\nImportant announcement from our office: Please note that operations will be adjusted on {{Date}}.\n\nRegular services will resume promptly.\n\nBest regards,\nManagement Team',
    variables: [
      { token: 'Name', label: 'Contact Name', required: true },
      { token: 'Date', label: 'Date', required: false },
    ],
    updatedAt: '2026-10-10',
    createdAt: '2026-10-10',
  },
];

export class TemplateLibrary {
  private templates: MessageTemplate[];

  constructor(initialTemplates: MessageTemplate[] = BUILT_IN_TEMPLATES) {
    this.templates = [...initialTemplates];
  }

  getAll(): MessageTemplate[] {
    return [...this.templates];
  }

  getByCategory(category: TemplateCategory | 'all'): MessageTemplate[] {
    if (category === 'all') return this.getAll();
    return this.templates.filter((t) => t.category === category);
  }

  getById(id: string): MessageTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  create(template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>): MessageTemplate {
    const newTemplate: MessageTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.templates.unshift(newTemplate);
    return newTemplate;
  }

  update(id: string, updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt'>>): MessageTemplate | undefined {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.templates[index];
  }

  duplicate(id: string): MessageTemplate | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    return this.create({
      name: `${existing.name} (Copy)`,
      category: existing.category,
      body: existing.body,
      variables: [...existing.variables],
    });
  }

  delete(id: string): boolean {
    const initialLen = this.templates.length;
    this.templates = this.templates.filter((t) => t.id !== id);
    return this.templates.length < initialLen;
  }
}
