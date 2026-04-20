const audioFileInput   = document.getElementById('audioFileInput');
const fileLabel        = document.getElementById('fileLabel');
const trackTitle       = document.getElementById('trackTitle');
const trackStatus      = document.getElementById('trackStatus');
const playerContainer  = document.getElementById('playerContainer');

const canvas           = document.getElementById('visualizer');
const canvasCtx        = canvas.getContext('2d');

const progressBar      = document.getElementById('progressBar');
const progressFill     = document.getElementById('progressFill');
const currentTimeEl    = document.getElementById('currentTime');
const totalTimeEl      = document.getElementById('totalTime');

const btnPlayPause     = document.getElementById('btnPlayPause');
const iconPlay         = document.getElementById('iconPlay');
const iconPause        = document.getElementById('iconPause');

const btnSkipBack      = document.getElementById('btnSkipBack');
const btnSkipForward   = document.getElementById('btnSkipForward');
const btnLoop          = document.getElementById('btnLoop');
const btnMute          = document.getElementById('btnMute');
const iconVolumeOn     = document.getElementById('iconVolumeOn');
const iconVolumeOff    = document.getElementById('iconVolumeOff');

const volumeSlider     = document.getElementById('volumeSlider');
const volumeLabel      = document.getElementById('volumeLabel');
const btnVolDown       = document.getElementById('btnVolDown');
const btnVolUp         = document.getElementById('btnVolUp');

const speedButtons     = document.querySelectorAll('.speed-btn');
const toastEl          = document.getElementById('toast');

// ---------- AUDIO SETUP ----------
const audio = new Audio();
audio.volume = 0.8;
audio.preload = 'metadata';

let audioCtx, analyser, source, dataArray, bufferLength;
let audioContextInitialised = false;
let isPlaying = false;
let isMuted = false;
let isLooping = false;
let previousVolume = 0.8;
let animationFrameId = null;

// ---------- WEB AUDIO API — VISUALIZER SETUP ----------
function initAudioContext() {
    if (audioContextInitialised) return;
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    source    = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    audioContextInitialised = true;
}

// ---------- VISUALIZER DRAW LOOP ----------
function drawVisualizer() {
    animationFrameId = requestAnimationFrame(drawVisualizer);

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width  = rect.width;
        canvas.height = rect.height;
    }

    const W = canvas.width;
    const H = canvas.height;

    canvasCtx.clearRect(0, 0, W, H);

    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    const barCount = bufferLength;
    const barWidth = (W / barCount) * 1.1;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * H * 0.92;

        const hue = (i / barCount) * 30 + 150;
        const lightness = 18 + (value / 255) * 20;
        canvasCtx.fillStyle = `hsl(${hue}, 55%, ${lightness}%)`;

        const r = barWidth / 2;
        const bx = x;
        const by = H - barHeight;
        canvasCtx.beginPath();
        canvasCtx.moveTo(bx + r, by);
        canvasCtx.arcTo(bx + barWidth, by, bx + barWidth, by + barHeight, r);
        canvasCtx.lineTo(bx + barWidth, H);
        canvasCtx.lineTo(bx, H);
        canvasCtx.arcTo(bx, by, bx + r, by, r);
        canvasCtx.closePath();
        canvasCtx.fill();

        x += barWidth + 1.5;
    }
}

// ---------- HELPERS ----------
function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

let toastTimer = null;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function updatePlayPauseUI() {
    if (isPlaying) {
        iconPlay.style.display  = 'none';
        iconPause.style.display = 'block';
        btnPlayPause.setAttribute('data-tooltip', 'Pause [Space]');
        btnPlayPause.classList.add('pulsing');
        playerContainer.classList.add('playing');
        trackStatus.textContent = 'Now playing';
    } else {
        iconPlay.style.display  = 'block';
        iconPause.style.display = 'none';
        btnPlayPause.setAttribute('data-tooltip', 'Play [Space]');
        btnPlayPause.classList.remove('pulsing');
        playerContainer.classList.remove('playing');
        trackStatus.textContent = 'Paused';
    }
}

function updateVolumeUI() {
    const vol = Math.round(audio.volume * 100);
    volumeSlider.value = vol;
    volumeLabel.textContent = vol + '%';
    volumeSlider.style.background = `linear-gradient(90deg, var(--accent-secondary) ${vol}%, rgba(255,255,255,0.08) ${vol}%)`;
}

function updateMuteUI() {
    if (isMuted) {
        iconVolumeOn.style.display  = 'none';
        iconVolumeOff.style.display = 'block';
        btnMute.classList.add('active');
    } else {
        iconVolumeOn.style.display  = 'block';
        iconVolumeOff.style.display = 'none';
        btnMute.classList.remove('active');
    }
}

// ---------- FILE LOADING ----------
audioFileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.load();

    const name = file.name.replace(/\.[^.]+$/, '');
    trackTitle.textContent = name;
    trackStatus.textContent = 'Ready';
    fileLabel.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
        Change File`;

    showToast('🎵 Loaded: ' + name);
});

// ---------- PLAY / PAUSE ----------
function togglePlay() {
    if (!audio.src) { showToast('Load an audio file first'); return; }
    initAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
}

audio.addEventListener('play', () => { isPlaying = true; updatePlayPauseUI(); drawVisualizer(); });
audio.addEventListener('pause', () => { isPlaying = false; updatePlayPauseUI(); });
audio.addEventListener('ended', () => {
    if (!isLooping) {
        isPlaying = false;
        updatePlayPauseUI();
        cancelAnimationFrame(animationFrameId);
    }
});

btnPlayPause.addEventListener('click', togglePlay);

// ---------- TIME UPDATE & PROGRESS ----------
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audio.duration);
});

// ---------- SEEK (click on progress bar) ----------
progressBar.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
});

// ---------- SKIP FORWARD / BACKWARD ----------
btnSkipBack.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
    showToast('⏪ −10s');
});

btnSkipForward.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    showToast('⏩ +10s');
});

// ---------- LOOP ----------
btnLoop.addEventListener('click', () => {
    isLooping = !isLooping;
    audio.loop = isLooping;
    btnLoop.classList.toggle('active', isLooping);
    showToast(isLooping ? '🔁 Loop ON' : '➡️ Loop OFF');
});

// ---------- MUTE / UNMUTE ----------
function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        previousVolume = audio.volume;
        audio.volume = 0;
    } else {
        audio.volume = previousVolume;
    }
    audio.muted = isMuted;
    updateMuteUI();
    updateVolumeUI();
    showToast(isMuted ? '🔇 Muted' : '🔊 Unmuted');
}

btnMute.addEventListener('click', toggleMute);

// ---------- VOLUME SLIDER ----------
volumeSlider.addEventListener('input', () => {
    const vol = volumeSlider.value / 100;
    audio.volume = vol;
    if (isMuted && vol > 0) {
        isMuted = false;
        audio.muted = false;
        updateMuteUI();
    }
    updateVolumeUI();
});

btnVolDown.addEventListener('click', () => {
    audio.volume = Math.max(0, audio.volume - 0.1);
    if (isMuted) { isMuted = false; audio.muted = false; updateMuteUI(); }
    updateVolumeUI();
});

btnVolUp.addEventListener('click', () => {
    audio.volume = Math.min(1, audio.volume + 0.1);
    if (isMuted) { isMuted = false; audio.muted = false; updateMuteUI(); }
    updateVolumeUI();
});

updateVolumeUI();

// ---------- PLAYBACK SPEED ----------
speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        audio.playbackRate = speed;
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showToast(`⚡ Speed: ${speed}×`);
    });
});

// ---------- KEYBOARD CONTROLS ----------
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            audio.currentTime = Math.max(0, audio.currentTime - 10);
            showToast('⏪ −10s');
            break;
        case 'ArrowRight':
            e.preventDefault();
            audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            showToast('⏩ +10s');
            break;
        case 'ArrowUp':
            e.preventDefault();
            audio.volume = Math.min(1, audio.volume + 0.05);
            if (isMuted) { isMuted = false; audio.muted = false; updateMuteUI(); }
            updateVolumeUI();
            showToast(`🔊 Volume: ${Math.round(audio.volume * 100)}%`);
            break;
        case 'ArrowDown':
            e.preventDefault();
            audio.volume = Math.max(0, audio.volume - 0.05);
            updateVolumeUI();
            showToast(`🔉 Volume: ${Math.round(audio.volume * 100)}%`);
            break;
        case 'KeyM':
            toggleMute();
            break;
        case 'KeyL':
            btnLoop.click();
            break;
    }
});

// ---------- IDLE VISUALIZER (draws soft idle bars when not playing) ----------
function drawIdleVisualizer() {
    if (isPlaying) return;  

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width  = rect.width;
        canvas.height = rect.height;
    }

    const W = canvas.width;
    const H = canvas.height;
    const time = performance.now() / 1000;
    const barCount = 64;
    const barWidth = (W / barCount) * 1.1;

    canvasCtx.clearRect(0, 0, W, H);

    let x = 0;
    for (let i = 0; i < barCount; i++) {
        const value = (Math.sin(time * 1.5 + i * 0.25) + 1) / 2;
        const barHeight = value * H * 0.25 + 3;
        const hue = (i / barCount) * 30 + 150;
        canvasCtx.fillStyle = `hsla(${hue}, 40%, 22%, 0.3)`;

        const r = barWidth / 2;
        const bx = x;
        const by = H - barHeight;
        canvasCtx.beginPath();
        canvasCtx.moveTo(bx + r, by);
        canvasCtx.arcTo(bx + barWidth, by, bx + barWidth, by + barHeight, r);
        canvasCtx.lineTo(bx + barWidth, H);
        canvasCtx.lineTo(bx, H);
        canvasCtx.arcTo(bx, by, bx + r, by, r);
        canvasCtx.closePath();
        canvasCtx.fill();

        x += barWidth + 1.5;
    }

    requestAnimationFrame(drawIdleVisualizer);
}

drawIdleVisualizer();
