import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { Task, CustomList, BackupPayload } from '../../types';
import { validateTask, validateCustomList } from '../validation/validator';

export class BackupService {
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

      file.create();
      file.write(jsonStr);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Zen Plan Backup File',
          UTI: 'public.json',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to export backup', e);
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
      const file = new File(pickedAsset.uri);
      const rawText = await file.text();
      const parsed: unknown = JSON.parse(rawText);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format');
      }

      const candidate = parsed as Record<string, unknown>;
      const rawTasks = Array.isArray(candidate.tasks) ? candidate.tasks : [];
      const rawLists = Array.isArray(candidate.lists) ? candidate.lists : [];

      const validTasks: Task[] = [];
      for (const t of rawTasks) {
        const validated = validateTask(t);
        if (validated) validTasks.push(validated);
      }

      const validLists: CustomList[] = [];
      for (const l of rawLists) {
        const validated = validateCustomList(l);
        if (validated) validLists.push(validated);
      }

      return {
        tasks: validTasks,
        lists: validLists,
      };
    } catch (e) {
      console.warn('Failed to import backup', e);
      throw e;
    }
  }
}

export const defaultBackupService = new BackupService();
