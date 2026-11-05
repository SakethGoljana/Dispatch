import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { radii, useTheme } from '../tokens';

const PRIVACY_BANNER_KEY = '@dispatch_privacy_notice_dismissed_v1';

export const PrivacyDataBanner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    AsyncStorage.getItem(PRIVACY_BANNER_KEY).then((val) => {
      if (val !== 'true') {
        setDismissed(false);
      }
    });
  }, []);

  const handleDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(PRIVACY_BANNER_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? '#06281E' : '#ECFDF5',
          borderColor: isDark ? '#059669' : '#A7F3D0',
        },
      ]}
    >
      <View style={styles.contentRow}>
        <Ionicons name="shield-checkmark" size={18} color="#10B981" style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
            Local Device Privacy
          </Text>
          <Text style={[styles.body, { color: isDark ? '#6EE7B7' : '#047857' }]}>
            Spreadsheet contacts and messages remain strictly on your phone. Dispatch never uploads your customer lists to third-party tracking databases.
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.dismissBtn,
            { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
          accessibilityLabel="Dismiss privacy notice"
        >
          <Text style={[styles.dismissText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
            Got it ✓
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 11,
    lineHeight: 15,
  },
  dismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    alignSelf: 'center',
  },
  dismissText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
