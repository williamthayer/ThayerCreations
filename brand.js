(() => {
  const brand = document.querySelector('.brand');
  let sparkAudioContext;
  if (!brand) return;

  function playSparkSound() {
    if (!sparkAudioContext) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) return;
      sparkAudioContext = new AudioContextConstructor();
    }

    const audioContext = sparkAudioContext;
    const startTime = audioContext.currentTime;
    if (audioContext.state === 'suspended') void audioContext.resume();
    const tone = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    tone.type = 'sawtooth';
    tone.frequency.setValueAtTime(1500, startTime);
    tone.frequency.exponentialRampToValueAtTime(240, startTime + 0.12);
    toneGain.gain.setValueAtTime(0.018, startTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    tone.connect(toneGain);
    toneGain.connect(audioContext.destination);
    tone.start(startTime);
    tone.stop(startTime + 0.12);

    const noiseLength = Math.ceil(audioContext.sampleRate * 0.06);
    const noiseBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
    const noiseSamples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseLength; index += 1) {
      noiseSamples[index] = (Math.random() * 2 - 1) * (1 - index / noiseLength);
    }

    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(900, startTime);
    noiseGain.gain.setValueAtTime(0.025, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(startTime);
    noise.stop(startTime + 0.06);
  }

  brand.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const mark = brand.querySelector('.brand-mark');
    mark.querySelectorAll('.brand-spark').forEach((spark) => spark.remove());
    const sparkColors = ['#fff0a8', '#a9e3ff'];
    for (let index = 0; index < 10; index += 1) {
      const spark = document.createElement('span');
      spark.className = 'brand-spark';
      spark.style.setProperty('--spark-angle', `${index * 36}deg`);
      spark.style.setProperty('--spark-distance', `${18 + (index % 3) * 5}px`);
      spark.style.setProperty('--spark-color', sparkColors[index % sparkColors.length]);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
      mark.append(spark);
    }
    playSparkSound();
  });

  brand.addEventListener('dblclick', (event) => {
    event.preventDefault();
    window.location.assign('./circuit-game.html');
  });
})();
