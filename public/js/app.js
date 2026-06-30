
const LS = {
  get: (k, d = null) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

const State = {
  user: LS.get('user'),
  token: LS.get('token'),
  history: LS.get('history', []),
  settings: LS.get('settings', { 
    theme: '',
    darkMode: true,
    fontSize: 'normal',
    cameraDevice: '',
    micDevice: '',
    sensitivity: false,
    name: '',
    email: ''
  }),
  learn: LS.get('learn', { xp: 0, level: 1, lessonsDone: [] }),
  finalText: '',
  camStream: null,
  signInterval: null,
  handsDetector: null,
  camera: null,
  lastFrameTime: 0,
  frameCount: 0,
  lastFpsUpdate: 0,
  originalSettings: null // To track changes
};

function save() {
  LS.set('user', State.user);
  LS.set('token', State.token);
  LS.set('history', State.history);
  LS.set('settings', State.settings);
  LS.set('learn', State.learn);
}

// ------------------------------
// Settings Page Logic
// ------------------------------

// Initialize Settings
function initSettings() {
  // Load user info into profile
  if (State.user) {
    State.settings.name = State.user.name || '';
    State.settings.email = State.user.email || '';
  }

  // Store original for change tracking
  State.originalSettings = JSON.parse(JSON.stringify(State.settings));

  // Set initial values
  document.getElementById('settingsName').value = State.settings.name;
  document.getElementById('settingsEmail').value = State.settings.email;
  document.getElementById('settingsDarkMode').checked = State.settings.darkMode;
  document.getElementById('settingsFontSize').value = State.settings.fontSize;
  document.getElementById('settingsSensitivity').checked = State.settings.sensitivity;
  document.getElementById('themeSel').value = State.settings.theme;

  // Apply font size
  applyFontSize();

  // Load devices
  loadMediaDevices();

  // Add event listeners for change tracking
  addSettingsListeners();
}

// Add listeners to track changes
function addSettingsListeners() {
  const settingsInputs = [
    'settingsName', 'settingsEmail', 'settingsDarkMode',
    'settingsFontSize', 'settingsCamera', 'settingsMic', 'settingsSensitivity', 'themeSel'
  ];

  settingsInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', checkSettingsChanges);
      el.addEventListener('change', checkSettingsChanges);
    }
  });
}

// Check if settings have changed
function checkSettingsChanges() {
  const current = {
    name: document.getElementById('settingsName').value,
    email: document.getElementById('settingsEmail').value,
    darkMode: document.getElementById('settingsDarkMode').checked,
    fontSize: document.getElementById('settingsFontSize').value,
    cameraDevice: document.getElementById('settingsCamera').value,
    micDevice: document.getElementById('settingsMic').value,
    sensitivity: document.getElementById('settingsSensitivity').checked,
    theme: document.getElementById('themeSel').value
  };

  const hasChanges = JSON.stringify(current) !== JSON.stringify(State.originalSettings);
  document.getElementById('saveSettingsBtn').disabled = !hasChanges;

  // Apply dark mode and font size immediately
  if (current.darkMode !== State.settings.darkMode) {
    State.settings.darkMode = current.darkMode;
    applyDarkMode();
  }
  if (current.fontSize !== State.settings.fontSize) {
    State.settings.fontSize = current.fontSize;
    applyFontSize();
  }
  if (current.theme !== State.settings.theme) {
    changeTheme(current.theme);
  }
}

// Apply dark mode
function applyDarkMode() {
  // Our app is always dark, but you can toggle light mode if needed
  document.body.classList.toggle('light-mode', !State.settings.darkMode);
}

// Apply font size
function applyFontSize() {
  document.body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'font-size-xlarge');
  document.body.classList.add(`font-size-${State.settings.fontSize}`);
}

// Load media devices
async function loadMediaDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const cameraSelect = document.getElementById('settingsCamera');
    const micSelect = document.getElementById('settingsMic');
    
    // Clear and add options
    cameraSelect.innerHTML = '<option value="">Pilih Kamera</option>';
    micSelect.innerHTML = '<option value="">Pilih Mikrofon</option>';
    
    devices.forEach(device => {
      if (device.kind === 'videoinput') {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Kamera ${cameraSelect.options.length}`;
        cameraSelect.appendChild(option);
      }
      if (device.kind === 'audioinput') {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Mikrofon ${micSelect.options.length}`;
        micSelect.appendChild(option);
      }
    });

    // Select saved device
    if (State.settings.cameraDevice) {
      cameraSelect.value = State.settings.cameraDevice;
    }
    if (State.settings.micDevice) {
      micSelect.value = State.settings.micDevice;
    }
  } catch (err) {
    console.error('Error loading media devices:', err);
  }
}

// Settings Tab Navigation
function setupSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab');
  const panels = document.querySelectorAll('.settings-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const tabId = tab.dataset.tab;
      document.getElementById(`panel-${tabId}`).classList.add('active');
    });
  });
}

// Save Settings
function saveSettings() {
  // Update state
  State.settings.name = document.getElementById('settingsName').value;
  State.settings.email = document.getElementById('settingsEmail').value;
  State.settings.darkMode = document.getElementById('settingsDarkMode').checked;
  State.settings.fontSize = document.getElementById('settingsFontSize').value;
  State.settings.cameraDevice = document.getElementById('settingsCamera').value;
  State.settings.micDevice = document.getElementById('settingsMic').value;
  State.settings.sensitivity = document.getElementById('settingsSensitivity').checked;
  State.settings.theme = document.getElementById('themeSel').value;

  // Update user if logged in
  if (State.user) {
    State.user.name = State.settings.name;
    State.user.email = State.settings.email;
    updateUserUI();
  }

  // Save to localStorage
  save();

  // Update original
  State.originalSettings = JSON.parse(JSON.stringify(State.settings));
  document.getElementById('saveSettingsBtn').disabled = true;

  toast('Pengaturan berhasil disimpan!', 'success');
}

// Reset Settings
function resetSettings() {
  if (confirm('Yakin ingin mereset semua pengaturan ke default?')) {
    State.settings = {
      theme: '',
      darkMode: true,
      fontSize: 'normal',
      cameraDevice: '',
      micDevice: '',
      sensitivity: false,
      name: State.user ? State.user.name : '',
      email: State.user ? State.user.email : ''
    };
    
    save();
    initSettings();
    checkSettingsChanges();
    toast('Pengaturan berhasil direset!', 'info');
  }
}

// Change Password
function changePassword() {
  const oldPass = document.getElementById('settingsOldPass').value;
  const newPass = document.getElementById('settingsNewPass').value;
  const confirmPass = document.getElementById('settingsConfirmPass').value;

  if (!oldPass || !newPass || !confirmPass) {
    toast('Harap isi semua kolom password!', 'error');
    return;
  }

  if (newPass !== confirmPass) {
    toast('Password baru dan konfirmasi tidak cocok!', 'error');
    return;
  }

  if (newPass.length < 6) {
    toast('Password baru minimal 6 karakter!', 'error');
    return;
  }

  // Here you would send to backend
  toast('Password berhasil diubah! (Demo)', 'success');
  
  // Clear fields
  document.getElementById('settingsOldPass').value = '';
  document.getElementById('settingsNewPass').value = '';
  document.getElementById('settingsConfirmPass').value = '';
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const icon =
    type === 'success' ? 'ti-circle-check' :
    type === 'error' ? 'ti-alert-circle' :
    type === 'warn' ? 'ti-alert-triangle' : 'ti-info-circle';
  t.innerHTML = `<i class="ti ${icon}"></i><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOut .3s forwards';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function go(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const titles = {
    dashboard: 'Dashboard',
    speech: 'Mode Suara',
    camera: 'Mode Kamera',
    learn: 'Belajar Isyarat',
    quiz: 'Quiz Center',
    tts: 'Text To Speech',
    history: 'Riwayat',
    settings: 'Pengaturan'
  };
  document.getElementById('pageTitle').textContent = titles[page] || '';
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'dashboard') renderDashboard();
  if (page === 'learn') renderLearn();
  if (page === 'history') renderHistory();
}

document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => go(n.dataset.page)));

// Access control check on init
function checkAuth() {
  if (State.user) {
    document.getElementById('loginOverlay').classList.add('hide');
  } else {
    document.getElementById('loginOverlay').classList.remove('hide');
  }
}

// Switch between login and register forms
document.getElementById('switchToRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
});

document.getElementById('switchToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
});

// Login form submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      State.user = data.user;
      State.token = data.token;
      save();
      updateUserUI();
      document.getElementById('loginOverlay').classList.add('hide');
      toast('Login berhasil!', 'success');
    } else {
      toast(data.message, 'error');
    }
  } catch (err) {
    toast('Server error, menggunakan mode offline.', 'warn');
    State.user = { id: Date.now(), name: email.split('@')[0], email };
    State.token = null;
    save();
    updateUserUI();
    document.getElementById('loginOverlay').classList.add('hide');
  }
});

// Register form submit
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  try {
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    toast('Registrasi berhasil! Silakan login.', 'success');
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  } catch (err) {
    toast('Server error, silakan coba lagi.', 'error');
  }
});

// Logout function (for user card)
function logout() {
  State.user = null;
  State.token = null;
  save();
  updateUserUI();
  document.getElementById('loginOverlay').classList.remove('hide');
  toast('Logout berhasil!', 'success');
}

// Update user card click to allow logout if logged in
document.querySelector('.user-card').addEventListener('click', () => {
  if (State.user) {
    if (confirm('Apakah Anda ingin logout?')) {
      logout();
    }
  }
});

function updateUserUI() {
  const u = State.user;
  document.getElementById('userName').textContent = u ? u.name : 'Guest User';
  document.getElementById('userAvatar').textContent = (u ? u.name[0] : 'G').toUpperCase();
  document.getElementById('userStatus').textContent = u ? 'Online' : 'Klik untuk Login';
  document.getElementById('loginDot').classList.toggle('on', !!u);
}

function renderDashboard() {
  document.getElementById('statTrans').textContent = State.history.length;
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let recActive = false;

document.getElementById('micBtn').addEventListener('click', () => {
  if (recActive) {
    stopRec();
  } else {
    startRec();
  }
});

function startRec() {
  if (!SR) {
    toast('Browser tidak mendukung Speech Recognition', 'error');
    return;
  }
  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = document.getElementById('speechLang').value;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        State.finalText += res[0].transcript + ' ';
      } else {
        interim += res[0].transcript;
      }
    }
    const el = document.getElementById('speechOut');
    el.classList.remove('empty');
    el.innerHTML = State.finalText + (interim ? `<span class="interim">${interim}</span>` : '');
  };
  rec.onerror = (e) => { toast('Error: ' + e.error, 'error'); stopRec(); };
  rec.onend = () => { if (recActive) try { rec.start(); } catch {} };
  rec.start();
  recActive = true;
  document.getElementById('micBtn').classList.add('recording');
  document.getElementById('micStatus').textContent = 'Mendengarkan...';
  toast('Mulai merekam', 'success');
}

function stopRec() {
  if (rec) try { rec.stop(); } catch {}
  recActive = false;
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('micStatus').textContent = 'Klik mic untuk berbicara';
}

async function startCam() {
  try {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('handCanvas');
    const camBox = document.getElementById('camBox');
    const camTxt = document.getElementById('camTxt');
    const camOverlay = document.getElementById('camOverlay');

    State.camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    webcam.srcObject = State.camStream;
    webcam.style.display = 'block';
    camBox.classList.remove('empty');
    camTxt.style.display = 'none';
    camOverlay.style.display = 'block';

    // Initialize MediaPipe Hands
    if (!State.handsDetector) {
      State.handsDetector = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      State.handsDetector.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      State.handsDetector.onResults(onHandResults);
    }

    // Initialize Camera
    if (!State.camera) {
      State.camera = new Camera(webcam, {
        onFrame: async () => {
          await State.handsDetector.send({ image: webcam });
        },
        width: 1280,
        height: 720
      });
    }

    State.camera.start();
    State.lastFpsUpdate = performance.now();
    State.frameCount = 0;

    toast('Kamera & Deteksi Aktif', 'success');

    // Add event listeners for buttons
    document.getElementById('btnCamStart').onclick = null;
    document.getElementById('btnCamStop').onclick = stopCam;

  } catch (e) {
    toast('Gagal akses kamera: ' + e.message, 'error');
    console.error(e);
  }
}

function onHandResults(results) {
  const canvas = document.getElementById('handCanvas');
  const canvasCtx = canvas.getContext('2d');
  const webcam = document.getElementById('webcam');

  // Update canvas size
  canvas.width = webcam.videoWidth;
  canvas.height = webcam.videoHeight;

  // Clear canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCtx.translate(canvas.width, 0);
  canvasCtx.scale(-1, 1); // Mirror the canvas

  // Draw video frame
  canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  // Calculate FPS
  const now = performance.now();
  State.frameCount++;
  if (now - State.lastFpsUpdate > 1000) {
    const fps = Math.round(State.frameCount * 1000 / (now - State.lastFpsUpdate));
    document.getElementById('hudFps').textContent = `FPS: ${fps}`;
    State.frameCount = 0;
    State.lastFpsUpdate = now;
  }

  // Process hand landmarks
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const handedness = results.multiHandedness[i];

      // Draw hand landmarks
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

      // Draw bounding box
      const bbox = getBoundingBox(landmarks);
      drawBoundingBox(canvasCtx, bbox, handedness.label);

      // Classify the hand gesture (async)
      classifyGesture(landmarks).then(gesture => {
        if (gesture) {
          updateDetectionResult(gesture);
        }
      });
    }
  } else {
    // No hands detected
    document.getElementById('aiResult').classList.add('empty');
    document.getElementById('aiResult').textContent = 'Arahkan isyarat tangan ke kamera';
    document.getElementById('signDetailPanel').style.display = 'none';
  }

  canvasCtx.restore();
}

function getBoundingBox(landmarks) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function drawBoundingBox(ctx, bbox, label) {
  const canvas = ctx.canvas;
  const x = bbox.x * canvas.width;
  const y = bbox.y * canvas.height;
  const w = bbox.width * canvas.width;
  const h = bbox.height * canvas.height;
  const padding = 20;

  // Draw glowing box
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - padding, y - padding, w + padding * 2, h + padding * 2);
  ctx.shadowBlur = 0;

  // Draw label
  ctx.font = 'bold 16px Inter';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(label, x - padding, y - padding - 10);
}

async function classifyGesture(landmarks) {
  // Daftar gesture SIBI yang didukung
  const sibiLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Halo'];

  // Logika deteksi sederhana (placeholder untuk model TensorFlow.js nanti)
  const fingers = [
    { tip: landmarks[4], pip: landmarks[3], mcp: landmarks[2], name: 'thumb' },
    { tip: landmarks[8], pip: landmarks[6], mcp: landmarks[5], name: 'index' },
    { tip: landmarks[12], pip: landmarks[10], mcp: landmarks[9], name: 'middle' },
    { tip: landmarks[16], pip: landmarks[14], mcp: landmarks[13], name: 'ring' },
    { tip: landmarks[20], pip: landmarks[18], mcp: landmarks[17], name: 'pinky' }
  ];

  const isFingerUp = (finger) => finger.tip.y < finger.pip.y;
  const up = fingers.map(f => isFingerUp(f));

  const distance = (lm1, lm2) => {
    const dx = lm1.x - lm2.x;
    const dy = lm1.y - lm2.y;
    const dz = lm1.z - lm2.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  };

  const allItems = MODULES.flatMap(m => m.items);
  let prediction = [];

  // A: Kepalan tertutup, jempol tegak di samping
  if (up[0] && !up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'A', probability: 0.92 });
  }
  // B: Telapak terbuka 4 jari rapat, jempol depan
  if (!up[0] && up[1] && up[2] && up[3] && up[4]) {
    prediction.push({ className: 'B', probability: 0.90 });
  }
  // C: Bentuk C dengan ibu jari dan telunjuk
  if (distance(landmarks[4], landmarks[8]) > 0.08 && distance(landmarks[4], landmarks[12]) > 0.1) {
    prediction.push({ className: 'C', probability: 0.85 });
  }
  // D: Telunjuk tegak, yang lain melingkar pegang jempol
  if (up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'D', probability: 0.88 });
  }
  // E: Semua ujung jari sentuh ibu jari (mencubit)
  if (!up[0] && !up[1] && !up[2] && !up[3] && !up[4] && distance(landmarks[4], landmarks[8]) < 0.08) {
    prediction.push({ className: 'E', probability: 0.84 });
  }
  // F: Ujung telunjuk sentuh ujung jempol, 3 jari lain tegak
  if (up[2] && up[3] && up[4] && distance(landmarks[4], landmarks[8]) < 0.06) {
    prediction.push({ className: 'F', probability: 0.91 });
  }
  // G: Kepalan menyamping, telunjuk dan jempol sejajar
  if (up[0] && up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'G', probability: 0.87 });
  }
  // H: Telunjuk dan tengah sejajar ke samping
  if (!up[0] && up[1] && up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'H', probability: 0.86 });
  }
  // I: Kelingking tegak ke atas
  if (!up[0] && !up[1] && !up[2] && !up[3] && up[4]) {
    prediction.push({ className: 'I', probability: 0.90 });
  }
  // J: Mirip I tapi dengan gerakan (untuk saat ini sama dengan I)
  if (!up[0] && !up[1] && !up[2] && !up[3] && up[4]) {
    prediction.push({ className: 'J', probability: 0.88 });
  }
  // K: Jempol di antara telunjuk dan tengah, keduanya buat V
  if (up[1] && up[2] && !up[3] && !up[4] && distance(landmarks[4], landmarks[6]) < 0.12) {
    prediction.push({ className: 'K', probability: 0.83 });
  }
  // P: Mirip K tapi arah tangan ke bawah (placeholder)
  if (up[1] && up[2] && !up[3] && !up[4] && distance(landmarks[4], landmarks[6]) < 0.12) {
    prediction.push({ className: 'P', probability: 0.80 });
  }
  // Q: Mirip G tapi arah tangan ke bawah (placeholder)
  if (up[0] && up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'Q', probability: 0.80 });
  }
  // T: Jempol terselip di antara telunjuk dan tengah yang mengepal (placeholder)
  if (!up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'T', probability: 0.78 });
  }
  // X: Telunjuk menekuk seperti kail (placeholder)
  if (!up[0] && !up[2] && !up[3] && !up[4] && distance(landmarks[8], landmarks[5]) < 0.10) {
    prediction.push({ className: 'X', probability: 0.81 });
  }
  // Z: Mirip I tapi dengan gerakan (placeholder)
  if (up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'Z', probability: 0.80 });
  }
  // L: Telunjuk dan jempol buat sudut siku-siku
  if (up[0] && up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'L', probability: 0.93 });
  }
  // M: Tiga jari (telunjuk, tengah, manis) melipat di atas jempol
  if (!up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'M', probability: 0.81 });
  }
  // N: Dua jari melipat di atas jempol
  if (!up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'N', probability: 0.79 });
  }
  // O: Semua jari melengkung buat lingkaran
  if (!up[0] && !up[1] && !up[2] && !up[3] && !up[4] && distance(landmarks[4], landmarks[20]) < 0.15) {
    prediction.push({ className: 'O', probability: 0.82 });
  }
  // R: Telunjuk dan tengah saling menyilang
  if (up[1] && up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'R', probability: 0.80 });
  }
  // S: Kepalan, jempol di depan telunjuk
  if (!up[0] && !up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'S', probability: 0.78 });
  }
  // U: Telunjuk dan tengah rapat tegak ke atas
  if (up[1] && up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'U', probability: 0.85 });
  }
  // V: Telunjuk dan tengah buat V
  if (up[1] && up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'V', probability: 0.87 });
  }
  // W: Telunjuk, tengah, manis tegak ke atas
  if (up[1] && up[2] && up[3] && !up[4]) {
    prediction.push({ className: 'W', probability: 0.84 });
  }
  // Y: Jempol dan kelingking tegak ke samping
  if (up[0] && !up[1] && !up[2] && !up[3] && up[4]) {
    prediction.push({ className: 'Y', probability: 0.89 });
  }
  // Halo: Lambaikan tangan (telunjuk tegak)
  if (up[1] && !up[2] && !up[3] && !up[4]) {
    prediction.push({ className: 'Halo', probability: 0.80 });
  }

  if (prediction.length === 0) {
    return null;
  }

  let topPrediction = prediction.sort((a, b) => b.probability - a.probability)[0];

  if (topPrediction.probability > 0.75 && sibiLabels.includes(topPrediction.className)) {
    const gesture = allItems.find(item => item.name === topPrediction.className);
    if (gesture) {
      return { ...gesture, confidence: topPrediction.probability };
    }
  }

  return null;
}

function updateDetectionResult(gesture) {
  const aiResult = document.getElementById('aiResult');
  const detailPanel = document.getElementById('signDetailPanel');
  const detailPanelImg = document.getElementById('detailPanelImg');
  const detailPanelTitle = document.getElementById('detailPanelTitle');
  const detailPanelInstruction = document.getElementById('detailPanelInstruction');
  const detailPanelMnemonic = document.getElementById('detailPanelMnemonic');

  aiResult.classList.remove('empty');
  aiResult.innerHTML = `
    <div class="ai-badge" style="position:relative;top:auto;right:auto;display:inline-flex;margin-bottom:8px;">
      <div class="dot"></div>
      ${gesture.name}
    </div>
    <div style="color:var(--muted);font-size:13px;">Akurasi: ${Math.round((gesture.confidence || 0.9) * 100)}%</div>
  `;

  // Find the sign in our modules to show details
  const allItems = MODULES.flatMap(m => m.items.map((it, idx) => ({ ...it, moduleId: m.id, itemIndex: idx })));
  const matchedItem = allItems.find(item => item.name === gesture.name);

  if (matchedItem) {
    const imageUrl = `https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=${encodeURIComponent(matchedItem.imagePrompt)}&image_size=square_hd`;
    detailPanel.style.display = 'block';
    detailPanelImg.src = imageUrl;
    detailPanelTitle.textContent = matchedItem.name;
    detailPanelInstruction.textContent = matchedItem.instruction;
    detailPanelMnemonic.textContent = `Mnemonic: ${matchedItem.mnemonic}`;
  } else {
    detailPanel.style.display = 'none';
  }
}

function stopCam() {
  if (State.camera) {
    State.camera.stop();
  }

  if (State.camStream) {
    State.camStream.getTracks().forEach(t => t.stop());
    State.camStream = null;
  }

  const webcam = document.getElementById('webcam');
  const canvas = document.getElementById('handCanvas');
  const camBox = document.getElementById('camBox');
  const camTxt = document.getElementById('camTxt');
  const camOverlay = document.getElementById('camOverlay');
  const canvasCtx = canvas.getContext('2d');

  webcam.srcObject = null;
  webcam.style.display = 'none';
  camBox.classList.add('empty');
  camTxt.style.display = 'block';
  camOverlay.style.display = 'none';
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById('aiResult').classList.add('empty');
  document.getElementById('aiResult').textContent = 'Arahkan isyarat tangan ke kamera';
  document.getElementById('signDetailPanel').style.display = 'none';

  toast('Kamera dimatikan', 'info');
}

const alphabetData = [
  { id: 'A', instruction: 'Kepalan tangan tertutup, jempol tegak di sisi luar dekat jari telunjuk.', imagePrompt: 'Indonesian Sign Language BISINDO letter A, right hand, closed fist with thumb extended straight up beside index finger, front view, dark neutral background, clear lighting, professional photo', mnemonic: 'A seperti "Aman" dalam kepalan.' },
  { id: 'B', instruction: 'Telapak tangan terbuka ke depan, keempat jari rapat lurus ke atas, jempol terlipat ke dalam menyentuh pangkal jari telunjuk.', imagePrompt: 'BISINDO sign language letter B, right hand, open palm facing forward, four fingers straight up together, thumb tucked into palm, front view, dark neutral background, clear lighting', mnemonic: 'B seperti "Buku" yang terbuka.' },
  { id: 'C', instruction: 'Semua jari dan jempol melengkung membentuk huruf C, telapak tangan menghadap ke depan.', imagePrompt: 'BISINDO letter C, right hand forming a C shape with all fingers and thumb curved, palm facing forward, front view, dark neutral background', mnemonic: 'C seperti "Cangkir" yang bulat.' },
  { id: 'D', instruction: 'Jari telunjuk tegak lurus ke atas, jari tengah, manis, kelingking melipat ke dalam, ujung jari-jari tersebut menyentuh ujung jempol yang juga melipat.', imagePrompt: 'BISINDO letter D, right hand index finger up, other fingertips touching thumb tip, forming D shape, front view', mnemonic: 'D seperti "Dinding" tegak.' },
  { id: 'E', instruction: 'Keempat jari (telunjuk sampai kelingking) melipat ke dalam, ujungnya menyentuh telapak tangan, jempol melipat menutupi depan jari-jari tersebut.', imagePrompt: 'BISINDO letter E, right hand all fingers folded into palm, thumb covering front, front view', mnemonic: 'E seperti "Empat" jari tertutup.' },
  { id: 'F', instruction: 'Ujung jari telunjuk dan jempol bersentuhan membentuk lingkaran kecil, jari tengah, manis, kelingking lurus tegak ke atas.', imagePrompt: 'BISINDO letter F, right hand index and thumb tips touching forming circle, other three fingers straight up, front view', mnemonic: 'F seperti "Fokus" pada lingkaran.' },
  { id: 'G', instruction: 'Tangan mengepal, jari telunjuk dan jempol lurus ke samping (seperti menunjuk ke kiri/kanan), kedua jari tersebut sejajar.', imagePrompt: 'BISINDO letter G, right hand fist with index and thumb extended sideways parallel, front view', mnemonic: 'G seperti "Garis" lurus.' },
  { id: 'H', instruction: 'Jari telunjuk dan tengah lurus ke samping (sejajar), jari manis, kelingking, dan jempol melipat ke dalam.', imagePrompt: 'BISINDO letter H, right hand index and middle fingers extended sideways together, others folded, front view', mnemonic: 'H seperti "Hari" yang cerah.' },
  { id: 'I', instruction: 'Hanya jari kelingking yang lurus tegak ke atas, jari-jari lain dan jempol mengepal.', imagePrompt: 'BISINDO letter I, right hand pinky finger straight up, others in fist, front view', mnemonic: 'I seperti "Ikan" kecil.' },
  { id: 'J', instruction: 'Seperti huruf I, lalu gerakkan kelingking ke bawah melengkung seperti menulis huruf J di udara.', imagePrompt: 'BISINDO letter J, right hand pinky extended then curving down in J motion, front view', mnemonic: 'J seperti "Jalan" melengkung.' },
  { id: 'K', instruction: 'Jari telunjuk dan tengah lurus ke atas membentuk huruf V, jempol terselip di antara kedua jari tersebut.', imagePrompt: 'BISINDO letter K, right hand index and middle fingers up in V, thumb between them, front view', mnemonic: 'K seperti "Kaki" yang berdiri V.' },
  { id: 'L', instruction: 'Jari telunjuk lurus ke atas, jempol lurus ke samping, membentuk sudut siku-siku (huruf L), jari-jari lain mengepal.', imagePrompt: 'BISINDO letter L, right hand index up and thumb out forming L shape, front view', mnemonic: 'L seperti "Lurus" sudut 90.' },
  { id: 'M', instruction: 'Jempol dilipat ke dalam, tiga jari (telunjuk, tengah, manis) melipat di atas jempol, jari kelingking mengepal.', imagePrompt: 'BISINDO letter M, right hand thumb in, three fingers folded over thumb, front view', mnemonic: 'M seperti "Tiga" gunung.' },
  { id: 'N', instruction: 'Jempol dilipat ke dalam, dua jari (telunjuk dan tengah) melipat di atas jempol, jari manis dan kelingking mengepal.', imagePrompt: 'BISINDO letter N, right hand thumb in, two fingers folded over thumb, front view', mnemonic: 'N seperti "Dua" gunung.' },
  { id: 'O', instruction: 'Semua jari dan jempol melengkung membentuk lingkaran bulat sempurna, ujung jari-jari bertemu dengan ujung jempol.', imagePrompt: 'BISINDO letter O, right hand all fingers and thumb forming perfect circle, tips touching, front view', mnemonic: 'O seperti "Oren" bulat.' },
  { id: 'P', instruction: 'Mirip huruf K, tapi tangan diarahkan ke bawah (menghadap lantai).', imagePrompt: 'BISINDO letter P, right hand in K shape but pointing downward, front view', mnemonic: 'P seperti "K terbalik" ke bawah.' },
  { id: 'Q', instruction: 'Mirip huruf G, tapi tangan diarahkan ke bawah (menghadap lantai).', imagePrompt: 'BISINDO letter Q, right hand in G shape but pointing downward, front view', mnemonic: 'Q seperti "G terbalik" ke bawah.' },
  { id: 'R', instruction: 'Jari telunjuk dan tengah bersilang di depan, jari-jari lain dan jempol mengepal.', imagePrompt: 'BISINDO letter R, right hand index and middle fingers crossed, front view', mnemonic: 'R seperti "Silang" jalan.' },
  { id: 'S', instruction: 'Tangan mengepal penuh, jempol melipat di depan menutupi jari telunjuk dan tengah.', imagePrompt: 'BISINDO letter S, right hand tight fist, thumb over index and middle, front view', mnemonic: 'S seperti "Simpan" dalam kepalan.' },
  { id: 'T', instruction: 'Jari telunjuk mengepal, jempol terselip di antara jari telunjuk dan tengah yang juga mengepal.', imagePrompt: 'BISINDO letter T, right hand thumb tucked between index and middle fingers, front view', mnemonic: 'T seperti "Tersembunyi" di antara jari.' },
  { id: 'U', instruction: 'Jari telunjuk dan tengah lurus ke atas dan rapat bersama, jari-jari lain dan jempol mengepal.', imagePrompt: 'BISINDO letter U, right hand index and middle fingers straight up together, front view', mnemonic: 'U seperti "Dua" jari rapat.' },
  { id: 'V', instruction: 'Jari telunjuk dan tengah lurus ke atas dan terbuka membentuk huruf V, jari-jari lain dan jempol mengepal.', imagePrompt: 'BISINDO letter V, right hand index and middle fingers spread in V shape, front view', mnemonic: 'V seperti "Victory".' },
  { id: 'W', instruction: 'Jari telunjuk, tengah, dan manis lurus ke atas dan terbuka, jari kelingking dan jempol mengepal.', imagePrompt: 'BISINDO letter W, right hand index, middle, ring fingers up spread, front view', mnemonic: 'W seperti "Tiga" jari terbuka.' },
  { id: 'X', instruction: 'Jari telunjuk menekuk ke belakang seperti kail, jari-jari lain mengepal.', imagePrompt: 'BISINDO letter X, right hand index finger bent like a hook, front view', mnemonic: 'X seperti "Kail" pancing.' },
  { id: 'Y', instruction: 'Jempol dan kelingking lurus ke samping terbuka, jari telunjuk, tengah, manis mengepal ke dalam.', imagePrompt: 'BISINDO letter Y, right hand thumb and pinky extended outward, others folded, front view', mnemonic: 'Y seperti "Yay" semangat.' },
  { id: 'Z', instruction: 'Jari telunjuk lurus ke atas, lalu gerakkan ke samping membentuk huruf Z di udara.', imagePrompt: 'BISINDO letter Z, right hand index finger drawing Z shape in air, front view', mnemonic: 'Z seperti "Zig-zag".' }
];

const MODULES = [
  {
    id: 'az',
    name: 'Huruf A-Z (SIBI)',
    items: alphabetData.map(item => ({
      glyph: item.id,
      name: item.id,
      desc: `Huruf ${item.id} SIBI`,
      imagePrompt: item.imagePrompt,
      instruction: item.instruction,
      mnemonic: item.mnemonic
    }))
  },
  {
    id: 'num',
    name: 'Angka 0-10 (SIBI)',
    items: [
      { glyph: '0', name: '0', desc: 'Angka 0 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 0, front view right hand, circle shape, dark background, clear detail', instruction: 'Buat lingkaran dengan semua jari.', mnemonic: 'Huruf O' },
      { glyph: '1', name: '1', desc: 'Angka 1 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 1, front view right hand, index up, dark background, clear detail', instruction: 'Hanya telunjuk yang tegak.', mnemonic: 'Tongkat' },
      { glyph: '2', name: '2', desc: 'Angka 2 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 2, front view right hand, index and middle up, dark background, clear detail', instruction: 'Telunjuk dan tengah tegak.', mnemonic: 'Huruf V' },
      { glyph: '3', name: '3', desc: 'Angka 3 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 3, front view right hand, index, middle, ring up, dark background, clear detail', instruction: 'Telunjuk, tengah, manis tegak.', mnemonic: 'Tiga jari' },
      { glyph: '4', name: '4', desc: 'Angka 4 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 4, front view right hand, index, middle, ring, pinky up, dark background, clear detail', instruction: 'Telunjuk, tengah, manis, kelingking tegak.', mnemonic: 'Empat jari' },
      { glyph: '5', name: '5', desc: 'Angka 5 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 5, front view right hand, all fingers spread, dark background, clear detail', instruction: 'Semua jari terbuka lebar.', mnemonic: 'Tangan terbuka' },
      { glyph: '6', name: '6', desc: 'Angka 6 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 6, front view right hand, thumb and pinky out, dark background, clear detail', instruction: 'Jempol dan kelingking ke luar.', mnemonic: 'Huruf Y' },
      { glyph: '7', name: '7', desc: 'Angka 7 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 7, front view right hand, thumb, index, middle up, dark background, clear detail', instruction: 'Jempol, telunjuk, tengah tegak.', mnemonic: 'Tiga jari dengan jempol' },
      { glyph: '8', name: '8', desc: 'Angka 8 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 8, front view right hand, thumb, index, middle, ring up, dark background, clear detail', instruction: 'Jempol, telunjuk, tengah, manis tegak.', mnemonic: 'Empat jari dengan jempol' },
      { glyph: '9', name: '9', desc: 'Angka 9 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 9, front view right hand, index bent like hook, dark background, clear detail', instruction: 'Telunjuk menekuk seperti kail.', mnemonic: 'Kail pancing' },
      { glyph: '10', name: '10', desc: 'Angka 10 SIBI', imagePrompt: 'realistic SIBI Indonesian sign language number 10, front view right hand, fist closed, dark background, clear detail', instruction: 'Tangan mengepal.', mnemonic: 'Kepalan' }
    ]
  },
  {
    id: 'greet',
    name: 'Salam & Sapaan (SIBI)',
    items: [
      { glyph: '👋', name: 'Halo', desc: 'Salam Halo SIBI', imagePrompt: 'realistic SIBI Indonesian sign language greeting hello, front view right hand waving, dark background, clear detail', instruction: 'Lambaikan tangan ke depan dengan ramah.', mnemonic: 'Menyapa temen' },
      { glyph: '🙏', name: 'Terima Kasih', desc: 'Terima Kasih SIBI', imagePrompt: 'realistic SIBI Indonesian sign language thank you, front view right hand touching chin then down, dark background, clear detail', instruction: 'Sentuhkan ujung jari ke dagu, lalu turunkan ke depan.', mnemonic: 'Hormat' },
      { glyph: '🌅', name: 'Selamat Pagi', desc: 'Selamat Pagi SIBI', imagePrompt: 'realistic SIBI Indonesian sign language good morning, front view hand, dark background, clear detail', instruction: 'Angkat tangan ke samping kepala, lalu gerakkan ke depan.', mnemonic: 'Matahari terbit' },
      { glyph: '😊', name: 'Saya Baik', desc: 'Saya Baik SIBI', imagePrompt: 'realistic SIBI Indonesian sign language i am fine, front view hand on chest, dark background, clear detail', instruction: 'Letakkan tangan di dada, lalu gerakkan ke luar dengan senyum.', mnemonic: 'Perasaan senang' },
      { glyph: '🤔', name: 'Apa Kabar?', desc: 'Apa Kabar SIBI', imagePrompt: 'realistic SIBI Indonesian sign language how are you, front view palms up, dark background, clear detail', instruction: 'Angkat kedua bahu, lalu gerakkan tangan ke depan dengan telapak menghadap atas.', mnemonic: 'Bertanya' }
    ]
  }
];

function renderLearn() {
  const allItems = MODULES.flatMap(m => m.items.map((it, i) => ({ ...it, moduleId: m.id, itemIndex: i })));
  document.getElementById('learnGrid').innerHTML = allItems.map((it, i) => {
    const done = State.learn.lessonsDone.includes(it.moduleId + ':' + it.itemIndex);
    const imageUrl = `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(it.imagePrompt)}&image_size=square`;
    return `
      <div class="glass sign-card" onclick="learnItem('${it.moduleId}', ${it.itemIndex})">
        <img src="${imageUrl}" alt="${it.name}" class="sign-card-image" loading="lazy">
        <b>${it.name}</b>
        <small>${it.desc}</small>
        ${done ? '<div style="color:var(--success);font-size:11px;margin-top:6px"><i class="ti ti-check"></i> Selesai</div>' : ''}
      </div>
    `;
  }).join('');
}

let currentSignData = null;

function learnItem(modId, idx) {
  const module = MODULES.find(m => m.id === modId);
  const item = module.items[idx];
  currentSignData = { ...item, moduleId: modId, itemIndex: idx };
  
  const imageUrl = `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(item.imagePrompt)}&image_size=square_hd`;
  const done = State.learn.lessonsDone.includes(modId + ':' + idx);
  
  document.getElementById('signDetailContent').innerHTML = `
    <div class="sign-detail-header">
      <h2>${item.name}</h2>
      <span class="sign-desc">${item.desc}</span>
    </div>
    <img src="${imageUrl}" alt="${item.name}" class="sign-detail-image">
    <div class="sign-detail-section">
      <h3><i class="ti ti-hand-finger"></i> Instruksi</h3>
      <p>${item.instruction}</p>
    </div>
    <div class="sign-detail-section">
      <h3><i class="ti ti-brain"></i> Mnemonic</h3>
      <p>${item.mnemonic}</p>
    </div>
    <div class="sign-detail-actions">
      ${!done ? `<button class="btn primary" onclick="markSignAsDone()">
        <i class="ti ti-check"></i> Tandai Selesai (+10 XP)
      </button>` : `<button class="btn ghost" disabled>
        <i class="ti ti-check-circle"></i> Sudah Selesai
      </button>`}
      <button class="btn ghost" onclick="closeSignDetailModal()">
        Tutup
      </button>
    </div>
  `;
  
  document.getElementById('signDetailModal').classList.add('show');
}

function markSignAsDone() {
  if (!currentSignData) return;
  
  const key = currentSignData.moduleId + ':' + currentSignData.itemIndex;
  if (!State.learn.lessonsDone.includes(key)) {
    State.learn.lessonsDone.push(key);
    State.learn.xp += 10;
    const newLevel = Math.floor(State.learn.xp / 100) + 1;
    if (newLevel > State.learn.level) {
      State.learn.level = newLevel;
      toast('Naik Level! Lv ' + newLevel, 'success');
    }
    save();
    toast('+10 XP', 'success');
    renderLearn();
    renderDashboard();
  }
  
  closeSignDetailModal();
}

function closeSignDetailModal() {
  document.getElementById('signDetailModal').classList.remove('show');
  currentSignData = null;
}



function playTTS() {
  if (!('speechSynthesis' in window)) {
    toast('Browser tidak mendukung TTS', 'warn');
    return;
  }
  const txt = document.getElementById('ttsTxt').value;
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = 'id-ID';
  u.rate = +document.getElementById('ttsRate').value;
  u.pitch = +document.getElementById('ttsPitch').value;
  speechSynthesis.speak(u);
  toast('Memutar suara', 'success');
}

function saveToHistory(mode, content) {
  if (!content.trim()) {
    toast('Tidak ada konten untuk disimpan', 'warn');
    return;
  }
  State.history.unshift({
    id: Date.now(),
    date: Date.now(),
    mode: mode,
    content: content.trim()
  });
  if (State.user && State.token) {
    fetch('/api/history/add', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`
      },
      body: JSON.stringify({ userId: State.user.id, mode, content, meta: '' })
    }).catch(() => {});
  }
  save();
  toast('Disimpan ke riwayat', 'success');
}

function renderHistory() {
  if (!State.history.length) {
    document.getElementById('historyFeed').innerHTML = `<div class="glass empty-state" style="grid-column:1/-1"><i class="ti ti-archive"></i><h4>Belum ada riwayat</h4></div>`;
    return;
  }
  document.getElementById('historyFeed').innerHTML = State.history.map(h => `
    <div class="glass hist-item">
      <div class="hist-head"><span class="hist-mode">${h.mode}</span><span class="hist-date">${new Date(h.date).toLocaleString('id-ID')}</span></div>
      <div class="hist-content">${String(h.content).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</div>
    </div>
  `).join('');
}

function changeTheme(val) {
  document.body.className = val;
  State.settings.theme = val;
  save();
}

// Initialize
document.body.className = State.settings.theme;
updateUserUI();
renderDashboard();
checkAuth();

// Initialize Settings when page loads
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  setupSettingsTabs();
});

// Also initialize when navigating to Settings page
const originalGo = go;
go = function(page) {
  originalGo(page);
  if (page === 'settings') {
    initSettings();
  }
};

// Add event listeners
document.getElementById('btnCamStart').addEventListener('click', startCam);
document.getElementById('btnCamStop').addEventListener('click', stopCam);

// Add particles
function addParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (3 + Math.random() * 4) + 's';
    p.style.animationDelay = (Math.random() * 5) + 's';
    container.appendChild(p);
  }
}
addParticles();
