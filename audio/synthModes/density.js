(function () {
  'use strict';

  const NUM_CELLS = 18;
  const FREQ_MAX_HZ = 880;
  const FREQ_MIN_HZ = 110;
  const VOICE_GAIN = 0.16;
  const GLIDE_TIME_CONSTANT = 0.15;
  const GAIN_TIME_CONSTANT = 0.12;
  const ACTIVE_CONFIDENCE_THRESHOLD = 0.25;

  function countToFrequency(count) {
    const t = (count - 1) / (NUM_CELLS - 1);
    return FREQ_MAX_HZ * Math.pow(FREQ_MIN_HZ / FREQ_MAX_HZ, t);
  }

  function activate() {
    window.SoundEngine.setVoiceWaveform(0, 'sine');
    window.SoundEngine.setVoicePan(0, 0, 0.001);
    window.SoundEngine.setVoiceFilterFrequency(0, 12000, 0.001);
    window.SoundEngine.setVoiceFilterQ(0, 0.7, 0.001);
    window.SoundEngine.setVoiceGain(0, 0);
    for (let i = 1; i < window.SoundEngine.NUM_VOICES; i++) {
      window.SoundEngine.setVoiceGain(i, 0);
    }
  }

  function deactivate() {
    window.SoundEngine.setVoiceGain(0, 0);
  }

  function update(sampledRow) {
    if (!sampledRow) return;

    let count = 0;
    for (const pixel of sampledRow) {
      if (pixel.confidence > ACTIVE_CONFIDENCE_THRESHOLD) count++;
    }

    if (count === 0) {
      window.SoundEngine.setVoiceGain(0, 0, GAIN_TIME_CONSTANT);
      return;
    }

    window.SoundEngine.setVoiceFrequency(0, countToFrequency(count), GLIDE_TIME_CONSTANT);
    window.SoundEngine.setVoiceGain(0, VOICE_GAIN, GAIN_TIME_CONSTANT);
  }

  window.SynthModes = window.SynthModes || {};
  window.SynthModes.density = { activate, deactivate, update };
})();
