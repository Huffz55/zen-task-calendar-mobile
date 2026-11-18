import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { AppToast } from '../../types';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { getSyncKey, isValidSyncKey, generateSyncKey } from '../../services/storage/syncKeyManager';
import { switchGlobalSyncKey } from '../../services/storage/taskStorage';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';

interface SyncModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onShowToast: (toast: AppToast) => void;
}

export function SyncModal({ visible, theme, onClose, onShowToast }: SyncModalProps) {
  const [currentKey, setCurrentKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    getSyncKey().then(k => {
      if (isMounted) {
        setCurrentKey(k);
        setInputKey('');
        setErrorMsg('');
        setCopied(false);
        setShowUnlinkConfirm(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const scheduleResetCopied = () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    if (!currentKey) return;
    try {
      await Clipboard.setStringAsync(currentKey);
      hapticSuccess();
      setCopied(true);
      scheduleResetCopied();
      onShowToast({
        type: 'info',
        title: 'Copied',
        message: 'Sync key copied to clipboard',
      });
    } catch {
      setCopied(true);
      scheduleResetCopied();
    }
  };

  const handleGenerateNewKey = async () => {
    const newKey = generateSyncKey();
    hapticSuccess();
    try {
      const success = await switchGlobalSyncKey(newKey);
      if (success) {
        setCurrentKey(newKey);
        setShowUnlinkConfirm(false);
        onShowToast({
          type: 'success',
          title: 'New Key Active',
          message: `Connected to ${newKey}`,
        });
      } else {
        hapticWarning();
        setErrorMsg('Failed to generate key.');
      }
    } catch {
      hapticWarning();
      setErrorMsg('Failed to unlink.');
    }
  };

  const handleConnect = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    const cleaned = inputKey.trim().toUpperCase();

    if (!cleaned) {
      hapticWarning();
      setErrorMsg('Please enter a sync key.');
      return;
    }

    if (cleaned === currentKey) {
      hapticWarning();
      setErrorMsg('This key is already active.');
      return;
    }

    if (!isValidSyncKey(cleaned)) {
      hapticWarning();
      setErrorMsg('Invalid format. Use ZEN-XXXX-XXXX.');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await switchGlobalSyncKey(cleaned);
      if (success) {
        hapticSuccess();
        setCurrentKey(cleaned);
        onShowToast({
          type: 'success',
          title: 'Devices Synced',
          message: `Connected to ${cleaned}`,
        });
        onClose();
      } else {
        hapticWarning();
        setErrorMsg('Connection failed. Please check the key.');
      }
    } catch {
      hapticWarning();
      setErrorMsg('Could not connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="90%" useKeyboardAvoiding>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="cloud-outline" size={22} color={theme.primary} />
          </View>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Cloud Sync</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={styles.closeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close cloud sync"
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* Section 1: Device Key */}
        <View style={[styles.card, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="key-outline" size={15} color={theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              DEVICE KEY
            </Text>
          </View>

          <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.codeText, { color: theme.primary }]} numberOfLines={1} ellipsizeMode="middle">
              {currentKey || 'Loading...'}
            </Text>
            <TouchableOpacity
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copied
                    ? withAlpha(theme.success, theme.isDark ? 0.2 : 0.14)
                    : theme.primaryLight,
                },
              ]}
              onPress={handleCopy}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={15}
                color={copied ? theme.success : theme.primary}
              />
              <Text
                style={[
                  styles.copyBtnText,
                  { color: copied ? theme.success : theme.primary },
                ]}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Generate New Key */}
          {showUnlinkConfirm ? (
            <View
              style={[
                styles.confirmBox,
                {
                  backgroundColor: withAlpha(theme.danger, theme.isDark ? 0.16 : 0.09),
                  borderColor: withAlpha(theme.danger, 0.35),
                },
              ]}
            >
              <Text style={[styles.confirmText, { color: theme.danger }]}>
                Generate a new key? Current paired devices will disconnect.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    hapticLight();
                    setShowUnlinkConfirm(false);
                  }}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unlinkBtn, { backgroundColor: theme.danger }]}
                  onPress={handleGenerateNewKey}
                >
                  <Text style={styles.unlinkBtnText}>New Key</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.unlinkTrigger}
              onPress={() => {
                hapticLight();
                setShowUnlinkConfirm(true);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="refresh-outline" size={13} color={theme.textDim} />
              <Text style={[styles.unlinkTriggerText, { color: theme.textDim }]}>
                Generate New Key
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section 2: Pair Another Device */}
        <View style={[styles.card, { backgroundColor: theme.surfaceMuted, borderColor: theme.border, marginTop: 14 }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sync-outline" size={15} color={theme.accent || theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              PAIR ANOTHER DEVICE
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: errorMsg ? theme.danger : theme.border,
                  color: theme.text,
                },
              ]}
              value={inputKey}
              onChangeText={text => {
                setInputKey(text.toUpperCase());
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="ZEN-XXXX-XXXX"
              placeholderTextColor={theme.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={13}
            />
            <TouchableOpacity
              style={[
                styles.connectBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: isConnecting || !inputKey.trim() ? 0.6 : 1,
                },
              ]}
              onPress={handleConnect}
              disabled={isConnecting || !inputKey.trim()}
              activeOpacity={0.8}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.connectBtnText}>Connect</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}
        </View>
      </BottomSheetScrollView>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  codeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unlinkTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingVertical: 4,
  },
  unlinkTriggerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  confirmBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 15,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unlinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unlinkBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  connectBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});
