import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// Local high quality synthesized 432 Hz Tibetan singing bowl chime
const zenChimeSource = require('../../../assets/zen_chime.wav');

export type AmbientSoundType = 'none' | 'rain' | 'waves' | 'forest' | 'fire';

export interface AmbientTrackConfig {
  id: AmbientSoundType;
  label: string;
  icon: string;
  url: string;
}

export const AMBIENT_TRACKS: Record<AmbientSoundType, AmbientTrackConfig> = {
  none: {
    id: 'none',
    label: 'Mute',
    icon: 'volume-mute-outline',
    url: '',
  },
  rain: {
    id: 'rain',
    label: 'Soft Rain',
    icon: 'rainy-outline',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_73e7215b13.mp3?filename=soft-rain-ambient-111154.mp3',
  },
  waves: {
    id: 'waves',
    label: 'Ocean Waves',
    icon: 'water-outline',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ocean-waves-ambient-110055.mp3',
  },
  forest: {
    id: 'forest',
    label: 'Forest Birds',
    icon: 'leaf-outline',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db49742099.mp3?filename=forest-birds-ambient-112344.mp3',
  },
  fire: {
    id: 'fire',
    label: 'Cozy Fireplace',
    icon: 'flame-outline',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c35f29f046.mp3?filename=fireplace-ambient-112345.mp3',
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

    const track = AMBIENT_TRACKS[type];
    if (!track || !track.url) return;

    ambientPlayer = createAudioPlayer({ uri: track.url });
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
