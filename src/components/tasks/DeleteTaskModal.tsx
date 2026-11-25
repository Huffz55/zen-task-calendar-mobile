import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DailyTask } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTranslation } from '../../i18n';

interface DeleteTaskModalProps {
  visible: boolean;
  task: DailyTask | null;
  selectedDateStr: string;
  theme: ThemeColors;
  onClose: () => void;
  onDeleteSingle: (taskId: string) => void;
  onDeleteInstance: (taskId: string, dateStr: string) => void;
  onDeleteFuture: (taskId: string, dateStr: string) => void;
}

const OPEN_ANIM_MS = 280;
const CLOSE_ANIM_MS = 260;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);

export function DeleteTaskModal({
  visible,
  task,
  selectedDateStr,
  theme,
  onClose,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
}: DeleteTaskModalProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const isOpen = visible && task !== null;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const actionLockRef = useRef(false);
  const isClosingRef = useRef(false);
  const wasOpenRef = useRef(false);
  const openRafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const cancelOpenRaf = useCallback(() => {
    if (openRafRef.current !== null) {
      cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }
  }, []);

  const dismissAnimated = useCallback(
    (afterClose?: () => void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();

      const finish = () => {
        afterClose?.();
        onCloseRef.current();
      };

      if (reducedMotion) {
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.95);
        finish();
        return;
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: CLOSE_ANIM_MS,
          easing: CLOSE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: CLOSE_ANIM_MS,
          easing: CLOSE_EASING,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isClosingRef.current) {
          finish();
        }
      });
    },
    [cancelOpenRaf, fadeAnim, reducedMotion, scaleAnim]
  );

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      isClosingRef.current = false;
      actionLockRef.current = false;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();

      if (reducedMotion) {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        return;
      }

      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      openRafRef.current = requestAnimationFrame(() => {
        openRafRef.current = null;
        if (isClosingRef.current) return;
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: OPEN_ANIM_MS,
            easing: OPEN_EASING,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: OPEN_ANIM_MS,
            easing: OPEN_EASING,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      isClosingRef.current = false;
      actionLockRef.current = false;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    }
  }, [cancelOpenRaf, fadeAnim, isOpen, reducedMotion, scaleAnim]);

  useEffect(() => {
    return () => {
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [cancelOpenRaf, fadeAnim, scaleAnim]);

  if (!isOpen || !task) return null;

  const runDeleteAction = (action: () => void) => {
    if (actionLockRef.current || isClosingRef.current) return;
    actionLockRef.current = true;
    hapticWarning();
    dismissAnimated(action);
  };

  const isRecurring = task.recurrence !== 'none';
  const dangerBg = withAlpha(theme.danger, theme.isDark ? 0.18 : 0.1);

  return (
    <Modal
      visible={isOpen}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => dismissAnimated()}
    >
      <View style={styles.overlay}>
        <Animated.View
          collapsable={false}
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissAnimated()} />
        </Animated.View>

        <Animated.View
          renderToHardwareTextureAndroid
          collapsable={false}
          style={[
            styles.dialog,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {isRecurring ? t('tasks.deleteRecurringTitle') : t('tasks.deleteTitle')}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textDim }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t('tasks.deletePrompt', { title: task.title })}
          </Text>

          <View style={styles.optionsCol}>
            {isRecurring ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
                  onPress={() => runDeleteAction(() => onDeleteInstance(task.taskId, selectedDateStr))}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: theme.text }]}>{t('tasks.deleteInstance')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
                  onPress={() => runDeleteAction(() => onDeleteFuture(task.taskId, selectedDateStr))}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: theme.text }]}>{t('tasks.deleteFuture')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: dangerBg }]}
                  onPress={() => runDeleteAction(() => onDeleteSingle(task.taskId))}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: theme.danger }]}>{t('tasks.deleteSeries')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: dangerBg }]}
                onPress={() => runDeleteAction(() => onDeleteSingle(task.taskId))}
                accessibilityRole="button"
              >
                <Text style={[styles.btnText, { color: theme.danger }]}>{t('tasks.deleteSingleButton')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={() => {
                hapticLight();
                dismissAnimated();
              }}
            >
              <Text style={[styles.cancelText, { color: theme.textDim }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  optionsCol: {
    gap: 10,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
