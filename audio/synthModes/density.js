(function () {
  'use strict';

  const NUM_CELLS = 18;
  const ACTIVE_CONFIDENCE_THRESHOLD = 0.25;
  const NOTE_PEAK_GAIN = 0.28;
  const STABLE_FRAMES_REQUIRED = 2;
  const MIN_RETRIGGER_MS = 90;
  const SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
  const BASE_MIDI = 45;

  const noteFrequencies = [];
  for (let i = 0; i < NUM_CELLS; i++) {
    const octave = Math.floor(i / SCALE_INTERVALS.length);
    const degree = i % SCALE_INTERVALS.length;
    const midi = BASE_MIDI + octave * 12 + SCALE_INTERVALS[degree];
    noteFrequencies.push(440 * Math.pow(2, (midi - 69) / 12));
  }

  function countToFrequency(count) {
    return noteFrequencies[NUM_CELLS - count];
  }

  let currentCount = 0;
  let candidateCount = 0;
  let candidateFrames = 0;
  let currentVoice = 0;
  let lastTriggerMs = -Infinity;

  function resetState() {
    currentCount = 0;
    candidateCount = 0;
    candidateFrames = 0;
    lastTriggerMs = -Infinity;
  }

  function dampAll() {
    const now = window.SoundEngine.getAudioContext().currentTime;
    for (let i = 0; i < window.SoundEngine.NUM_PIANO_VOICES; i++) {
      window.SoundEngine.dampPianoVoiceAt(i, now);
    }
  }

  function activate() {
    resetState();
    for (let i = 0; i < window.SoundEngine.NUM_VOICES; i++) {
      window.SoundEngine.setVoiceGain(i, 0);
    }
    dampAll();
  }

  function deactivate() {
    dampAll();
    resetState();
  }

  function update(sampledRow) {
    if (!sampledRow) return;

    let count = 0;
    for (const pixel of sampledRow) {
      if (pixel.confidence > ACTIVE_CONFIDENCE_THRESHOLD) count++;
    }

    if (count === currentCount) {
      candidateCount = count;
      candidateFrames = 0;
      return;
    }

    if (count === candidateCount) {
      candidateFrames++;
    } else {
      candidateCount = count;
      candidateFrames = 1;
    }

    if (candidateFrames < STABLE_FRAMES_REQUIRED) return;

    const nowMs = performance.now();
    if (nowMs - lastTriggerMs < MIN_RETRIGGER_MS) return;

    const audioNow = window.SoundEngine.getAudioContext().currentTime;
    window.SoundEngine.dampPianoVoiceAt(currentVoice, audioNow);

    currentCount = candidateCount;
    candidateFrames = 0;
    lastTriggerMs = nowMs;

    if (currentCount === 0) return;

    currentVoice = (currentVoice + 1) % window.SoundEngine.NUM_PIANO_VOICES;
    window.SoundEngine.triggerPianoNoteAt(
      currentVoice,
      audioNow + 0.02,
      countToFrequency(currentCount),
      NOTE_PEAK_GAIN
    );
  }

  window.SynthModes = window.SynthModes || {};
  window.SynthModes.density = { activate, deactivate, update };
})();
