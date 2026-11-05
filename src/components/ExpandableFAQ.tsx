import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, useTheme } from '../tokens';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'limits',
    question: 'What are the WhatsApp messaging limits?',
    answer:
      'In Method A (Personal Sender), you review and send via WhatsApp directly without Meta API limits. In Method B (Official Cloud API), Meta starts verified numbers at 250 to 1,000 messages/day and scales to 100,000+/day as quality rating stays high.',
  },
  {
    id: 'formats',
    question: 'Which spreadsheet formats are supported?',
    answer:
      'Dispatch natively parses Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Multi-sheet workbooks are automatically detected with an interactive worksheet picker.',
  },
  {
    id: 'facebook',
    question: 'Do I need a Facebook developer account to test?',
    answer:
      'No! Dispatch comes with a built-in Instant Test Sandbox so you can test 1-click cloud dispatches, receipt webhooks, and progress tracking immediately without creating a Facebook account.',
  },
  {
    id: 'privacy',
    question: 'Is my customer contact data uploaded to servers?',
    answer:
      'No. Your spreadsheet rows and contact numbers are processed ephemerally in device RAM. Once a campaign completes, active rows are wiped and archived strictly in your local offline Campaign History.',
  },
  {
    id: 'cardroll',
    question: 'How does the physical card roll work?',
    answer:
      'When using Personal WhatsApp mode, each contact appears on a 3D-styled card. Tapping "Mark Sent ✓" physically rolls the card to the left with dynamic rotation and loads the next recipient smoothly.',
  },
];

interface ExpandableFAQProps {
  items?: FAQItem[];
}

export const ExpandableFAQ: React.FC<ExpandableFAQProps> = ({
  items = DEFAULT_FAQS,
}) => {
  const { colors, isDark } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <View
            key={item.id}
            style={[
              styles.itemCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => toggleExpand(item.id)}
              style={({ pressed }) => [
                styles.questionRow,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.question}
            >
              <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                {item.question}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={isDark ? '#34D399' : colors.primary}
              />
            </Pressable>

            {isExpanded && (
              <View style={[styles.answerBox, { borderTopColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
                <Text style={[styles.answerText, { color: colors.textSecondary }]}>
                  {item.answer}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  itemCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  answerBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  answerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
