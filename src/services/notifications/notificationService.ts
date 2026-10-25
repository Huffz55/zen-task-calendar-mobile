import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface INotificationService {
  readonly isSupported: boolean;
  requestPermissions(): Promise<boolean>;
  scheduleDailySummary(hour?: number, minute?: number, taskCount?: number): Promise<string | null>;
  scheduleEveningWindDown(hour?: number, minute?: number, pendingCount?: number): Promise<string | null>;
  scheduleFocusTimerEnd(seconds: number, sessionTitle?: string): Promise<string | null>;
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

export class MobileNotificationService implements INotificationService {
  private hasInitializedChannels = false;

  get isSupported(): boolean {
    return !isAndroidExpoGo && Notifications !== null;
  }

  private async initializeChannels() {
    if (!this.isSupported || this.hasInitializedChannels || Platform.OS !== 'android' || !Notifications) return;

    try {
      await Notifications.setNotificationChannelAsync('zen-general', {
        name: 'Zen Task Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fb7185',
      });

      await Notifications.setNotificationChannelAsync('zen-focus', {
        name: 'Zen Focus Session',
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

  async scheduleDailySummary(hour = 9, minute = 0, taskCount = 0): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelNotification('daily-summary');

      const bodyText =
        taskCount > 0
          ? `You have ${taskCount} task${taskCount > 1 ? 's' : ''} scheduled for today. Have a peaceful and productive day 🌸`
          : 'A wonderful day to refresh your mind and embrace new goals 🌸';

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'daily-summary',
        content: {
          title: 'Daily Zen Plan 🌸',
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

  async scheduleEveningWindDown(hour = 20, minute = 30, pendingCount = 0): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelNotification('evening-winddown');

      const bodyText =
        pendingCount > 0
          ? `Ready to wind down? 🌸 You have ${pendingCount} task${pendingCount > 1 ? 's' : ''} left today. Complete ${pendingCount > 1 ? 'them' : 'it'} or gently roll over to tomorrow.`
          : 'Mindful day complete ✨ Take a deep breath, unwind, and rest well tonight 🌸';

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'evening-winddown',
        content: {
          title: 'Evening Wind-Down 🌙',
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

  async scheduleFocusTimerEnd(seconds: number, sessionTitle = 'Focus Session'): Promise<string | null> {
    if (!this.isSupported || !Notifications || !SchedulableTriggerInputTypes) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelNotification('zen-timer-end');

      const safeSeconds = Math.max(1, Math.round(seconds));

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'zen-timer-end',
        content: {
          title: 'Zen Focus Session Completed 🧘🌸',
          body: `${sessionTitle} has ended. Take a mindful break to rest your mind.`,
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
