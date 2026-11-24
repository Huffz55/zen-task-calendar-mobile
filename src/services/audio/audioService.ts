import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAmbientPlaybackEngine,
  type AmbientTrackId,
  type PlayableAmbientTrackId,
  type PlayableAudioSource,
} from './ambientPlaybackEngine';

type AudioIconName = ComponentProps<typeof Ionicons>['name'];

// Local high quality synthesized ambient tracks and 432 Hz chime
const zenChimeSource = require('../../../assets/zen_chime.wav');
const sfxBambooSource = require('../../../assets/sfx_bamboo.wav');
const sfxWaterSource = require('../../../assets/sfx_water.wav');
const sfxBowlSource = require('../../../assets/sfx_bowl.wav');
const sfxSwooshSource = require('../../../assets/sfx_swoosh.wav');

const ambientSources: Record<PlayableAmbientTrackId, PlayableAudioSource> = {
  rain: require('../../../assets/ambient_rain.m4a'),
  waves: require('../../../assets/ambient_waves.m4a'),
  forest: require('../../../assets/ambient_forest.m4a'),
  wind: require('../../../assets/ambient_wind.m4a'),
};

export type AmbientSoundType = AmbientTrackId;

interface AmbientTrackConfig {
  id: AmbientSoundType;
  label: string;
  icon: AudioIconName;
}

export const AMBIENT_TRACKS: Record<AmbientSoundType, AmbientTrackConfig> = {
  none: {
    id: 'none',
    label: 'Mute',
    icon: 'volume-mute-outline',
  },
  rain: {
    id: 'rain',
    label: 'Soft Rain',
    icon: 'rainy-outline',
  },
  waves: {
    id: 'waves',
    label: 'Ocean Waves',
    icon: 'water-outline',
  },
  forest: {
    id: 'forest',
    label: 'Forest Birds',
    icon: 'leaf-outline',
  },
  wind: {
    id: 'wind',
    label: 'Gentle Wind',
    icon: 'cloudy-outline',
  },
};

async function resolvePlayableSource(moduleSource: PlayableAudioSource): Promise<PlayableAudioSource> {
  if (typeof moduleSource !== 'number') {
    return moduleSource;
  }
  try {
    const asset = Asset.fromModule(moduleSource);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    if (
      asset.localUri &&
      (asset.localUri.startsWith('file://') ||
        asset.localUri.startsWith('asset://') ||
        asset.localUri.startsWith('content://') ||
        asset.localUri.startsWith('/'))
    ) {
      return { uri: asset.localUri, name: asset.name };
    }
  } catch (e) {
    console.warn('Failed to pre-download audio asset, using module source directly:', e);
  }
  return moduleSource;
}

const ambientEngine = createAmbientPlaybackEngine({
  sources: ambientSources,
  createPlayer: createAudioPlayer,
  configureAudioMode: () =>
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
      allowsBackgroundRecording: false,
    }),
  resolveSource: resolvePlayableSource,
});

type SfxName = 'bamboo' | 'water' | 'bowl' | 'swoosh';

let chimePlayer: AudioPlayer | null = null;
let chimeCreationPromise: Promise<AudioPlayer | null> | null = null;

const sfxPlayers: Record<SfxName, AudioPlayer | null> = {
  bamboo: null,
  water: null,
  bowl: null,
  swoosh: null,
};
const sfxCreationPromises: Partial<Record<SfxName, Promise<AudioPlayer | null>>> = {};

let sfxEnabled = true;
let hasExplicitSfxOverride = false;
const SETTINGS_SFX_KEY = '@noteapp_setting_sfx';

let chimeEnabled = true;
let hasExplicitChimeOverride = false;
const SETTINGS_CHIME_KEY = '@noteapp_setting_chime';

function disposeNativePlayer(player: AudioPlayer | null): void {
  if (!player) return;
  try {
    player.pause();
  } catch {}
  try {
    player.remove();
  } catch {}
}

function releaseSfxPlayers(): void {
  (Object.keys(sfxPlayers) as SfxName[]).forEach(key => {
    disposeNativePlayer(sfxPlayers[key]);
    sfxPlayers[key] = null;
    delete sfxCreationPromises[key];
  });
}

function releaseChimePlayer(): void {
  disposeNativePlayer(chimePlayer);
  chimePlayer = null;
  chimeCreationPromise = null;
}

// Initialize SFX setting from AsyncStorage without clobbering explicit user toggles
AsyncStorage.getItem(SETTINGS_SFX_KEY)
  .then(val => {
    if (val !== null && !hasExplicitSfxOverride) {
      sfxEnabled = val === 'true';
    }
  })
  .catch(() => {});

// Initialize completion chime setting from AsyncStorage
const chimeInitPromise = AsyncStorage.getItem(SETTINGS_CHIME_KEY)
  .then(val => {
    if (val !== null && !hasExplicitChimeOverride) {
      chimeEnabled = val === 'true';
    }
  })
  .catch(() => {});

export function isSoundEffectsEnabled(): boolean {
  return sfxEnabled;
}

export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  hasExplicitSfxOverride = true;
  sfxEnabled = enabled;
  if (!enabled) {
    releaseSfxPlayers();
  }
  await AsyncStorage.setItem(SETTINGS_SFX_KEY, String(enabled));
}

export function isCompletionChimeEnabled(): boolean {
  return chimeEnabled;
}

export async function setCompletionChimeEnabled(enabled: boolean): Promise<void> {
  hasExplicitChimeOverride = true;
  chimeEnabled = enabled;
  if (!enabled) {
    releaseChimePlayer();
  }
  await AsyncStorage.setItem(SETTINGS_CHIME_KEY, String(enabled));
}

async function getOrCreateSfxPlayer(name: SfxName): Promise<AudioPlayer | null> {
  if (sfxPlayers[name]) return sfxPlayers[name];
  if (sfxCreationPromises[name]) return sfxCreationPromises[name] ?? null;

  const srcMap: Record<SfxName, PlayableAudioSource> = {
    bamboo: sfxBambooSource,
    water: sfxWaterSource,
    bowl: sfxBowlSource,
    swoosh: sfxSwooshSource,
  };

  const creation = (async () => {
    const source = await resolvePlayableSource(srcMap[name]);
    if (!sfxEnabled) return null;
    const player = createAudioPlayer(source);
    sfxPlayers[name] = player;
    return player;
  })().finally(() => {
    delete sfxCreationPromises[name];
  });

  sfxCreationPromises[name] = creation;
  return creation;
}

async function playSfx(name: SfxName, volume = 0.8): Promise<void> {
  if (!sfxEnabled) return;
  try {
    await ambientEngine.ensureAudioModeConfigured();
    const player = await getOrCreateSfxPlayer(name);
    if (!player || !sfxEnabled) return;
    player.volume = volume;
    try {
      await player.seekTo(0);
    } catch {}
    player.play();
  } catch (e) {
    console.warn(`Failed to play sfx ${name}`, e);
  }
}

/** Satisfying bamboo/woodblock click when completing tasks or subtasks */
export async function playBambooTap(): Promise<void> {
  await playSfx('bamboo', 0.9);
}

/** Crystal-clear water drop when adding tasks or switching days */
export async function playWaterDrop(): Promise<void> {
  await playSfx('water', 0.8);
}

/** Deep Tibetan singing bowl when starting focus timer or breathing */
export async function playSingingBowl(): Promise<void> {
  await playSfx('bowl', 0.95);
}

/** Soft paper/breeze swoosh when swiping cards */
export async function playSoftSwoosh(): Promise<void> {
  await playSfx('swoosh', 0.65);
}

export async function playZenChime(): Promise<void> {
  await chimeInitPromise;
  if (!chimeEnabled) return;
  try {
    await ambientEngine.ensureAudioModeConfigured();
    if (!chimePlayer) {
      if (!chimeCreationPromise) {
        chimeCreationPromise = (async () => {
          const source = await resolvePlayableSource(zenChimeSource);
          if (!chimeEnabled) return null;
          const player = createAudioPlayer(source);
          chimePlayer = player;
          return player;
        })().finally(() => {
          chimeCreationPromise = null;
        });
      }
      await chimeCreationPromise;
    }
    if (!chimePlayer || !chimeEnabled) return;
    chimePlayer.volume = 1.0;
    try {
      await chimePlayer.seekTo(0);
    } catch {}
    chimePlayer.play();
  } catch (e) {
    console.warn('Failed to play zen chime', e);
  }
}

export function getActiveAmbientSounds(): AmbientSoundType[] {
  return ambientEngine.getActiveSounds();
}

export async function toggleAmbientSound(
  type: AmbientSoundType,
  volume = ambientEngine.getVolume()
): Promise<boolean> {
  return ambientEngine.toggle(type, volume);
}

export function stopAllAmbientSounds(): void {
  ambientEngine.stopAll();
}

export function setAmbientVolume(vol: number): void {
  ambientEngine.setVolume(vol);
}

export function getAmbientVolume(): number {
  return ambientEngine.getVolume();
}

/**
 * Pauses active ambient loops and releases cached native SFX/chime decoders
 * when the app enters the background to keep RAM usage lean on entry-level Android.
 */
export function pauseAudioForBackground(): void {
  ambientEngine.pauseForBackground();
  releaseChimePlayer();
  releaseSfxPlayers();
}

/**
 * Resumes ambient soundscape playback that was interrupted solely by backgrounding.
 */
export function resumeAudioFromBackground(): void {
  ambientEngine.resumeFromBackground();
}
