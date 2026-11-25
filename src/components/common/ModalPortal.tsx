import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EMPTY_PORTAL_ENTRIES: readonly PortalEntry[] = [];
const noopUnsubscribe = () => {};
const noopSubscribe = () => noopUnsubscribe;
const getEmptySnapshot = () => EMPTY_PORTAL_ENTRIES;

interface PortalEntry {
  id: string;
  node: React.ReactNode;
  onRequestCloseRef: React.MutableRefObject<(() => void) | undefined>;
  isClosingRef: React.MutableRefObject<boolean>;
}

interface PortalStore {
  upsert: (
    id: string,
    node: React.ReactNode,
    onRequestCloseRef: React.MutableRefObject<(() => void) | undefined>,
    isClosingRef: React.MutableRefObject<boolean>
  ) => void;
  remove: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly PortalEntry[];
}

function createPortalStore(): PortalStore {
  let entries: PortalEntry[] = [];
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach(listener => listener());
  };

  return {
    upsert(id, node, onRequestCloseRef, isClosingRef) {
      const existingIndex = entries.findIndex(entry => entry.id === id);
      if (existingIndex === -1) {
        entries = [...entries, { id, node, onRequestCloseRef, isClosingRef }];
      } else {
        const next = entries.slice();
        next[existingIndex] = { id, node, onRequestCloseRef, isClosingRef };
        entries = next;
      }
      emit();
    },
    remove(id) {
      const next = entries.filter(entry => entry.id !== id);
      if (next.length === entries.length) return;
      entries = next;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return entries;
    },
  };
}

const ModalPortalContext = createContext<PortalStore | null>(null);
const BASE_PORTAL_Z_INDEX = 1000;

/**
 * Provides a lightweight, dependency-free LIFO modal portal stack.
 * Centralizes Android hardware BackHandler so only the topmost open modal
 * receives back presses and double-triggers during close animations are blocked.
 */
export function ModalPortalProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createPortalStore);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const stack = store.getSnapshot();
      if (stack.length === 0) return false;

      const topEntry = stack[stack.length - 1];
      // Consume back press while top modal is already animating out to prevent
      // double-dismiss or leaking back navigation to underlying modals/routes.
      if (topEntry.isClosingRef.current) {
        return true;
      }

      topEntry.onRequestCloseRef.current?.();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [store]);

  const contextValue = useMemo(() => store, [store]);

  return (
    <ModalPortalContext.Provider value={contextValue}>
      {children}
    </ModalPortalContext.Provider>
  );
}

/**
 * Renders all active portaled modals in LIFO z-index order.
 * Subscribes directly to the portal store so modal updates never re-render the app tree.
 */
export function ModalPortalHost() {
  const store = useContext(ModalPortalContext);

  const entries = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getSnapshot : getEmptySnapshot,
    getEmptySnapshot
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]} pointerEvents="box-none">
      {entries.map((entry, index) => {
        const isTop = index === entries.length - 1;
        return (
          <View
            key={entry.id}
            style={[StyleSheet.absoluteFill, { zIndex: BASE_PORTAL_Z_INDEX + index }]}
            pointerEvents={isTop ? 'auto' : 'none'}
            accessibilityViewIsModal={isTop}
            importantForAccessibility={isTop ? 'yes' : 'no-hide-descendants'}
          >
            {entry.node}
          </View>
        );
      })}
    </View>
  );
}

interface ModalPortalProps {
  visible: boolean;
  onRequestClose?: () => void;
  isClosingRef?: React.MutableRefObject<boolean>;
  children: React.ReactNode;
}

/**
 * Teleports modal content into the root ModalPortalHost without creating a native
 * Android Dialog window, eliminating native window create/destroy frame drops.
 */
export function ModalPortal({
  visible,
  onRequestClose,
  isClosingRef: externalIsClosingRef,
  children,
}: ModalPortalProps) {
  const store = useContext(ModalPortalContext);
  const portalId = useId();
  const onRequestCloseRef = useRef<(() => void) | undefined>(onRequestClose);
  const fallbackIsClosingRef = useRef(false);
  const isClosingRef = externalIsClosingRef ?? fallbackIsClosingRef;

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useIsomorphicLayoutEffect(() => {
    if (!store) return;

    if (visible) {
      store.upsert(portalId, children, onRequestCloseRef, isClosingRef);
    } else {
      store.remove(portalId);
    }
  }, [store, portalId, visible, children, isClosingRef]);

  useIsomorphicLayoutEffect(() => {
    if (!store) return;
    return () => {
      store.remove(portalId);
    };
  }, [store, portalId]);

  // Graceful fallback when rendered outside ModalPortalProvider (e.g. isolated tests)
  if (!store) {
    return visible ? <>{children}</> : null;
  }

  return null;
}

const styles = StyleSheet.create({
  host: {
    zIndex: BASE_PORTAL_Z_INDEX,
  },
});
