export const SoundEngine = {
    ctx: null,
    masterGain: null,
    limiter: null,
    voices: [],
    noiseVoices: [],
    kickVoices: [],
    isInitialized: false,

    init() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        if (navigator.audioSession) {
            navigator.audioSession.type = 'playback';
        }

        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.loop = true;
        silentAudio.volume = 0.01;
        silentAudio.play().catch(() => {});

        const resumeAudio = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        };
        document.addEventListener('visibilitychange', resumeAudio);
        window.addEventListener('focus', resumeAudio);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.6;

        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -2;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.005;
        this.limiter.release.value = 0.05;

        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);

        for (let i = 0; i < 18; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            gain.gain.value = 0;
            this.voices.push({ osc, gain });
        }

        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        for (let i = 0; i < 18; i++) {
            const noise = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            noise.buffer = noiseBuffer;
            noise.loop = true;
            noise.connect(gain);
            gain.connect(this.masterGain);
            noise.start();
            gain.gain.value = 0;
            this.noiseVoices.push({ noise, gain });
        }

        for (let i = 0; i < 18; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            gain.gain.value = 0;
            this.kickVoices.push({ osc, gain });
        }

        this.isInitialized = true;
    },

    setVoiceFrequency(index, frequency, when = this.ctx.currentTime) {
        this.voices[index].osc.frequency.setTargetAtTime(frequency, when, 0.05);
    },

    setVoiceGain(index, value, when = this.ctx.currentTime) {
        this.voices[index].gain.setTargetAtTime(value, when, 0.05);
    },

    setNoiseGain(index, value, when = this.ctx.currentTime) {
        this.noiseVoices[index].gain.setTargetAtTime(value, when, 0.05);
    },

    playKickVoice(index, when, frequency) {
        const voice = this.kickVoices[index];
        voice.osc.frequency.setValueAtTime(frequency, when);
        voice.gain.cancelScheduledValues(when);
        voice.gain.setValueAtTime(0, when);
        voice.gain.linearRampToValueAtTime(0.8, when + 0.015);
        voice.gain.exponentialRampToValueAtTime(0.001, when + 2.5);
    },

    dampKickVoiceAt(index, when, releaseTimeConstant = 0.05) {
        const voice = this.kickVoices[index];
        voice.gain.cancelScheduledValues(when);
        voice.gain.setTargetAtTime(0, when, releaseTimeConstant);
    }
};