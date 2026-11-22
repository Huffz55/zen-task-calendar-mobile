import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';
import { useTranslation } from '../../i18n';

interface PrivacyPolicyModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, theme, onClose }: PrivacyPolicyModalProps) {
  const { t } = useTranslation();

  const sections = [
    {
      icon: 'phone-portrait-outline' as const,
      title: t('privacy.localTitle'),
      body: t('privacy.localBody'),
    },
    {
      icon: 'cloud-outline' as const,
      title: t('privacy.syncTitle'),
      body: t('privacy.syncBody'),
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: t('privacy.trackingTitle'),
      body: t('privacy.trackingBody'),
    },
    {
      icon: 'trash-outline' as const,
      title: t('privacy.exportTitle'),
      body: t('privacy.exportBody'),
    },
    {
      icon: 'mail-outline' as const,
      title: t('privacy.contactTitle'),
      body: t('privacy.contactBody'),
    },
  ];

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="82%">
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {t('privacy.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1}>
            {t('privacy.subtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('privacy.a11yClose')}
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((sec) => (
          <View
            key={sec.title}
            style={[
              styles.card,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name={sec.icon} size={16} color={theme.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                {sec.title}
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textDim }]}>{sec.body}</Text>
          </View>
        ))}
      </BottomSheetScrollView>

      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: theme.primary }]}
        onPress={() => {
          hapticLight();
          onClose();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.doneBtnText}>{t('common.close')}</Text>
      </TouchableOpacity>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 8,
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
    padding: 6,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
