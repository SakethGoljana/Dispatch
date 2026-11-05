import React, { useState } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../tokens';
import { DatasetProvider } from '../core/state/DatasetStore';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';

// Suppress internal developer warnings from appearing as visual overlays on device
LogBox.ignoreLogs([
  "Response.blob() is using React Native's Blob",
  'Method readAsStringAsync',
  'File.base64() error',
]);

function InnerStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/import" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/select-method" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/send-personal" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/send-api" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/mapping" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/compose" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/recipients" options={{ headerShown: false }} />
        <Stack.Screen name="workflow/review" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="legal/docs" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DatasetProvider>
          <InnerStack />
          {!splashFinished && (
            <AnimatedSplashScreen onFinish={() => setSplashFinished(true)} />
          )}
        </DatasetProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
