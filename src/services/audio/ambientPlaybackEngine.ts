import type { AudioPlayer, AudioSource, AudioStatus } from 'expo-audio';

export type AmbientTrackId = 'none' | 'rain' | 'waves' | 'forest' | 'wind' | 'fire';
export type PlayableAmbientTrackId = Exclude<AmbientTrackId, 'none'>;
export type PlayableAudioSource = NonNullable<AudioSource>;

export interface AmbientPlaybackEngineDeps {
  sources: Record<PlayableAmbientTrackId, PlayableAudioSource>;
  createPlayer: (source: AudioSource) => AudioPlayer;
  configureAudioMode: () => Promise<void>;
  resolveSource?: (source: PlayableAudioSource) => Promise<PlayableAudioSource>;
}

/**
 * Isolated ambient audio playback controller encapsulating player lifecycle,
 * fail-safe audio mode configuration, error reporting, and transition sequencing.
 */
export function createAmbientPlaybackEngine(deps: AmbientPlaybackEngineDeps) {
  const activePlayers = new Map<AmbientTrackId, AudioPlayer>();
  const statusSubscriptions = new WeakMap<AudioPlayer, { remove: () => void }>();

  let currentVolume = 0.4;
  let audioModeConfigured = false;
  let transitionSeq = 0;

  async function ensureAudioModeConfigured(): Promise<void> {
    if (audioModeConfigured) return;
    try {
      await deps.configureAudioMode();
      audioModeConfigured = true;
    } catch (e) {
      console.warn('setAudioModeAsync failed, continuing audio playback:', e);
    }
  }

  function disposePlayer(player: AudioPlayer): void {
    const sub = statusSubscriptions.get(player);
    if (sub) {
      try {
        sub.remove();
      } catch {}
      statusSubscriptions.delete(player);
    }
    try {
      player.pause();
    } catch {}
    try {
      player.remove();
    } catch {}
  }

  function clearActivePlayers(): void {
    const playersToStop = Array.from(activePlayers.values());
    activePlayers.clear();
    for (const player of playersToStop) {
      disposePlayer(player);
    }
  }

  function getActiveSounds(): AmbientTrackId[] {
    return Array.from(activePlayers.keys());
  }

  function isTrackActive(type: AmbientTrackId): boolean {
    return activePlayers.has(type);
  }

  function stopAll(): void {
    transitionSeq++;
    clearActivePlayers();
  }

  function stop(type?: AmbientTrackId): void {
    if (!type || type === 'none') {
      stopAll();
      return;
    }

    transitionSeq++;
    const player = activePlayers.get(type);
    if (player) {
      activePlayers.delete(type);
      disposePlayer(player);
    }
  }

  async function toggle(type: AmbientTrackId, volume = currentVolume): Promise<boolean> {
    if (type === 'none') {
      stopAll();
      return false;
    }

    currentVolume = Math.max(0, Math.min(1, volume));

    if (activePlayers.has(type)) {
      transitionSeq++;
      const player = activePlayers.get(type);
      activePlayers.delete(type);
      if (player) {
        disposePlayer(player);
      }
      return false;
    }

    const seq = ++transitionSeq;
    clearActivePlayers();

    await ensureAudioModeConfigured();

    try {
      const baseSource = deps.sources[type];
      if (!baseSource) {
        console.warn(`Unknown ambient sound requested: ${type}`);
        return false;
      }

      let playableSource = baseSource;
      if (deps.resolveSource) {
        try {
          playableSource = await deps.resolveSource(baseSource);
        } catch (e) {
          console.warn(`Failed to resolve ambient source (${type}), falling back:`, e);
          playableSource = baseSource;
        }
      }

      if (seq !== transitionSeq) {
        return false;
      }

      const player = deps.createPlayer(playableSource);
      const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.error) {
          console.warn(`Ambient audio playback error (${type}):`, status.error);
        }
      });
      statusSubscriptions.set(player, sub);

      player.loop = true;
      player.volume = currentVolume;
      activePlayers.set(type, player);
      player.play();
      return true;
    } catch (e) {
      activePlayers.delete(type);
      console.warn(`Failed to play ambient sound: ${type}`, e);
      return false;
    }
  }

  function setVolume(vol: number): void {
    currentVolume = Math.max(0, Math.min(1, vol));
    for (const player of activePlayers.values()) {
      try {
        player.volume = currentVolume;
      } catch (e) {
        console.warn('Failed to update ambient volume:', e);
      }
    }
  }

  function getActiveSound(): AmbientTrackId {
    const keys = Array.from(activePlayers.keys());
    return keys.length > 0 ? keys[keys.length - 1] : 'none';
  }

  function getVolume(): number {
    return currentVolume;
  }

  return {
    ensureAudioModeConfigured,
    getActiveSounds,
    isTrackActive,
    toggle,
    stop,
    stopAll,
    setVolume,
    getActiveSound,
    getVolume,
  };
}
