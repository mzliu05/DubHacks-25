<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Record Button Demo</title>
  <style>
    :root { --bg:#0b0e14; --panel:#141a25; --text:#e6edf3; --muted:#98a2b3; --accent:#4f46e5; --danger:#ef4444; --ok:#10b981; }
    html, body { height: 100%; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: var(--bg); color: var(--text); display: grid; place-items: center; }
    .card { width: min(720px, 92vw); background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .stack { display: grid; gap: 8px; }
    button { appearance: none; border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 600; cursor: pointer; color: white; transition: transform .06s ease, filter .2s ease; }
    button:active { transform: translateY(1px); }
    #recordBtn { background: linear-gradient(135deg, var(--accent), #7c3aed); }
    #stopBtn { background: linear-gradient(135deg, var(--danger), #f97316); display:none; }
    #pauseBtn { background: linear-gradient(135deg, #06b6d4, #3b82f6); display:none; }
    .pill { font-size: 12px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; color: var(--muted); display:inline-flex; align-items:center; gap:8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); display:inline-block; }
    .dot.live { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.2); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1);} 100% { transform: scale(1);} }
    .meter-wrap { background: var(--panel); border-radius: 10px; padding: 10px; border: 1px solid rgba(255,255,255,0.06); }
    .hint { color: var(--muted); font-size: 13px; }
    a.button-link { color: white; text-decoration: none; }
    #downloadLink { display:none; }
    audio { width: 100%; margin-top: 10px; }
    canvas { width: 100%; height: 56px; background: #0f1320; border-radius: 8px; display:block; }
    .grid { display: grid; gap: 14px; }
    .grid-2 { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; }
    @media (max-width: 640px){ .grid-2 { grid-template-columns: 1fr; } }
    .toggle { margin-left: auto; display:flex; align-items:center; gap:8px; font-size:12px; color: var(--muted);} 
  .switch { position: relative; width: 42px; height: 24px; background: #111827; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer; }
  .knob { position:absolute; top:2px; left:2px; width:20px; height:20px; background:#374151; border-radius:50%; transition: left .2s ease, background .2s ease; }
  .switch.active .knob { left:20px; background:#16a34a; }
  </style>
</head>
<body>
  <div class="card grid">
    <h1 style="margin: 0; font-size: 22px;">🎙️ Record Button</h1>
    <div class="row">
      <button id="recordBtn">Start Recording</button>
      <button id="pauseBtn">Pause</button>
      <button id="stopBtn">Stop</button>
      <span class="pill"><span id="statusDot" class="dot"></span><span id="statusText">Idle</span></span>
      $1
      <div class="toggle" title="Synthetic tone so you can test without a microphone or permissions.">
        <div>Demo audio</div>
        <div id="demoSwitch" class="switch"><div class="knob"></div></div>
      </div>

    <div class="meter-wrap stack">
      <strong style="font-size:14px;">Input level</strong>
      <canvas id="vu" width="600" height="56" aria-label="Volume meter"></canvas>
    </div>

    <div class="grid-2">
      <div class="stack">
        <strong style="font-size:14px;">Playback</strong>
        <audio id="player" controls></audio>
        <div class="row">
          <a id="downloadLink" class="button-link pill" download="recording.webm">⬇️ Download</a>
          <span id="size" class="hint"></span>
        </div>
      </div>

      <div class="stack">
        <strong style="font-size:14px;">Debug</strong>
        <div id="debug" class="hint"></div>
      </div>
    </div>
    <div class="hint">Works on secure origins (https or localhost). Uses <code>getUserMedia</code> + <code>MediaRecorder</code>. If your browser lacks <code>MediaRecorder</code>, you’ll see a helpful error.
    </div>
  </div>

<script>
(async function(){
  const els = {
    recordBtn: document.getElementById('recordBtn'),
    stopBtn: document.getElementById('stopBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    elapsed: document.getElementById('elapsed'),
    player: document.getElementById('player'),
    downloadLink: document.getElementById('downloadLink'),
    size: document.getElementById('size'),
    debug: document.getElementById('debug'),
    vu: document.getElementById('vu'),
  };

  const supportsMediaRecorder = 'MediaRecorder' in window;
  let useDemo = false;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    fail("Your browser doesn't support getUserMedia(). Try a modern Chromium, Firefox, or Safari.");
    return;
  }

  let stream, recorder, chunks = [], startAt = 0, timer, paused = false, audioCtx, analyser, source, rafId;
  let mimeType = pickMimeType();

  // Ask for microphone access up front, so the first click is snappy.
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }, video: false });
  } catch (err){
    warn('Microphone permission denied or unavailable. Switching to Demo Audio.');
    await enableDemoAudio();
  }

  // Setup VU meter if we have a mic stream; otherwise demo mode will start its own meter.
  if (stream && stream.getAudioTracks && stream.getAudioTracks().length) setupMeter(stream);

  // Wire up buttons
  els.recordBtn.addEventListener('click', onRecordClick);
  els.stopBtn.addEventListener('click', stopRecording);
  els.pauseBtn.addEventListener('click', togglePause);
  const demoSwitch = document.getElementById('demoSwitch');
  demoSwitch.addEventListener('click', async ()=>{
    useDemo = !useDemo;
    demoSwitch.classList.toggle('active', useDemo);
    if (useDemo) await enableDemoAudio();
    else await enableMicAudio();
  });

  function onRecordClick(){
    if (!supportsMediaRecorder){
      fail('MediaRecorder is not supported in this browser. Consider using a recorder polyfill or a different browser.');
      return;
    }
    if (recorder && recorder.state === 'recording'){
      // Already recording -> toggle pause for convenience
      togglePause();
      return;
    }
    startRecording();
  }

  function startRecording(){
    if (!stream) { enableDemoAudio(); }

    try {
      chunks = [];
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (err){
      // Fallback: try without specifying mimeType
      try { recorder = new MediaRecorder(stream); mimeType = recorder.mimeType || mimeType; }
      catch (e2) { fail('Unable to start MediaRecorder: ' + e2.message); return; }
    }

    recorder.ondataavailable = (e)=>{ if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstart = ()=>{
      setLive(true);
      startTimer();
      els.recordBtn.textContent = 'Recording…';
      els.pauseBtn.style.display = '';
      els.stopBtn.style.display = '';
    };
    recorder.onpause = ()=>{ setStatus('Paused'); els.statusDot.classList.remove('live'); };
    recorder.onresume = ()=>{ setLive(true); };
    recorder.onerror = (e)=> fail('Recorder error: ' + e.error?.message || e.message || e);
    recorder.onstop = onStop;

    recorder.start(250); // request data every 250ms
  }

  function togglePause(){
    if (!recorder) return;
    if (recorder.state === 'paused'){ recorder.resume(); paused = false; }
    else if (recorder.state === 'recording'){ recorder.pause(); paused = true; }
  }

  function stopRecording(){
    if (!recorder) return;
    try { recorder.stop(); } catch {}
  }

  function onStop(){
    stopTimer();
    setLive(false);
    els.recordBtn.textContent = 'Start Recording';
    els.pauseBtn.style.display = 'none';
    els.stopBtn.style.display = 'none';

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    els.player.src = url;

    const ext = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('webm') ? 'webm' : 'ogg');
    els.downloadLink.download = `recording.${ext}`;
    els.downloadLink.href = url;
    els.downloadLink.style.display = '';
    els.size.textContent = formatSize(blob.size);
  }

  function setupMeter(stream){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    if (rafId) cancelAnimationFrame(rafId);
    drawMeter();
  }

  function drawMeter(){
    const canvas = els.vu, ctx = canvas.getContext('2d');
    const data = new Uint8Array(analyser.fftSize);

    function frame(){
      analyser.getByteTimeDomainData(data);
      // Compute peak amplitude from time-domain data
      let peak = 0;
      for (let i=0;i<data.length;i++){
        const v = (data[i]-128)/128; // [-1,1]
        const a = Math.abs(v);
        if (a>peak) peak=a;
      }
      const pct = Math.min(1, peak * 1.4);

      // Draw
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const w = canvas.width - 16;
      const h = canvas.height - 16;
      const x = 8, y = 8;
      ctx.globalAlpha = 1;
      // track
      ctx.fillStyle = '#111827';
      ctx.fillRect(x,y,w,h);
      // bar
      ctx.fillStyle = '#22c55e';
      if (pct > 0.75) ctx.fillStyle = '#f59e0b';
      if (pct > 0.9) ctx.fillStyle = '#ef4444';
      ctx.fillRect(x,y, w*pct, h);

      // grid overlay
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#ffffff';
      const steps = 10;
      for (let i=1; i<steps; i++){
        const gx = x + (w/steps)*i;
        ctx.beginPath(); ctx.moveTo(gx,y); ctx.lineTo(gx,y+h); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }
    frame();
  }

  function startTimer(){
    startAt = performance.now();
    clearInterval(timer);
    timer = setInterval(()=>{
      const ms = (paused ? startAt : performance.now()) - startAt;
      els.elapsed.textContent = formatTime(ms/1000);
    }, 200);
  }

  function stopTimer(){
    clearInterval(timer);
  }

  function setLive(live){
    if (live){
      els.statusText.textContent = 'Recording';
      els.statusDot.classList.add('live');
    } else {
      els.statusText.textContent = 'Idle';
      els.statusDot.classList.remove('live');
    }
  }

  function setStatus(text){ els.statusText.textContent = text; }

  function formatTime(s){
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }
  function formatSize(bytes){
    if (bytes < 1024) return bytes + ' B';
    const u = ['KB','MB','GB'];
    let i = -1; do { bytes/=1024; i++; } while (bytes>=1024 && i<u.length-1);
    return bytes.toFixed(1) + ' ' + u[i];
  }

  function pickMimeType(){
    // Prefer WebM Opus; Safari often supports audio/mp4
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    if (!('MediaRecorder' in window)) return 'audio/webm';
    for (const type of candidates){ if (MediaRecorder.isTypeSupported(type)) return type; }
    return '';
  }

  function fail(msg){
    console.error(msg);
    els.debug.innerText = msg;
    els.recordBtn.disabled = true;
    els.recordBtn.style.filter = 'grayscale(1)';
    els.statusText.textContent = 'Unavailable';
  }
  function warn(msg){
    console.warn(msg);
    els.debug.innerText = msg;
  }
  async function enableMicAudio(){
    try {
      if (stream) stream.getTracks().forEach(t=>t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }, video:false });
      setupMeter(stream);
      setStatus('Mic ready');
    } catch (e){ warn('Could not access mic: ' + e.message); await enableDemoAudio(); }
  }
  async function enableDemoAudio(){
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 220;
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain).connect(gain.gain);
    osc.connect(gain);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    gain.connect(analyser);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    try { osc.start(); lfo.start(); } catch {}
    stream = dest.stream;
    if (rafId) cancelAnimationFrame(rafId);
    drawMeter();
    setStatus('Demo audio ready');
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', ()=>{
    if (rafId) cancelAnimationFrame(rafId);
    if (recorder && recorder.state !== 'inactive') try { recorder.stop(); } catch {}
    if (stream) stream.getTracks().forEach(t=>t.stop());
    if (audioCtx) audioCtx.close();
  });
})();
</script>
</body>
</html>
