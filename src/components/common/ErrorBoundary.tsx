import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActiveLanguage, translate } from '../../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary preventing unhandled JS exceptions from crashing
 * the application during normal usage or automated store pre-launch checks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]:', error.message);
    }
  }

  handleRecover = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const lang = getActiveLanguage();
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#f43f5e" />
          </View>
          <Text style={styles.title}>{translate(lang, 'errors.boundaryTitle')}</Text>
          <Text style={styles.body}>
            {translate(lang, 'errors.boundaryBody')}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRecover} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{translate(lang, 'errors.boundaryAction')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffe4ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
