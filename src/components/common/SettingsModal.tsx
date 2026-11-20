import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Task } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, setGlobalHapticsEnabled } from '../../hooks/useHaptics';
import { defaultBackupService } from '../../services/storage/backupService';
import {
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
  isCompletionChimeEnabled,
  setCompletionChimeEnabled,
} from '../../services/audio/audioService';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { ExportDataModal, type ExportFormat } from './ExportDataModal';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';
import { resolveActiveLanguage, translate, useTranslation, type LanguagePreference } from '../../i18n';

interface SettingsModalProps {
  visible: boolean;
  theme: ThemeColors;
  totalTasks: number;
  totalLists: number;
  tasks?: Task[];
  autoNightShift?: boolean;
  onToggleAutoNightShift?: (enabled: boolean) => void;
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
  onToggleMorningBriefing: (enabled: boolean) => Promise<void>;
  onToggleEveningReview: (enabled: boolean) => Promise<void>;
  onClose: () => void;
  onOpenThemeModal?: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

const SETTINGS_HAPTIC_KEY = '@noteapp_setting_haptic';
const SETTINGS_CHIME_KEY = '@noteapp_setting_chime';

export function SettingsModal({
  visible,
  theme,
  totalTasks,
  totalLists,
  tasks = [],
  autoNightShift = false,
  onToggleAutoNightShift,
  morningBriefingEnabled,
  eveningReviewEnabled,
  onToggleMorningBriefing,
  onToggleEveningReview,
  onClose,
  onOpenThemeModal,
  onExportBackup,
  onImportBackup,
  onClearAllData,
  onShowToast,
}: SettingsModalProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [chimeEnabled, setChimeEnabled] = useState(() => isCompletionChimeEnabled());
  const [sfxEnabled, setSfxEnabled] = useState(() => isSoundEffectsEnabled());
  const { t, language, languagePreference, setLanguagePreference } = useTranslation();

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(SETTINGS_HAPTIC_KEY).then(val => {
      if (val !== null) {
        const enabled = val === 'true';
        setHapticsEnabled(enabled);
        setGlobalHapticsEnabled(enabled);
      }
    });
    AsyncStorage.getItem(SETTINGS_CHIME_KEY).then(val => {
      if (val !== null) {
        const enabled = val === 'true';
        setChimeEnabled(enabled);
        if (enabled !== isCompletionChimeEnabled()) {
          void setCompletionChimeEnabled(enabled);
        }
      }
    });
  }, [visible]);

  const handleToggleSfx = async (enabled: boolean) => {
    setSfxEnabled(enabled);
    await setSoundEffectsEnabled(enabled);
    onShowToast(t(enabled ? 'settings.toasts.sfxOn' : 'settings.toasts.sfxOff'));
  };

  const handleToggleMorning = async (enabled: boolean) => {
    hapticLight();
    await onToggleMorningBriefing(enabled);
    onShowToast(t(enabled ? 'settings.toasts.morningOn' : 'settings.toasts.morningOff'));
  };

  const handleToggleEvening = async (enabled: boolean) => {
    hapticLight();
    await onToggleEveningReview(enabled);
    onShowToast(t(enabled ? 'settings.toasts.eveningOn' : 'settings.toasts.eveningOff'));
  };

  const handleToggleHaptics = async (enabled: boolean) => {
    setGlobalHapticsEnabled(enabled);
    if (enabled) hapticLight();
    setHapticsEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled));
    onShowToast(t(enabled ? 'settings.toasts.hapticsOn' : 'settings.toasts.hapticsOff'));
  };

  const handleToggleChime = async (enabled: boolean) => {
    hapticLight();
    setChimeEnabled(enabled);
    await setCompletionChimeEnabled(enabled);
    onShowToast(t(enabled ? 'settings.toasts.chimeOn' : 'settings.toasts.chimeOff'));
  };

  const handleSelectLanguage = async (nextPref: LanguagePreference) => {
    if (nextPref === languagePreference) return;
    hapticSelection();
    await setLanguagePreference(nextPref);
    const labelKey =
      nextPref === 'system'
        ? 'settings.languageOptions.system'
        : nextPref === 'tr'
        ? 'settings.languageOptions.tr'
        : 'settings.languageOptions.en';
    const nextResolved = resolveActiveLanguage(nextPref);
    onShowToast(
      translate(nextResolved, 'settings.toasts.languageChanged', {
        language: translate(nextResolved, labelKey),
      })
    );
  };

  const handleSelectExportFormat = async (format: ExportFormat) => {
    if (exportingFormat !== null) return;
    setExportingFormat(format);
    try {
      if (format === 'json') {
        await onExportBackup();
      } else if (format === 'ics') {
        await defaultBackupService.exportICS(tasks);
        onShowToast(t('settings.toasts.exportIcsOk'));
      } else {
        await defaultBackupService.exportMarkdown(tasks);
        onShowToast(t('settings.toasts.exportMdOk'));
      }
      setIsExportModalOpen(false);
    } catch {
      if (format === 'ics') {
        onShowToast(t('settings.toasts.exportIcsErr'));
      } else if (format === 'md') {
        onShowToast(t('settings.toasts.exportMdErr'));
      } else {
        onShowToast(t('settings.toasts.exportBackupErr'));
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const handleImport = async () => {
    hapticLight();
    setIsImporting(true);
    try {
      await onImportBackup();
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmClearData = () => {
    if (!onClearAllData || isClearingData) return;
    hapticLight();
    Alert.alert(
      t('settings.clearConfirmTitle'),
      t('settings.clearConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsClearingData(true);
            try {
              await onClearAllData();
              onClose();
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  };

  const languageOptions: { id: LanguagePreference; label: string }[] = [
    { id: 'system', label: t('settings.languageOptions.system') },
    { id: 'tr', label: t('settings.languageOptions.tr') },
    { id: 'en', label: t('settings.languageOptions.en') },
  ];

  const activeLanguageDisplay =
    languagePreference === 'system'
      ? `${t('settings.languageOptions.system')} (${t(
          language === 'tr' ? 'settings.languageOptions.tr' : 'settings.languageOptions.en'
        )})`
      : t(languagePreference === 'tr' ? 'settings.languageOptions.tr' : 'settings.languageOptions.en');

  const activeThemeName =
    theme.name === 'Sakura Rose'
      ? t('themes.sakura')
      : theme.name === 'Matcha Garden'
      ? t('themes.matcha')
      : theme.name === 'Nordic Breeze'
      ? t('themes.nordic')
      : theme.name === 'Midnight Silk'
      ? t('themes.midnight')
      : theme.name;

  return (
    <>
      <SwipeableBottomSheet
        visible={visible && !isPrivacyOpen && !isExportModalOpen}
        onClose={onClose}
        theme={theme}
        maxHeight="88%"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              {t('settings.title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              {t('settings.subtitleCounts', { tasks: totalTasks, lists: totalLists })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onClose();
            }}
            style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11yClose')}
          >
            <Ionicons name="close" size={18} color={theme.textDim} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Preferences */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('settings.sectionPreferences')}
          </Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            {onOpenThemeModal && (
              <>
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onOpenThemeModal();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                    <Ionicons name="color-palette-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                      {t('settings.appearance')}
                    </Text>
                    <Text style={[styles.actionDesc, { color: theme.textDim }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                      {activeThemeName}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                </TouchableOpacity>
                <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
              </>
            )}

            {/* Language Picker */}
            <View style={styles.languageBlock}>
              <View style={styles.languageHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="globe-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                    {t('settings.language')}
                  </Text>
                  <Text style={[styles.actionDesc, { color: theme.textDim }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                    {activeLanguageDisplay}
                  </Text>
                </View>
              </View>
              <View style={[styles.languageSegmented, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {languageOptions.map(opt => {
                  const isSelected = languagePreference === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.languageOptionBtn,
                        isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                      ]}
                      onPress={() => {
                        void handleSelectLanguage(opt.id);
                      }}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          {
                            color: isSelected ? theme.primary : theme.textDim,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.35}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="volume-medium-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.soundEffects')}
                </Text>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={handleToggleSfx}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="musical-notes-outline" size={18} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.completionChime')}
                </Text>
              </View>
              <Switch
                value={chimeEnabled}
                onValueChange={handleToggleChime}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="radio-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.hapticFeedback')}
                </Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={handleToggleHaptics}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="moon-outline" size={18} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.autoDarkMode')}
                </Text>
              </View>
              <Switch
                value={autoNightShift}
                onValueChange={(enabled) => {
                  hapticSelection();
                  onToggleAutoNightShift?.(enabled);
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Daily Notifications */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('settings.sectionNotifications')}
          </Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="sunny-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.morningBriefing')}
                </Text>
              </View>
              <Switch
                value={morningBriefingEnabled}
                onValueChange={handleToggleMorning}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="moon-outline" size={18} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.eveningReview')}
                </Text>
              </View>
              <Switch
                value={eveningReviewEnabled}
                onValueChange={handleToggleEvening}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Backup & Data */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('settings.sectionData')}
          </Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => {
                hapticLight();
                setIsExportModalOpen(true);
              }}
              disabled={exportingFormat !== null}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                {exportingFormat !== null ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="share-outline" size={18} color={theme.primary} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.exportData')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.groupRow}
              onPress={handleImport}
              disabled={isImporting}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                {isImporting ? (
                  <ActivityIndicator size="small" color={theme.accent || theme.primary} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={theme.accent || theme.primary} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.restoreBackup')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => {
                hapticLight();
                setIsPrivacyOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                  {t('settings.privacyPolicy')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {onClearAllData && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={handleConfirmClearData}
                  disabled={isClearingData}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: withAlpha(theme.danger, theme.isDark ? 0.2 : 0.12) }]}>
                    {isClearingData ? (
                      <ActivityIndicator size="small" color={theme.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    )}
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.danger }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                      {t('settings.clearAllData')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* App Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTitle, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
              {t('settings.footerTitle')}
            </Text>
            <Text style={[styles.footerSub, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
              {t('settings.footerVersion')}
            </Text>
          </View>
        </BottomSheetScrollView>
      </SwipeableBottomSheet>

      <ExportDataModal
        visible={isExportModalOpen}
        theme={theme}
        exportingFormat={exportingFormat}
        onSelectFormat={handleSelectExportFormat}
        onClose={() => {
          if (exportingFormat === null) {
            setIsExportModalOpen(false);
          }
        }}
      />

      <PrivacyPolicyModal
        visible={isPrivacyOpen}
        theme={theme}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  languageBlock: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  languageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageSegmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
    marginLeft: 46,
  },
  languageOptionBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  languageOptionText: {
    fontSize: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
