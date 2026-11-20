import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';
import { useTranslation } from '../../i18n';

export default function ListDetailRoute() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 6;
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    theme,
    lists,
    addListItem,
    deleteListItem,
    toggleListItem,
    handleDeleteList,
  } = useApp();

  const [newItemText, setNewItemText] = useState('');

  const list = lists.find(l => l.id === id);

  if (!list) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>{t('lists.detailNotFound')}</Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.primaryLight }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backBtnText, { color: theme.primary }]}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const completedCount = list.items.filter(i => i.completed).length;
  const totalCount = list.items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    hapticSuccess();
    animateLayout();
    addListItem(list.id, newItemText.trim());
    setNewItemText('');
  };

  const safeBottomPadding = Math.max(insets.bottom, 20) + 28;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: safeTopPadding }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.surfaceMuted }]}
          onPress={() => {
            hapticLight();
            router.back();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('lists.a11yGoBack')}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {list.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textDim }]} numberOfLines={1}>
            {t('lists.detailProgress', { completed: completedCount, total: totalCount })}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.surfaceMuted }]}
          onPress={() => {
            hapticWarning();
            handleDeleteList(list.id);
            router.back();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('lists.a11yDeleteList')}
        >
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceMuted }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: theme.primary, width: `${progressPercent}%` },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding }]}
      >
        {/* Quick Add Item Bar */}
        <View style={[styles.addBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t('lists.detailAddPlaceholder')}
            placeholderTextColor={theme.textDim}
            value={newItemText}
            onChangeText={setNewItemText}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
          />
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: newItemText.trim() ? theme.primary : theme.surfaceMuted,
                opacity: newItemText.trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleAddItem}
            disabled={!newItemText.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('lists.a11yAddListItem')}
          >
            <Ionicons name="add" size={20} color={newItemText.trim() ? '#ffffff' : theme.textDim} />
          </TouchableOpacity>
        </View>

        {/* List Items */}
        {list.items.map(item => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: item.completed ? 0.72 : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.checkbox,
                {
                  borderColor: item.completed ? theme.primary : theme.textDim,
                  backgroundColor: item.completed ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => {
                hapticLight();
                animateLayout();
                toggleListItem(list.id, item.id);
              }}
              hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              accessibilityLabel={item.text}
            >
              {item.completed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
            </TouchableOpacity>

            <Text
              style={[
                styles.itemText,
                {
                  color: item.completed ? theme.textDim : theme.text,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {item.text}
            </Text>

            <TouchableOpacity
              onPress={() => {
                hapticWarning();
                animateLayout();
                deleteListItem(list.id, item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('lists.a11yRemoveListItem', { item: item.text })}
            >
              <Ionicons name="close" size={16} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        ))}

        {list.items.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              {t('lists.detailEmpty')}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  progressBarBg: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 13,
  },
});
