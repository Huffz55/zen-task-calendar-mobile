import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { en, getActiveLanguage, tr, translate, type AppLanguage } from '../../i18n';

interface INotificationService {
  readonly isSupported: boolean;
  requestPermissions(): Promise<boolean>;
  scheduleDailySummary(hour?: number, minute?: number, taskCount?: number, language?: AppLanguage): Promise<string | null>;
  scheduleEveningWindDown(hour?: number, minute?: number, pendingCount?: number, language?: AppLanguage): Promise<string | null>;
  scheduleFocusTimerEnd(seconds: number, sessionTitle?: string, language?: AppLanguage): Promise<string | null>;
  cancelMorningBriefing(): Promise<void>;
  cancelEveningReview(): Promise<void>;
  cancelNotification(identifier: string): Promise<void>;
  cancelAll(): Promise<void>;
}

// Detect if running inside Android Expo Go (Expo SDK 53+ removed remote push module from Expo Go Android, throwing on import)
const isExpoGo = isRunningInExpoGo() || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

let Notifications: typeof import('expo-notifications') | null = null;
let SchedulableTriggerInputTypes: typeof import('expo-notifications').SchedulableTriggerInputTypes | null = null;

if (!isAndroidExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications');
    Notifications = mod;
    SchedulableTriggerInputTypes = mod.SchedulableTriggerInputTypes;

    // Set global notification foreground presentation handler
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications?.AndroidNotificationPriority?.HIGH,
      }),
    });
  } catch (err) {
    console.warn('[NotificationService] Could not initialize expo-notifications:', err);
  }
}

class MobileNotificationService implements INotificationService {
  private hasInitializedChannels = false;

  get isSupported(): boolean {
    return !isAndroidExpoGo && Notifications !== null;
  }

  private async initializeChannels() {
    if (!this.isSupported || this.hasInitializedChannels || Platform.OS !== 'android' || !Notifications) return;

    try {
      const lang = getActiveLanguage();
      await Notifications.setNotificationChannelAsync('zen-general', {
        name: translate(lang, 'notifications.channelGeneralName'),
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fb7185',
      });

      await Notifications.setNotificationChannelAsync('zen-focus', {
        name: translate(lang, 'notifications.channelFocusName'),
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 350, 200, 350],
        lightColor: '#f43f5e',
      });

      this.hasInitializedChannels = true;
    } catch (e) {
      console.warn('Failed to configure Android notification channels', e);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isSupported || !Notifications) return false;

    try {
      await this.initializeChannels();
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;

      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      return requested.granted;
    } catch (e) {
      console.warn('Failed to request notification permissions', e);
      return false;
    }
  }

  async scheduleDailySummary(
    hour = 9,
    minute = 0,
    taskCount = 0,
    language?: AppLanguage
  ): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelMorningBriefing();

      const lang = language ?? getActiveLanguage();
      const bodyText =
        taskCount > 0
          ? translate(
              lang,
              taskCount === 1 ? 'notifications.morningBodyOne' : 'notifications.morningBodyOther',
              { count: taskCount }
            )
          : translate(lang, 'notifications.morningBodyEmpty');

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'daily-summary',
        content: {
          title: translate(lang, 'notifications.morningTitle'),
          body: bodyText,
          sound: true,
          data: { type: 'daily-summary' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          channelId: 'zen-general',
          hour,
          minute,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule daily summary notification', e);
      return null;
    }
  }

  async scheduleEveningWindDown(
    hour = 20,
    minute = 30,
    pendingCount = 0,
    language?: AppLanguage
  ): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelEveningReview();

      const lang = language ?? getActiveLanguage();
      const bodyText =
        pendingCount > 0
          ? translate(
              lang,
              pendingCount === 1 ? 'notifications.eveningBodyOne' : 'notifications.eveningBodyOther',
              { count: pendingCount }
            )
          : translate(lang, 'notifications.eveningBodyEmpty');

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'evening-winddown',
        content: {
          title: translate(lang, 'notifications.eveningTitle'),
          body: bodyText,
          sound: true,
          data: { type: 'evening-winddown' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          channelId: 'zen-general',
          hour,
          minute,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule evening wind-down notification', e);
      return null;
    }
  }

  async scheduleFocusTimerEnd(
    seconds: number,
    sessionTitle?: string,
    language?: AppLanguage
  ): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelNotification('zen-timer-end');

      const safeSeconds = Math.max(1, Math.round(seconds));
      const lang = language ?? getActiveLanguage();
      const resolvedTitle = sessionTitle ?? translate(lang, 'notifications.defaultFocusSession');

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'zen-timer-end',
        content: {
          title: translate(lang, 'notifications.focusCompleteTitle'),
          body: translate(lang, 'notifications.focusCompleteBody', { sessionTitle: resolvedTitle }),
          sound: true,
          data: { type: 'focus-timer-complete' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          channelId: 'zen-focus',
          seconds: safeSeconds,
          repeats: false,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule focus timer notification', e);
      return null;
    }
  }

  private async cancelByIdentifierAndType(
    identifier: string,
    dataType: string,
    legacyTitles: string[]
  ): Promise<void> {
    if (!this.isSupported || !Notifications) return;

    await this.cancelNotification(identifier);

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync?.();
      if (!Array.isArray(scheduled)) return;

      for (const item of scheduled) {
        const itemDataType =
          item?.content?.data && typeof item.content.data === 'object'
            ? (item.content.data as Record<string, unknown>).type
            : undefined;
        const itemTitle = typeof item?.content?.title === 'string' ? item.content.title : '';
        const matches =
          item?.identifier === identifier ||
          itemDataType === dataType ||
          legacyTitles.includes(itemTitle);

        if (matches && typeof item?.identifier === 'string') {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          } catch {
            // Ignore individual cancellation failure
          }
        }
      }
    } catch {
      // Ignore if enumerating scheduled notifications is unavailable
    }
  }

  async cancelMorningBriefing(): Promise<void> {
    await this.cancelByIdentifierAndType('daily-summary', 'daily-summary', [
      en.notifications.morningTitle,
      tr.notifications.morningTitle,
    ]);
  }

  async cancelEveningReview(): Promise<void> {
    await this.cancelByIdentifierAndType('evening-winddown', 'evening-winddown', [
      en.notifications.eveningTitle,
      tr.notifications.eveningTitle,
    ]);
  }

  async cancelNotification(identifier: string): Promise<void> {
    if (!this.isSupported || !Notifications) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Ignore if not scheduled
    }
  }

  async cancelAll(): Promise<void> {
    if (!this.isSupported || !Notifications) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel all notifications', e);
    }
  }
}

export const defaultNotificationService = new MobileNotificationService();
