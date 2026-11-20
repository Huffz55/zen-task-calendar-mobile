import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from '../context/AppContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Toast } from '../components/common/Toast';
import { ThemeModal } from '../components/common/ThemeModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { SyncModal } from '../components/common/SyncModal';

try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {
  // Ignore if native splash controller is unavailable (e.g., web or older host)
}

function RootLayoutContent() {
  const {
    theme,
    currentThemeKey,
    setTheme,
    isHydrated,
    morningBriefingEnabled,
    eveningReviewEnabled,
    toggleMorningBriefing,
    toggleEveningReview,
    isThemeModalOpen,
    setIsThemeModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isSyncModalOpen,
    setIsSyncModalOpen,
    handleExportBackup,
    handleImportBackup,
    handleClearAllData,
    tasks,
    lists,
    autoNightShift,
    toggleAutoNightShift,
    toast,
    showToast,
    dismissToast,
    hasActiveTimerSession,
  } = useApp();
  const pathname = usePathname();

  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const [splashTimedOut, setSplashTimedOut] = useState(false);
  const hasHiddenSplashRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashTimedOut(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = (isHydrated && (fontsLoaded || Boolean(fontError))) || splashTimedOut;

  const hideSplashIfReady = useCallback(() => {
    if (!isAppReady || hasHiddenSplashRef.current) return;
    hasHiddenSplashRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, [isAppReady]);

  useEffect(() => {
    hideSplashIfReady();
  }, [hideSplashIfReady]);

  // Keep native Android/iOS root window background aligned with active theme when supported by the binary
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const systemUi = require('expo-system-ui') as typeof import('expo-system-ui');
      systemUi.setBackgroundColorAsync?.(theme.background)?.catch?.(() => {});
    } catch {
      // Older APKs without ExpoSystemUI native module ignore gracefully during OTA
    }
  }, [theme.background]);

  const isMiniPlayerVisible = hasActiveTimerSession && !pathname.includes('/focus') && !pathname.includes('/list/');

  if (!isAppReady) {
    return <View style={[styles.root, { backgroundColor: theme.background }]} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} onLayout={hideSplashIfReady}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} animated />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'ios_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen
          name="list/[id]"
          options={{
            headerShown: false,
            animation: 'ios_from_right',
            gestureEnabled: true,
          }}
        />
      </Stack>

      {/* Floating Toast Notification */}
      <Toast
        toast={toast}
        onDismiss={dismissToast}
        theme={theme}
        hasMiniPlayer={isMiniPlayerVisible}
      />

      {/* Color Palette Theme Modal */}
      <ThemeModal
        visible={isThemeModalOpen}
        currentTheme={currentThemeKey}
        theme={theme}
        onSelectTheme={setTheme}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Cloud Sync Modal */}
      <SyncModal
        visible={isSyncModalOpen}
        theme={theme}
        onClose={() => setIsSyncModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Backup & Settings Modal */}
      <SettingsModal
        visible={isSettingsModalOpen}
        theme={theme}
        totalTasks={tasks.length}
        totalLists={lists.length}
        tasks={tasks}
        autoNightShift={autoNightShift}
        onToggleAutoNightShift={toggleAutoNightShift}
        morningBriefingEnabled={morningBriefingEnabled}
        eveningReviewEnabled={eveningReviewEnabled}
        onToggleMorningBriefing={toggleMorningBriefing}
        onToggleEveningReview={toggleEveningReview}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onClearAllData={handleClearAllData}
        onShowToast={msg => showToast({ message: msg, type: 'info' })}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <RootLayoutContent />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
