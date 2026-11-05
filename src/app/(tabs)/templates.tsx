import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  BackToTopButton,
  Badge,
  Button,
  Card,
  CopyButton,
  Header,
  ScreenContainer,
  ScrollProgressBar,
} from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';
import { MessageTemplate, TemplateCategory } from '../../types';
import {
  deleteCustomTemplate,
  getAllTemplates,
  saveCustomTemplate,
} from '../../core/template/templateStorage';
import { useDataset } from '../../core/state/DatasetStore';

export default function TemplatesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { setTemplateText } = useDataset();
  const scrollViewRef = useRef<any>(null);

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Template Form Fields
  const [formName, setFormName] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState<TemplateCategory>('fee_reminder');

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'fee_reminder', label: 'Billing & Due' },
    { id: 'appointment', label: 'Appointments' },
    { id: 'order', label: 'Orders & Delivery' },
    { id: 'announcement', label: 'Broadcasts' },
  ];

  const refreshTemplates = async () => {
    const list = await getAllTemplates();
    setTemplates(list);
  };

  useEffect(() => {
    refreshTemplates();
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrollY(contentOffset.y);
    const totalScrollable = contentSize.height - layoutMeasurement.height;
    if (totalScrollable > 0) {
      setScrollProgress((contentOffset.y / totalScrollable) * 100);
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setFormName('');
    setFormBody('');
    setFormCategory('fee_reminder');
    setModalVisible(true);
  };

  const openEditModal = (t: MessageTemplate) => {
    setEditingTemplateId(t.id);
    setFormName(t.name);
    setFormBody(t.body);
    setFormCategory(t.category);
    setModalVisible(true);
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      Alert.alert('Required', 'Please enter a template name.');
      return;
    }
    if (!formBody.trim()) {
      Alert.alert('Required', 'Please enter message content.');
      return;
    }

    await saveCustomTemplate(formName.trim(), formBody.trim(), formCategory, editingTemplateId || undefined);
    setModalVisible(false);
    await refreshTemplates();

    // Trigger Success Banner
    setSaveSuccessMessage('Template saved successfully! ✓');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);
  };

  const handleDelete = (t: MessageTemplate) => {
    Alert.alert('Delete Template', `Are you sure you want to delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomTemplate(t.id);
          refreshTemplates();
        },
      },
    ]);
  };

  const handleUseInCampaign = (t: MessageTemplate) => {
    setTemplateText(t.body);
    router.push('/workflow/import');
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.length === 0 ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ScreenContainer scrollable={false} safeTop={false} safeBottom={false}>
      <Header
        title="Message Templates"
        subtitle="Reusable WhatsApp templates with dynamic variables"
        rightAction={
          <Button
            title="Create"
            size="sm"
            onPress={openCreateModal}
            icon={<Ionicons name="add" size={16} color={colors.textInverse} />}
          />
        }
      />

      {/* Scroll Reading Progress Bar */}
      <ScrollProgressBar progress={scrollProgress} />

      {/* Form Success State Toast Banner */}
      {saveSuccessMessage && (
        <View style={styles.successToast}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.successToastText}>{saveSuccessMessage}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.body}
      >
        {/* Search Bar */}
        <View
          style={[
            styles.searchBarWrap,
            {
              backgroundColor: isDark ? '#1E293B' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search templates by keyword or name..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={({ pressed }) => [
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? (isDark ? '#10B981' : colors.primary) : colors.surfaceSubtle,
                    borderColor: isActive ? (isDark ? '#10B981' : colors.primary) : colors.border,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Templates List */}
        <View style={styles.list}>
          {filteredTemplates.length === 0 ? (
            <Card subtle style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
              <Text style={{ marginTop: 8, fontWeight: '700', color: colors.textPrimary }}>
                No Templates Found
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Try another search query or create a new template.
              </Text>
            </Card>
          ) : (
            filteredTemplates.map((template) => {
              const isCustom = template.id.startsWith('custom-tpl-');
              const updatedAtFormatted = new Date(template.updatedAt || template.createdAt).toLocaleDateString();

              return (
                <Card key={template.id} style={styles.templateCard}>
                  <View style={styles.templateHeader}>
                    <View style={styles.templateTitleWrap}>
                      <Text style={[styles.templateName, { color: colors.textPrimary }]}>
                        {template.name}
                      </Text>
                      <View style={styles.badgesRow}>
                        <Badge
                          label={
                            template.category === 'fee_reminder'
                              ? 'Billing & Due'
                              : template.category === 'appointment'
                              ? 'Appointment'
                              : template.category === 'order'
                              ? 'Order'
                              : 'Broadcast'
                          }
                          variant="primary"
                          size="sm"
                        />
                        {isCustom && <Badge label="Custom" variant="success" size="sm" />}
                        <Text style={[styles.lastUpdatedText, { color: colors.textTertiary }]}>
                          Saved {updatedAtFormatted}
                        </Text>
                      </View>
                    </View>

                    {isCustom && (
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => openEditModal(template)}
                          style={styles.iconActionBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="pencil-outline" size={17} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(template)}
                          style={styles.iconActionBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={17} color={colors.error} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.messagePreviewBox,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.templateBody, { color: colors.textSecondary }]}
                      numberOfLines={4}
                    >
                      {template.body}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <CopyButton textToCopy={template.body} label="Copy Text" />

                    <Button
                      title="Use in Campaign →"
                      size="sm"
                      variant="outline"
                      onPress={() => handleUseInCampaign(template)}
                      icon={<Ionicons name="paper-plane-outline" size={14} color={colors.primary} />}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Back to Top Button */}
      <BackToTopButton visible={scrollY > 150} onPress={scrollToTop} bottomOffset={20} />

      {/* CREATE / EDIT TEMPLATE MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingTemplateId ? 'Edit Template' : 'Create New Template'}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Template Name
              </Text>
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Appointment Confirmation or Invoice Due"
                placeholderTextColor={colors.textTertiary}
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Category
              </Text>
              <View style={styles.categorySelectRow}>
                {(
                  [
                    { id: 'fee_reminder', label: 'Billing & Due' },
                    { id: 'appointment', label: 'Appointment' },
                    { id: 'order', label: 'Order' },
                    { id: 'announcement', label: 'Broadcast' },
                  ] as const
                ).map((c) => {
                  const active = formCategory === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setFormCategory(c.id)}
                      style={[
                        styles.catChoicePill,
                        {
                          backgroundColor: active ? (isDark ? '#10B981' : colors.primary) : colors.surfaceSubtle,
                          borderColor: active ? (isDark ? '#10B981' : colors.primary) : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChoiceText,
                          { color: active ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Message Content (WhatsApp Formatted)
              </Text>
              <TextInput
                style={[
                  styles.bodyInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Type your template text here... You can use tokens like {{Name}} or {{Balance}} which will be replaced during campaigns."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={formBody}
                onChangeText={setFormBody}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={editingTemplateId ? 'Update Template' : 'Save Template'}
                  variant="primary"
                  onPress={handleSaveTemplate}
                  style={{ flex: 1.5 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginBottom: 8,
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryScroll: {
    marginBottom: spacing.base,
    flexGrow: 0,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: spacing.base,
  },
  templateCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  templateTitleWrap: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  lastUpdatedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  iconActionBtn: {
    padding: 4,
  },
  messagePreviewBox: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  templateBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth: 1,
    padding: spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalScroll: {
    marginTop: spacing.base,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: spacing.base,
  },
  categorySelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.base,
  },
  catChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  catChoiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 110,
    marginBottom: spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
});
