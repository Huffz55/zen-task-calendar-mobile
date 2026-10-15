import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// Local high quality synthesized ambient tracks and 432 Hz chime
const zenChimeSource = require('../../../assets/zen_chime.wav');
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
let ambientPlayer: AudioPlayer | null = null;
let currentAmbientType: AmbientSoundType = 'none';
let currentVolume = 0.4;

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

export async function playAmbientSound(
  type: AmbientSoundType,
  volume = currentVolume
): Promise<void> {
  if (type === 'none') {
    stopAmbientSound();
    return;
  }

  currentVolume = volume;
  currentAmbientType = type;

  try {
    if (ambientPlayer) {
      ambientPlayer.pause();
      ambientPlayer.release();
      ambientPlayer = null;
    }

    const source = (ambientSources as Record<string, any>)[type];
    if (!source) return;

    ambientPlayer = createAudioPlayer(source);
    ambientPlayer.loop = true;
    ambientPlayer.volume = currentVolume;
    ambientPlayer.play();
  } catch (e) {
    console.warn(`Failed to play ambient sound: ${type}`, e);
  }
}

export function stopAmbientSound(): void {
  currentAmbientType = 'none';
  if (ambientPlayer) {
    try {
      ambientPlayer.pause();
      ambientPlayer.release();
    } catch {}
    ambientPlayer = null;
  }
}

export function setAmbientVolume(vol: number): void {
  currentVolume = Math.max(0, Math.min(1, vol));
  if (ambientPlayer) {
    ambientPlayer.volume = currentVolume;
  }
}

export function getActiveAmbientSound(): AmbientSoundType {
  return currentAmbientType;
}

export function getAmbientVolume(): number {
  return currentVolume;
}
