(function () {
  'use strict';

  const NUM_CELLS = 18;
  const ACTIVE_CONFIDENCE_THRESHOLD = 0.25;
  const NOTE_PEAK_GAIN = 0.28;
  const MIN_RETRIGGER_MS = 90;
  const FUNDAMENTAL_HZ = 110;
  const HYSTERESIS_MIN_DELTA = 2;
  const MAX_HARMONIC_STEP = 5;

  function countToFrequency(count) {
    return FUNDAMENTAL_HZ * (NUM_CELLS + 1 - count);
  }

  function gcd(a, b) {
    while (b !== 0) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  function dissonance(a, b) {
    const g = gcd(a, b);
    return a / g + b / g;
  }

  function chooseStep(fromCount, toCount) {
    const dir = toCount > fromCount ? 1 : -1;
    if (Math.abs(toCount - fromCount) <= MAX_HARMONIC_STEP) return toCount;
    const fromHarmonic = NUM_CELLS + 1 - fromCount;
    let best = fromCount + dir;
    let bestScore = Infinity;
    for (let s = 1; s <= MAX_HARMONIC_STEP; s++) {
      const candidate = fromCount + dir * s;
      const candidateHarmonic = NUM_CELLS + 1 - candidate;
      const score = dissonance(fromHarmonic, candidateHarmonic);
      if (score <= bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best;
  }

  let currentCount = 0;
  let targetCount = 0;
  let currentVoice = 0;
  let lastTriggerMs = -Infinity;
  let countHistory = [];

  function resetState() {
    currentCount = 0;
    targetCount = 0;
    lastTriggerMs = -Infinity;
    countHistory = [];
  }

  function smoothedCount(rawCount) {
    countHistory.push(rawCount);
    if (countHistory.length > 3) countHistory.shift();
    const sorted = countHistory.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
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

  function strike(count, audioNow) {
    window.SoundEngine.dampPianoVoiceAt(currentVoice, audioNow);
    currentCount = count;
    lastTriggerMs = performance.now();
    if (count === 0) return;
    currentVoice = (currentVoice + 1) % window.SoundEngine.NUM_PIANO_VOICES;
    window.SoundEngine.triggerPianoNoteAt(
      currentVoice,
      audioNow + 0.02,
      countToFrequency(count),
      NOTE_PEAK_GAIN
    );
  }

  function update(sampledRow) {
    if (!sampledRow) return;

    let rawCount = 0;
    for (const pixel of sampledRow) {
      if (pixel.confidence > ACTIVE_CONFIDENCE_THRESHOLD) rawCount++;
    }
    const count = smoothedCount(rawCount);

    if (count !== targetCount) {
      const crossesSilence = count === 0 || targetCount === 0;
      if (crossesSilence || Math.abs(count - targetCount) >= HYSTERESIS_MIN_DELTA) {
        targetCount = count;
      }
    }

    if (targetCount === currentCount) return;
    if (performance.now() - lastTriggerMs < MIN_RETRIGGER_MS) return;

    const audioNow = window.SoundEngine.getAudioContext().currentTime;

    if (targetCount === 0 || currentCount === 0) {
      strike(targetCount, audioNow);
      return;
    }

    strike(chooseStep(currentCount, targetCount), audioNow);
  }

  window.SynthModes = window.SynthModes || {};
  window.SynthModes.density = { activate, deactivate, update };
})();
