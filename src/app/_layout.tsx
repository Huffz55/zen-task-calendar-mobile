import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppProvider, useApp } from '../context/AppContext';
import { Toast } from '../components/common/Toast';
import { ThemeModal } from '../components/common/ThemeModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { SyncModal } from '../components/common/SyncModal';

function RootLayoutContent() {
  const {
    theme,
    currentThemeKey,
    setTheme,
    isThemeModalOpen,
    setIsThemeModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isSyncModalOpen,
    setIsSyncModalOpen,
    handleExportBackup,
    handleImportBackup,
    tasks,
    lists,
    toast,
    showToast,
    dismissToast,
  } = useApp();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      {/* Floating Toast Notification */}
      <Toast toast={toast} onDismiss={dismissToast} theme={theme} />

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
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onShowToast={msg => showToast({ message: msg, type: 'info' })}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootLayoutContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
