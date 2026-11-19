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

export type AudioIconName = ComponentProps<typeof Ionicons>['name'];

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

export interface AmbientTrackConfig {
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

let chimePlayer: AudioPlayer | null = null;

const sfxPlayers: Record<string, AudioPlayer | null> = {
  bamboo: null,
  water: null,
  bowl: null,
  swoosh: null,
};

let sfxEnabled = true;
const SETTINGS_SFX_KEY = '@noteapp_setting_sfx';

// Initialize SFX setting from AsyncStorage
AsyncStorage.getItem(SETTINGS_SFX_KEY).then(val => {
  if (val !== null) sfxEnabled = val === 'true';
});

export function isSoundEffectsEnabled(): boolean {
  return sfxEnabled;
}

export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  sfxEnabled = enabled;
  await AsyncStorage.setItem(SETTINGS_SFX_KEY, String(enabled));
}

async function playSfx(name: 'bamboo' | 'water' | 'bowl' | 'swoosh', volume = 0.8): Promise<void> {
  if (!sfxEnabled) return;
  try {
    await ambientEngine.ensureAudioModeConfigured();
    let player = sfxPlayers[name];
    if (!player) {
      const srcMap: Record<'bamboo' | 'water' | 'bowl' | 'swoosh', PlayableAudioSource> = {
        bamboo: sfxBambooSource,
        water: sfxWaterSource,
        bowl: sfxBowlSource,
        swoosh: sfxSwooshSource,
      };
      const source = await resolvePlayableSource(srcMap[name]);
      player = createAudioPlayer(source);
      sfxPlayers[name] = player;
    }
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
  try {
    await ambientEngine.ensureAudioModeConfigured();
    if (!chimePlayer) {
      const source = await resolvePlayableSource(zenChimeSource);
      chimePlayer = createAudioPlayer(source);
    }
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

export function isAmbientTrackActive(type: AmbientSoundType): boolean {
  return ambientEngine.isTrackActive(type);
}

export async function toggleAmbientSound(
  type: AmbientSoundType,
  volume = ambientEngine.getVolume()
): Promise<boolean> {
  return ambientEngine.toggle(type, volume);
}

export async function playAmbientSound(
  type: AmbientSoundType,
  volume = ambientEngine.getVolume()
): Promise<void> {
  if (type === 'none') {
    ambientEngine.stopAll();
    return;
  }
  await ambientEngine.toggle(type, volume);
}

export function stopAmbientSound(type?: AmbientSoundType): void {
  ambientEngine.stop(type);
}

export function stopAllAmbientSounds(): void {
  ambientEngine.stopAll();
}

export function setAmbientVolume(vol: number): void {
  ambientEngine.setVolume(vol);
}

export function getActiveAmbientSound(): AmbientSoundType {
  return ambientEngine.getActiveSound();
}

export function getAmbientVolume(): number {
  return ambientEngine.getVolume();
}

/**
 * Pauses active ambient loops and short SFX players when the app enters the background.
 */
export function pauseAudioForBackground(): void {
  ambientEngine.pauseForBackground();
  try {
    chimePlayer?.pause();
  } catch {}
  for (const key of Object.keys(sfxPlayers)) {
    try {
      sfxPlayers[key]?.pause();
    } catch {}
  }
}

/**
 * Resumes ambient soundscape playback that was interrupted solely by backgrounding.
 */
export function resumeAudioFromBackground(): void {
  ambientEngine.resumeFromBackground();
}
