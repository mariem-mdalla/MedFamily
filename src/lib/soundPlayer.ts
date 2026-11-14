import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let _player: AudioPlayer | null = null;

/**
 * Loads and plays assets/sounds/reminder.wav using expo-audio.
 * Fully wrapped in try/catch so sound errors can NEVER crash the app.
 */
export async function playReminderSound(): Promise<void> {
  try {
    await stopReminderSound();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch {
      // Non-blocking
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const source = require('../../assets/sounds/reminder.wav');
      const player = createAudioPlayer(source);
      _player = player;

      player.addListener('playbackStatusUpdate', (status) => {
        try {
          if (status.didJustFinish) {
            player.remove();
            if (_player === player) {
              _player = null;
            }
          }
        } catch {
          // Non-blocking
        }
      });

      player.play();
    } catch {
      _player = null;
    }
  } catch {
    // Non-blocking – sound problem can never crash the app
    _player = null;
  }
}

/**
 * Stops and removes any currently playing reminder sound.
 * Wrapped in try/catch so stopping sound never throws.
 */
export async function stopReminderSound(): Promise<void> {
  if (!_player) return;
  try {
    _player.pause();
    _player.remove();
  } catch {
    // Non-blocking
  } finally {
    _player = null;
  }
}
