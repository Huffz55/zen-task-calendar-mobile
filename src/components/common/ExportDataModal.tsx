import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';
import { useTranslation } from '../../i18n';

export type ExportFormat = 'json' | 'ics' | 'md';

interface ExportDataModalProps {
  visible: boolean;
  theme: ThemeColors;
  exportingFormat: ExportFormat | null;
  onSelectFormat: (format: ExportFormat) => Promise<void>;
  onClose: () => void;
}

interface ExportOptionConfig {
  id: ExportFormat;
  title: string;
  description: string;
  badgeLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function ExportDataModal({
  visible,
  theme,
  exportingFormat,
  onSelectFormat,
  onClose,
}: ExportDataModalProps) {
  const { t } = useTranslation();
  const isBusy = exportingFormat !== null;

  const exportOptions: ExportOptionConfig[] = [
    {
      id: 'json',
      title: t('exportModal.jsonTitle'),
      description: t('exportModal.jsonDesc'),
      badgeLabel: t('exportModal.jsonBadge'),
      icon: 'archive-outline',
    },
    {
      id: 'ics',
      title: t('exportModal.icsTitle'),
      description: t('exportModal.icsDesc'),
      icon: 'calendar-outline',
    },
    {
      id: 'md',
      title: t('exportModal.mdTitle'),
      description: t('exportModal.mdDesc'),
      icon: 'document-text-outline',
    },
  ];

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="80%">
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
            {t('exportModal.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
            {t('exportModal.subtitle')}
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
          accessibilityLabel={t('exportModal.a11yClose')}
          disabled={isBusy}
        >
          <Ionicons name="close" size={18} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.groupedList,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
            },
          ]}
        >
          {exportOptions.map((option, index) => {
            const isExportingThis = exportingFormat === option.id;
            const isHighlighted = Boolean(option.badgeLabel);
            const showDivider = index < exportOptions.length - 1;

            return (
              <React.Fragment key={option.id}>
                <TouchableOpacity
                  style={[
                    styles.row,
                    { opacity: isBusy && !isExportingThis ? 0.5 : 1 },
                  ]}
                  onPress={() => {
                    hapticLight();
                    void onSelectFormat(option.id);
                  }}
                  disabled={isBusy}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={
                    option.badgeLabel
                      ? `${option.title}, ${option.badgeLabel}`
                      : option.title
                  }
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isHighlighted
                          ? theme.primaryLight
                          : withAlpha(theme.textDim, theme.isDark ? 0.14 : 0.08),
                      },
                    ]}
                  >
                    {isExportingThis ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={isHighlighted ? theme.primary : theme.textMuted}
                      />
                    )}
                  </View>

                  <View style={styles.rowBody}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.rowTitle, { color: theme.text }]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.35}
                      >
                        {option.title}
                      </Text>
                      {option.badgeLabel && (
                        <View style={[styles.badgePill, { backgroundColor: theme.primaryLight }]}>
                          <Text
                            style={[styles.badgeText, { color: theme.primary }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.35}
                          >
                            {option.badgeLabel}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[styles.rowDescription, { color: theme.textDim }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.35}
                    >
                      {option.description}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                </TouchableOpacity>

                {showDivider && (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 10,
  },
  groupedList: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
});
