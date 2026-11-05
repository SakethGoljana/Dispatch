import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageTemplate } from '../../types';
import { BUILT_IN_TEMPLATES } from './templateLibrary';

const CUSTOM_TEMPLATES_KEY = '@schoolping_custom_templates_v1';

export async function getCustomTemplates(): Promise<MessageTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomTemplate(
  name: string,
  body: string,
  category: MessageTemplate['category'] = 'announcement',
  id?: string
): Promise<MessageTemplate> {
  const existing = await getCustomTemplates();
  const now = new Date().toISOString();

  if (id) {
    const updated = existing.map((t) =>
      t.id === id ? { ...t, name, body, category, updatedAt: now } : t
    );
    await AsyncStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
    return updated.find((t) => t.id === id)!;
  }

  const newTemplate: MessageTemplate = {
    id: `custom-tpl-${Date.now()}`,
    name,
    category,
    body,
    variables: [], // Simplified: no forced manual variable registration
    createdAt: now,
    updatedAt: now,
  };

  const nextList = [newTemplate, ...existing];
  await AsyncStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(nextList));
  return newTemplate;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const existing = await getCustomTemplates();
  const nextList = existing.filter((t) => t.id !== id);
  await AsyncStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(nextList));
}

export async function getAllTemplates(): Promise<MessageTemplate[]> {
  const custom = await getCustomTemplates();
  return [...custom, ...BUILT_IN_TEMPLATES];
}
