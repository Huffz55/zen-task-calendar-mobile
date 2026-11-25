import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, hapticSuccess } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';
import { CloseButton } from '../common/CloseButton';
import { BottomSheetScrollView, SwipeableBottomSheet, useBottomSheetClose } from '../common/SwipeableBottomSheet';
import { useTranslation } from '../../i18n';

interface AddListModalProps {
  visible: boolean;
  theme: ThemeColors;
  folders: string[];
  defaultFolder?: string | null;
  onClose: () => void;
  onAddList: (title: string, folder?: string) => void;
}

export function AddListModal({
  visible,
  theme,
  folders,
  defaultFolder,
  onClose,
  onAddList,
}: AddListModalProps) {
  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="80%" useKeyboardAvoiding>
      {visible && (
        <AddListForm
          key={defaultFolder ?? '__none__'}
          theme={theme}
          folders={folders}
          defaultFolder={defaultFolder}
          onClose={onClose}
          onAddList={onAddList}
        />
      )}
    </SwipeableBottomSheet>
  );
}

function AddListForm({
  theme,
  folders,
  defaultFolder,
  onClose,
  onAddList,
}: Omit<AddListModalProps, 'visible'>) {
  const { t } = useTranslation();
  const sheetClose = useBottomSheetClose();
  const [title, setTitle] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(defaultFolder || undefined);
  const [customFolder, setCustomFolder] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSave = () => {
    if (isSubmittingRef.current || !title.trim()) return;
    isSubmittingRef.current = true;
    hapticSuccess();
    const chosenFolder = isAddingFolder && customFolder.trim() ? customFolder.trim() : selectedFolder;
    onAddList(title.trim(), chosenFolder);
    (sheetClose ?? onClose)();
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('lists.addListTitle')}</Text>
        <CloseButton theme={theme} accessibilityLabel={t('lists.a11yCloseNewList')} />
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surfaceMuted,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('lists.listTitlePlaceholder')}
          placeholderTextColor={theme.textDim}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <Text style={[styles.folderLabel, { color: theme.textDim }]}>{t('lists.folderLabel')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.foldersRow}
        >
          <TouchableOpacity
            style={[
              styles.folderChip,
              {
                backgroundColor: !selectedFolder && !isAddingFolder ? theme.primary : theme.surfaceMuted,
                borderColor: !selectedFolder && !isAddingFolder ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              hapticSelection();
              setIsAddingFolder(false);
              setSelectedFolder(undefined);
            }}
          >
            <Text
              style={[
                styles.folderChipText,
                { color: !selectedFolder && !isAddingFolder ? theme.onPrimary : theme.textMuted },
              ]}
            >
              {t('common.none')}
            </Text>
          </TouchableOpacity>

          {folders.map(f => {
            const isSelected = !isAddingFolder && selectedFolder === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.folderChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  hapticSelection();
                  setIsAddingFolder(false);
                  setSelectedFolder(f);
                }}
              >
                <Ionicons
                  name="folder-outline"
                  size={13}
                  color={isSelected ? theme.onPrimary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.folderChipText,
                    { color: isSelected ? theme.onPrimary : theme.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.folderChip,
              {
                backgroundColor: isAddingFolder ? theme.primaryLight : theme.surfaceMuted,
                borderColor: isAddingFolder ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              hapticLight();
              animateLayout();
              setIsAddingFolder(prev => !prev);
            }}
          >
            <Ionicons name="add" size={14} color={theme.primary} />
            <Text style={[styles.folderChipText, { color: theme.primary }]}>{t('lists.customFolder')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {isAddingFolder && (
          <TextInput
            style={[
              styles.customFolderInput,
              {
                backgroundColor: theme.surfaceMuted,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('lists.folderNamePlaceholder')}
            placeholderTextColor={theme.textDim}
            value={customFolder}
            onChangeText={setCustomFolder}
            maxLength={32}
          />
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: title.trim() ? theme.primary : theme.surfaceMuted,
              opacity: title.trim() ? 1 : 0.6,
            },
          ]}
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={[styles.submitText, { color: title.trim() ? theme.onPrimary : theme.textDim }]}>
            {t('lists.createList')}
          </Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    fontSize: 15,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  folderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  foldersRow: {
    gap: 8,
    paddingBottom: 14,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customFolderInput: {
    fontSize: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
