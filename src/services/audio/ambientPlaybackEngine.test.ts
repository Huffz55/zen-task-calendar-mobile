import { describe, expect, it, vi } from 'vitest';
import type { AudioPlayer, AudioSource, AudioStatus } from 'expo-audio';
import {
  createAmbientPlaybackEngine,
  type PlayableAmbientTrackId,
  type PlayableAudioSource,
} from './ambientPlaybackEngine';

interface MockPlayerState {
  source: AudioSource;
  loop: boolean;
  volume: number;
  playCount: number;
  pauseCount: number;
  removeCount: number;
  statusListener?: (status: AudioStatus) => void;
}

function createHarness(options?: { failAudioMode?: boolean; failResolve?: boolean }) {
  const players: MockPlayerState[] = [];
  const configureAudioMode = vi.fn(async () => {
    if (options?.failAudioMode) {
      throw new Error('AudioManager unavailable');
    }
  });
  const resolveSource = vi.fn(async (src: PlayableAudioSource): Promise<PlayableAudioSource> => {
    if (options?.failResolve) {
      throw new Error('Asset cache unavailable');
    }
    return { uri: `file:///cache/${String(src)}.m4a` };
  });

  const sources: Record<PlayableAmbientTrackId, PlayableAudioSource> = {
    rain: 1,
    waves: 2,
    forest: 3,
    wind: 4,
    fire: 5,
  };

  const createPlayer = vi.fn((source: AudioSource): AudioPlayer => {
    const state: MockPlayerState = {
      source,
      loop: false,
      volume: 1,
      playCount: 0,
      pauseCount: 0,
      removeCount: 0,
    };
    players.push(state);

    return {
      get loop() {
        return state.loop;
      },
      set loop(val: boolean) {
        state.loop = val;
      },
      get volume() {
        return state.volume;
      },
      set volume(val: number) {
        state.volume = val;
      },
      play() {
        state.playCount++;
      },
      pause() {
        state.pauseCount++;
      },
      remove() {
        state.removeCount++;
      },
      addListener(_event: string, listener: (status: AudioStatus) => void) {
        state.statusListener = listener;
        return { remove: vi.fn() };
      },
    } as unknown as AudioPlayer;
  });

  const engine = createAmbientPlaybackEngine({
    sources,
    createPlayer,
    configureAudioMode,
    resolveSource,
  });

  return { engine, players, configureAudioMode, resolveSource };
}

describe('ambientPlaybackEngine reliability', () => {
  it('starts all 5 ambient tracks immediately at target volume with loop=true and switches cleanly', async () => {
    const { engine, players } = createHarness();
    const tracks: PlayableAmbientTrackId[] = ['rain', 'waves', 'fire', 'forest', 'wind'];

    for (const track of tracks) {
      const started = await engine.toggle(track, 0.65);
      expect(started).toBe(true);
      expect(engine.getActiveSounds()).toEqual([track]);
      expect(engine.isTrackActive(track)).toBe(true);

      const player = players[players.length - 1];
      expect(player.loop).toBe(true);
      expect(player.volume).toBe(0.65);
      expect(player.playCount).toBe(1);
    }

    // All 4 previous players should have been paused and removed on track switch
    for (let i = 0; i < players.length - 1; i++) {
      expect(players[i].pauseCount).toBe(1);
      expect(players[i].removeCount).toBe(1);
    }

    // Immediate volume updates & [0, 1] clamping
    engine.setVolume(0.75);
    expect(players[players.length - 1].volume).toBe(0.75);
    engine.setVolume(1.5);
    expect(players[players.length - 1].volume).toBe(1);
    engine.setVolume(-0.2);
    expect(players[players.length - 1].volume).toBe(0);

    // Selecting mute / stopAll cleanly disposes active player
    engine.stopAll();
    expect(engine.getActiveSounds()).toEqual([]);
    expect(engine.getActiveSound()).toBe('none');
    expect(players[players.length - 1].pauseCount).toBe(1);
    expect(players[players.length - 1].removeCount).toBe(1);
  });

  it('continues playback even when setAudioModeAsync or pre-download fails and warns on errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine, players } = createHarness({ failAudioMode: true, failResolve: true });

    const started = await engine.toggle('rain', 0.5);
    expect(started).toBe(true);
    expect(engine.getActiveSounds()).toEqual(['rain']);
    expect(players[0].source).toBe(1); // fell back to raw module source
    expect(players[0].volume).toBe(0.5);
    expect(players[0].playCount).toBe(1);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockClear();
    players[0].statusListener?.({ error: 'ExoPlayer decode error' } as AudioStatus);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ambient audio playback error (rain):',
      'ExoPlayer decode error'
    );

    warnSpy.mockRestore();
  });

  it('aborts stale toggle if stopAll is called while resolving asset asynchronously', async () => {
    const { engine, players, resolveSource } = createHarness();
    let releaseResolve: ((src: PlayableAudioSource) => void) | undefined;
    resolveSource.mockImplementationOnce(
      () =>
        new Promise<PlayableAudioSource>(resolve => {
          releaseResolve = resolve;
        })
    );

    const pending = engine.toggle('waves', 0.4);
    await vi.waitFor(() => {
      expect(resolveSource).toHaveBeenCalledTimes(1);
    });
    engine.stopAll();
    releaseResolve?.({ uri: 'file:///cache/waves.m4a' });

    expect(await pending).toBe(false);
    expect(players).toHaveLength(0);
    expect(engine.getActiveSounds()).toEqual([]);
  });
});
