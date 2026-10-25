import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local high quality synthesized ambient tracks and 432 Hz chime
const zenChimeSource = require('../../../assets/zen_chime.wav');
const sfxBambooSource = require('../../../assets/sfx_bamboo.wav');
const sfxWaterSource = require('../../../assets/sfx_water.wav');
const sfxBowlSource = require('../../../assets/sfx_bowl.wav');
const sfxSwooshSource = require('../../../assets/sfx_swoosh.wav');

const ambientSources = {
  rain: require('../../../assets/ambient_rain.wav'),
  waves: require('../../../assets/ambient_waves.wav'),
  forest: require('../../../assets/ambient_forest.wav'),
  wind: require('../../../assets/ambient_wind.wav'),
  fire: require('../../../assets/ambient_fire.wav'),
};

export type AmbientSoundType = 'none' | 'rain' | 'waves' | 'forest' | 'wind' | 'fire';

export interface AmbientTrackConfig {
  id: AmbientSoundType;
  label: string;
  icon: string;
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
  fire: {
    id: 'fire',
    label: 'Cozy Fireplace',
    icon: 'flame-outline',
  },
};

let chimePlayer: AudioPlayer | null = null;
const activeAmbientPlayers = new Map<AmbientSoundType, AudioPlayer>();
let currentVolume = 0.4;

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
    let player = sfxPlayers[name];
    if (!player) {
      const srcMap = {
        bamboo: sfxBambooSource,
        water: sfxWaterSource,
        bowl: sfxBowlSource,
        swoosh: sfxSwooshSource,
      };
      player = createAudioPlayer(srcMap[name]);
      sfxPlayers[name] = player;
    }
    player.volume = volume;
    player.seekTo(0);
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
    if (!chimePlayer) {
      chimePlayer = createAudioPlayer(zenChimeSource);
    }
    chimePlayer.volume = 1.0;
    chimePlayer.seekTo(0);
    chimePlayer.play();
  } catch (e) {
    console.warn('Failed to play zen chime', e);
  }
}

export function getActiveAmbientSounds(): AmbientSoundType[] {
  return Array.from(activeAmbientPlayers.keys());
}

export function isAmbientTrackActive(type: AmbientSoundType): boolean {
  return activeAmbientPlayers.has(type);
}

export async function toggleAmbientSound(
  type: AmbientSoundType,
  volume = currentVolume
): Promise<boolean> {
  if (type === 'none') {
    stopAllAmbientSounds();
    return false;
  }

  currentVolume = volume;

  if (activeAmbientPlayers.has(type)) {
    const player = activeAmbientPlayers.get(type);
    if (player) {
      try {
        player.pause();
        player.release();
      } catch {}
    }
    activeAmbientPlayers.delete(type);
    return false;
  } else {
    try {
      const source = (ambientSources as Record<string, any>)[type];
      if (!source) return false;

      const player = createAudioPlayer(source);
      player.loop = true;
      player.volume = currentVolume;
      player.play();
      activeAmbientPlayers.set(type, player);
      return true;
    } catch (e) {
      console.warn(`Failed to play ambient sound: ${type}`, e);
      return false;
    }
  }
}

export async function playAmbientSound(
  type: AmbientSoundType,
  volume = currentVolume
): Promise<void> {
  if (type === 'none') {
    stopAllAmbientSounds();
    return;
  }
  await toggleAmbientSound(type, volume);
}

export function stopAmbientSound(type?: AmbientSoundType): void {
  if (!type || type === 'none') {
    stopAllAmbientSounds();
    return;
  }

  const player = activeAmbientPlayers.get(type);
  if (player) {
    try {
      player.pause();
      player.release();
    } catch {}
    activeAmbientPlayers.delete(type);
  }
}

export function stopAllAmbientSounds(): void {
  for (const player of activeAmbientPlayers.values()) {
    try {
      player.pause();
      player.release();
    } catch {}
  }
  activeAmbientPlayers.clear();
}

export function setAmbientVolume(vol: number): void {
  currentVolume = Math.max(0, Math.min(1, vol));
  for (const player of activeAmbientPlayers.values()) {
    try {
      player.volume = currentVolume;
    } catch {}
  }
}

export function getActiveAmbientSound(): AmbientSoundType {
  const keys = Array.from(activeAmbientPlayers.keys());
  return keys.length > 0 ? keys[keys.length - 1] : 'none';
}

export function getAmbientVolume(): number {
  return currentVolume;
}
