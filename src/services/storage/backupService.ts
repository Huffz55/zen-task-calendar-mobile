import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { Task, CustomList, BackupPayload } from '../../types';
import {
  validateTask,
  validateCustomList,
  safeJsonParse,
  MAX_BACKUP_BYTES,
  MAX_TASKS_LIMIT,
  MAX_LISTS_LIMIT,
} from '../validation/validator';
import { generateICSContent, generateMarkdownContent } from '../../utils/zenExport';
import { getActiveLanguage, translate } from '../../i18n';

class BackupService {
  async exportICS(tasks: Task[]): Promise<boolean> {
    try {
      const icsStr = generateICSContent(tasks);
      const filename = `zen_calendar_${format(new Date(), 'yyyyMMdd_HHmmss')}.ics`;
      const file = new File(Paths.cache, filename);

      file.create({ overwrite: true });
      file.write(icsStr);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/calendar',
          dialogTitle: translate(getActiveLanguage(), 'exportModal.shareIcsTitle'),
          UTI: 'public.calendar',
        });
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.warn('Failed to export ICS', e);
      throw e;
    }
  }

  async exportMarkdown(tasks: Task[]): Promise<boolean> {
    try {
      const mdStr = generateMarkdownContent(tasks);
      const filename = `zen_tasks_obsidian_${format(new Date(), 'yyyyMMdd_HHmmss')}.md`;
      const file = new File(Paths.cache, filename);

      file.create({ overwrite: true });
      file.write(mdStr);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/markdown',
          dialogTitle: translate(getActiveLanguage(), 'exportModal.shareMdTitle'),
          UTI: 'net.daringfireball.markdown',
        });
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.warn('Failed to export Markdown', e);
      throw e;
    }
  }

  async exportBackup(tasks: Task[], lists: CustomList[]): Promise<boolean> {
    try {
      const payload: BackupPayload = {
        tasks,
        lists,
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const filename = `zen_task_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      const file = new File(Paths.cache, filename);

      file.create({ overwrite: true });
      file.write(jsonStr);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: translate(getActiveLanguage(), 'exportModal.shareBackupTitle'),
          UTI: 'public.json',
        });
        return true;
      }
      return false;
    } catch (e) {
      if (__DEV__) console.warn('Failed to export backup', e);
      throw e;
    }
  }

  async importBackup(): Promise<{ tasks: Task[]; lists: CustomList[] } | null> {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/json', 'text/json', '*/*'],
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return null;
      }

      const pickedAsset = res.assets[0];
      if (typeof pickedAsset.size === 'number' && pickedAsset.size > MAX_BACKUP_BYTES) {
        throw new Error('Backup file exceeds maximum allowed size (5 MB)');
      }

      const file = new File(pickedAsset.uri);
      const rawText = await file.text();
      if (rawText.length > MAX_BACKUP_BYTES) {
        throw new Error('Backup content exceeds maximum allowed size (5 MB)');
      }

      const parsed = safeJsonParse<unknown>(rawText, MAX_BACKUP_BYTES);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format');
      }

      const validTasks: Task[] = [];
      const validLists: CustomList[] = [];

      if (Array.isArray(parsed)) {
        for (const t of parsed.slice(0, MAX_TASKS_LIMIT)) {
          const validated = validateTask(t);
          if (validated) validTasks.push(validated);
        }
      } else {
        const candidate = parsed as Record<string, unknown>;
        const rawTasks = Array.isArray(candidate.tasks) ? candidate.tasks.slice(0, MAX_TASKS_LIMIT) : [];
        const rawLists = Array.isArray(candidate.lists) ? candidate.lists.slice(0, MAX_LISTS_LIMIT) : [];

        for (const t of rawTasks) {
          const validated = validateTask(t);
          if (validated) validTasks.push(validated);
        }

        for (const l of rawLists) {
          const validated = validateCustomList(l);
          if (validated) validLists.push(validated);
        }
      }

      return {
        tasks: validTasks,
        lists: validLists,
      };
    } catch (e) {
      if (__DEV__) console.warn('Failed to import backup', e);
      throw e;
    }
  }
}

export const defaultBackupService = new BackupService();
