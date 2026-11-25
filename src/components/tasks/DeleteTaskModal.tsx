import { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { DailyTask } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTranslation } from '../../i18n';
import { ModalPortal } from '../common/ModalPortal';

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

const OPEN_ANIM_MS = 240;
const CLOSE_ANIM_MS = 220;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);

export function DeleteTaskModal(props: DeleteTaskModalProps) {
  if (!props.visible || !props.task) return null;
  return (
    <DeleteTaskContent
      task={props.task}
      selectedDateStr={props.selectedDateStr}
      theme={props.theme}
      onClose={props.onClose}
      onDeleteSingle={props.onDeleteSingle}
      onDeleteInstance={props.onDeleteInstance}
      onDeleteFuture={props.onDeleteFuture}
    />
  );
}

function DeleteTaskContent({
  task,
  selectedDateStr,
  theme,
  onClose,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
}: Omit<DeleteTaskModalProps, 'visible' | 'task'> & { task: DailyTask }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const isClosingSV = useSharedValue(false);
  const reducedMotionSV = useSharedValue(reducedMotion);

  const actionLockRef = useRef(false);
  const isClosingJSRef = useRef(false);
  const hasCompletedCloseRef = useRef(false);
  const pendingAfterCloseRef = useRef<(() => void) | undefined>(undefined);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    reducedMotionSV.set(reducedMotion);
  }, [reducedMotion, reducedMotionSV]);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(1);
      return;
    }

    progress.set(
      withTiming(1, {
        duration: OPEN_ANIM_MS,
        easing: OPEN_EASING,
      })
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reducedMotion]);

  const finishCloseOnJS = useCallback(() => {
    if (hasCompletedCloseRef.current) return;
    hasCompletedCloseRef.current = true;
    const afterClose = pendingAfterCloseRef.current;
    pendingAfterCloseRef.current = undefined;
    afterClose?.();
    onCloseRef.current();
  }, []);

  const dismissAnimated = useCallback(
    (afterClose?: () => void) => {
      if (isClosingJSRef.current) return;
      isClosingJSRef.current = true;
      pendingAfterCloseRef.current = afterClose;

      scheduleOnUI(() => {
        'worklet';
        if (isClosingSV.get()) return;
        isClosingSV.set(true);
        cancelAnimation(progress);

        if (reducedMotionSV.get()) {
          progress.set(0);
          scheduleOnRN(finishCloseOnJS);
          return;
        }

        progress.set(
          withTiming(
            0,
            {
              duration: CLOSE_ANIM_MS,
              easing: CLOSE_EASING,
            },
            finished => {
              'worklet';
              if (finished) {
                scheduleOnRN(finishCloseOnJS);
              }
            }
          )
        );
      });
    },
    [finishCloseOnJS, isClosingSV, progress, reducedMotionSV]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  const dialogAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p,
      transform: [
        { translateY: (1 - p) * 10 },
        { scale: 0.95 + 0.05 * p },
      ],
    };
  });

  const runDeleteAction = (action: () => void) => {
    if (actionLockRef.current || isClosingJSRef.current) return;
    actionLockRef.current = true;
    hapticWarning();
    dismissAnimated(action);
  };

  const isRecurring = task.recurrence !== 'none';
  const dangerBg = withAlpha(theme.danger, theme.isDark ? 0.18 : 0.1);

  return (
    <ModalPortal
      visible
      onRequestClose={() => dismissAnimated()}
      isClosingRef={isClosingJSRef}
    >
      <View style={styles.overlay}>
        <Animated.View
          collapsable={false}
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => dismissAnimated()}
            accessible={false}
          />
        </Animated.View>

        <Animated.View
          collapsable={false}
          style={[
            styles.dialog,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            dialogAnimatedStyle,
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
    </ModalPortal>
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
