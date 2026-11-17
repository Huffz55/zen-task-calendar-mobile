import React, { useState } from 'react';
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
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { SwipeableBottomSheet } from '../common/SwipeableBottomSheet';

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
  const [title, setTitle] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(defaultFolder || undefined);
  const [customFolder, setCustomFolder] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSelectedFolder(defaultFolder || undefined);
      setIsAddingFolder(false);
      setCustomFolder('');
    }
  }

  const handleSave = () => {
    if (!title.trim()) return;
    hapticSuccess();
    const chosenFolder = isAddingFolder && customFolder.trim() ? customFolder.trim() : selectedFolder;
    onAddList(title.trim(), chosenFolder);
    setTitle('');
    setCustomFolder('');
    setIsAddingFolder(false);
    onClose();
  };

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="80%" useKeyboardAvoiding>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>New List</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceMuted,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder="List title"
        placeholderTextColor={theme.textDim}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <Text style={[styles.folderLabel, { color: theme.textDim }]}>FOLDER</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
            hapticLight();
            setIsAddingFolder(false);
            setSelectedFolder(undefined);
          }}
        >
          <Text
            style={[
              styles.folderChipText,
              { color: !selectedFolder && !isAddingFolder ? '#ffffff' : theme.textMuted },
            ]}
          >
            None
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
                hapticLight();
                setIsAddingFolder(false);
                setSelectedFolder(f);
              }}
            >
              <Ionicons
                name="folder-outline"
                size={13}
                color={isSelected ? '#ffffff' : theme.textMuted}
              />
              <Text
                style={[
                  styles.folderChipText,
                  { color: isSelected ? '#ffffff' : theme.textMuted },
                ]}
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
            setIsAddingFolder(prev => !prev);
          }}
        >
          <Ionicons name="add" size={14} color={theme.primary} />
          <Text style={[styles.folderChipText, { color: theme.primary }]}>Custom</Text>
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
          placeholder="Folder name"
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
        <Text style={[styles.submitText, { color: title.trim() ? '#ffffff' : theme.textDim }]}>
          Create List
        </Text>
      </TouchableOpacity>
    </SwipeableBottomSheet>
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
  closeBtn: {
    padding: 6,
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
