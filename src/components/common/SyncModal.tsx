import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { AppToast } from '../../types';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { getSyncKey, isValidSyncKey, generateSyncKey } from '../../services/storage/syncKeyManager';
import { switchGlobalSyncKey } from '../../services/storage/taskStorage';

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

  const handleCopy = async () => {
    if (!currentKey) return;
    try {
      await Clipboard.setStringAsync(currentKey);
      hapticSuccess();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShowToast({
        type: 'info',
        title: 'Copied',
        message: 'Sync key copied to clipboard',
      });
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="cloud-outline" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>Cloud Sync</Text>
                  <View style={styles.syncStatusRow}>
                    <View style={styles.statusDotActive} />
                    <Text style={[styles.subtitle, { color: theme.textDim }]}>
                      Sync active
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Section 1: Current Device Code */}
              <View style={[styles.card, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="key-outline" size={15} color={theme.primary} />
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>
                    CURRENT DEVICE KEY
                  </Text>
                </View>

                <Text style={[styles.description, { color: theme.textDim }]}>
                  Use this key on your other devices to sync data:
                </Text>

                <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.codeText, { color: theme.primary }]}>
                    {currentKey || 'Loading...'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.copyBtn,
                      { backgroundColor: copied ? '#ECFDF5' : theme.primaryLight },
                    ]}
                    onPress={handleCopy}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={copied ? '#10B981' : theme.primary}
                    />
                    <Text
                      style={[
                        styles.copyBtnText,
                        { color: copied ? '#10B981' : theme.primary },
                      ]}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Generate New Key (Unlink) */}
                {showUnlinkConfirm ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>
                      Generate a new key? Synced devices using the current key will disconnect.
                    </Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowUnlinkConfirm(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.unlinkBtn}
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
                  >
                    <Ionicons name="sparkles-outline" size={13} color={theme.textDim} />
                    <Text style={[styles.unlinkTriggerText, { color: theme.textDim }]}>
                      Generate New Key
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Section 2: Connect to Another Device */}
              <View style={[styles.card, { backgroundColor: theme.surfaceMuted, borderColor: theme.border, marginTop: 14 }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="sync-outline" size={15} color={theme.accent || theme.primary} />
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>
                    PAIR ANOTHER DEVICE
                  </Text>
                </View>

                <Text style={[styles.description, { color: theme.textDim }]}>
                  Enter the pairing key from your other device:
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surface,
                        borderColor: errorMsg ? '#F43F5E' : theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={inputKey}
                    onChangeText={text => {
                      setInputKey(text.toUpperCase());
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. ZEN-7K9P-4X2M"
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
                    <Ionicons name="alert-circle-outline" size={14} color="#F43F5E" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}
              </View>

              {/* Security Badge */}
              <View style={[styles.securityBadge, { borderTopColor: theme.border }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#10B981" />
                <Text style={[styles.securityText, { color: theme.textDim }]}>
                  Data is securely synced across paired devices.
                </Text>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderWidth: 1,
    maxHeight: '90%',
  },
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
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  subtitle: {
    fontSize: 12,
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
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
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
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  confirmText: {
    fontSize: 11,
    color: '#BE123C',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  unlinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E11D48',
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
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  securityText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});
