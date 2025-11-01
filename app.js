// app.js - prototipo
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');

let micStream = null;
let audioContext = null;
let analyser = null;
let raf = null;
let isListening = false;

// Soglia rilevamento
let consecutive = 0;
const ENERGY_THRESHOLD = 0.02; // da tarare
const REQUIRED_FRAMES = 3;

async function startListening() {
  const userEmail = document.getElementById('userEmail').value.trim();
  if (!userEmail) {
    alert('Inserisci una email valida!');
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = 'Stato: ascolto attivo';

    monitorLoop();
  } catch (err) {
    console.error(err);
    alert('Permesso microfono richiesto o errore: ' + err.message);
  }
}

function stopListening() {
  isListening = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  status.textContent = 'Stato: fermo';
  if (raf) cancelAnimationFrame(raf);
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

function monitorLoop() {
  if (!analyser || !isListening) return;

  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i] * buf[i];
  }
  const rms = Math.sqrt(sum / buf.length);

  if (rms > ENERGY_THRESHOLD) {
    consecutive++;
    if (consecutive >= REQUIRED_FRAMES) {
      console.log('Suono rilevato! RMS:', rms);
      sendAlert({ type: 'sound', rms: rms, timestamp: Date.now() });
      consecutive = 0;
    }
  } else {
    consecutive = 0;
  }

  raf = requestAnimationFrame(monitorLoop);
}

async function sendAlert(payload) {
  const userEmail = document.getElementById('userEmail').value.trim();
  payload.userEmail = userEmail;

  status.textContent = 'Stato: inviando alert...';
  try {
    await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    status.textContent = 'Stato: alert inviato';
  } catch (e) {
    console.error('Errore invio alert', e);
    status.textContent = 'Stato: errore invio alert';
  }
  setTimeout(() => status.textContent = 'Stato: ascolto attivo', 1500);
}

startBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);
