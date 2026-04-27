// ── DOM refs ──────────────────────────────────────────────
const algoSelect  = document.getElementById('algoSelect');
const sizeSlider  = document.getElementById('sizeSlider');
const speedSlider = document.getElementById('speedSlider');
const sizeVal     = document.getElementById('sizeVal');
const speedVal    = document.getElementById('speedVal');
const newArrayBtn = document.getElementById('newArrayBtn');
const startBtn    = document.getElementById('startBtn');
const resetBtn    = document.getElementById('resetBtn');
const sortCanvas  = document.getElementById('sortCanvas');
const bgCanvas    = document.getElementById('bgCanvas');
const cmpCount    = document.getElementById('cmpCount');
const swpCount    = document.getElementById('swpCount');
const statusText  = document.getElementById('statusText');
const algoLabel   = document.getElementById('algoLabel');
const cmpCard     = document.getElementById('cmpCard');

const sCtx = sortCanvas.getContext('2d');
const bCtx = bgCanvas.getContext('2d');

// ── Complexity info ────────────────────────────────────────
const COMPLEXITY = {
  bubble:    { name:'Bubble Sort',    best:'O(n)',    avg:'O(n²)',      worst:'O(n²)',      space:'O(1)' },
  insertion: { name:'Insertion Sort', best:'O(n)',    avg:'O(n²)',      worst:'O(n²)',      space:'O(1)' },
  selection: { name:'Selection Sort', best:'O(n²)',   avg:'O(n²)',      worst:'O(n²)',      space:'O(1)' },
  merge:     { name:'Merge Sort',     best:'O(n log n)', avg:'O(n log n)', worst:'O(n log n)', space:'O(n)' },
  quick:     { name:'Quick Sort',     best:'O(n log n)', avg:'O(n log n)', worst:'O(n²)',    space:'O(log n)' },
};

const tagColor = t => t.startsWith('O(1)') || t.startsWith('O(n)') && !t.includes('²') && !t.includes('log') ? 'green'
                    : t.includes('log') ? 'yellow' : 'red';

// ── State ─────────────────────────────────────────────────
let array = [], origArray = [];
let steps = [], stepIndex = 0;
let comparisons = 0, swaps = 0;
let running = false, animFrame = null;
let highlightA = -1, highlightB = -1, sortedSet = new Set();
let lastFrameTime = 0;

const SPEEDS = [600, 300, 120, 50, 16]; // ms per step

// ── Resize canvases ───────────────────────────────────────
function resizeCanvases() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  sortCanvas.width  = sortCanvas.offsetWidth;
  sortCanvas.height = sortCanvas.offsetHeight;
  drawBars();
}
window.addEventListener('resize', resizeCanvases);

// ── Generate array ────────────────────────────────────────
function generateArray() {
  const n = +sizeSlider.value;
  array = Array.from({length: n}, () => Math.floor(Math.random() * 90) + 10);
  origArray = [...array];
  reset();
}

function reset() {
  stopSort();
  array = [...origArray];
  steps = []; stepIndex = 0;
  comparisons = 0; swaps = 0;
  highlightA = highlightB = -1;
  sortedSet.clear();
  updateStats();
  drawBars();
  statusText.textContent = 'Ready';
}

// ── Draw bars ─────────────────────────────────────────────
function drawBars() {
  const W = sortCanvas.width, H = sortCanvas.height;
  sCtx.clearRect(0, 0, W, H);
  const n = array.length;
  const gap = 2, barW = (W - gap * (n + 1)) / n;
  const max = Math.max(...array);

  for (let i = 0; i < n; i++) {
    const x = gap + i * (barW + gap);
    const bh = ((array[i] / max) * (H - 20));
    const y = H - bh;

    let color;
    if (sortedSet.has(i))        color = getComputedStyle(document.documentElement).getPropertyValue('--bar-sorted').trim()   || '#3ddc84';
    else if (i === highlightA)   color = getComputedStyle(document.documentElement).getPropertyValue('--bar-swap').trim()     || '#ef4565';
    else if (i === highlightB)   color = getComputedStyle(document.documentElement).getPropertyValue('--bar-compare').trim()  || '#ffd166';
    else                         color = getComputedStyle(document.documentElement).getPropertyValue('--bar-default').trim()  || '#3a3a5c';

    // glow
    sCtx.shadowColor = color;
    sCtx.shadowBlur  = (i === highlightA || i === highlightB) ? 12 : 0;

    sCtx.fillStyle = color;
    const radius = Math.min(barW / 2, 4);
    sCtx.beginPath();
    sCtx.moveTo(x + radius, y);
    sCtx.lineTo(x + barW - radius, y);
    sCtx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    sCtx.lineTo(x + barW, H);
    sCtx.lineTo(x, H);
    sCtx.lineTo(x, y + radius);
    sCtx.quadraticCurveTo(x, y, x + radius, y);
    sCtx.closePath();
    sCtx.fill();
  }
  sCtx.shadowBlur = 0;
}

// ── Stats ─────────────────────────────────────────────────
function updateStats() {
  cmpCount.textContent = comparisons;
  swpCount.textContent = swaps;
}

// ── Build steps ───────────────────────────────────────────
function buildSteps(algo) {
  const arr = [...origArray];
  steps = [];

  const cmp  = (a, b) => steps.push({ type:'compare', a, b });
  const swap = (a, b) => {
    steps.push({ type:'swap', a, b });
    [arr[a], arr[b]] = [arr[b], arr[a]];
  };
  const mark = (...idxs) => steps.push({ type:'sorted', idxs });
  const over = () => steps.push({ type:'done' });

  if (algo === 'bubble') {
    for (let i = 0; i < arr.length; i++) {
      let swapped = false;
      for (let j = 0; j < arr.length - i - 1; j++) {
        cmp(j, j+1);
        if (arr[j] > arr[j+1]) { swap(j, j+1); swapped = true; }
      }
      mark(arr.length - i - 1);
      if (!swapped) {
        for (let k = 0; k < arr.length - i - 1; k++) mark(k);
        break;
      }
    }
    over();
  } else if (algo === 'insertion') {
    mark(0);
    for (let i = 1; i < arr.length; i++) {
      let j = i;
      while (j > 0) {
        cmp(j-1, j);
        if (arr[j-1] > arr[j]) { swap(j-1, j); j--; }
        else break;
      }
      mark(i);
    }
    over();
  } else if (algo === 'selection') {
    for (let i = 0; i < arr.length; i++) {
      let minIdx = i;
      for (let j = i+1; j < arr.length; j++) {
        cmp(minIdx, j);
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      if (minIdx !== i) swap(i, minIdx);
      mark(i);
    }
    over();
  } else if (algo === 'merge') {
    const mergeSort = (l, r) => {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      mergeSort(l, m);
      mergeSort(m+1, r);
      const left = arr.slice(l, m+1), right = arr.slice(m+1, r+1);
      let i = 0, j = 0, k = l;
      while (i < left.length && j < right.length) {
        cmp(l+i, m+1+j);
        if (left[i] <= right[j]) { arr[k++] = left[i++]; }
        else { arr[k++] = right[j++]; }
        steps.push({ type:'overwrite', idx: k-1, val: arr[k-1], arr: [...arr] });
      }
      while (i < left.length) { arr[k++] = left[i++]; steps.push({ type:'overwrite', idx:k-1, val:arr[k-1], arr:[...arr] }); }
      while (j < right.length) { arr[k++] = right[j++]; steps.push({ type:'overwrite', idx:k-1, val:arr[k-1], arr:[...arr] }); }
      for (let x = l; x <= r; x++) mark(x);
    };
    mergeSort(0, arr.length - 1);
    over();
  } else if (algo === 'quick') {
    const partition = (l, r) => {
      const pivot = arr[r];
      let i = l - 1;
      for (let j = l; j < r; j++) {
        cmp(j, r);
        if (arr[j] <= pivot) { i++; swap(i, j); }
      }
      swap(i+1, r);
      return i + 1;
    };
    const quickSort = (l, r) => {
      if (l >= r) { if (l === r) mark(l); return; }
      const p = partition(l, r);
      mark(p);
      quickSort(l, p - 1);
      quickSort(p + 1, r);
    };
    quickSort(0, arr.length - 1);
    over();
  }
}

// ── Apply step ────────────────────────────────────────────
function applyStep() {
  if (stepIndex >= steps.length) { finishSort(); return; }
  const s = steps[stepIndex++];

  if (s.type === 'compare') {
    comparisons++;
    highlightA = s.a; highlightB = s.b;
  } else if (s.type === 'swap') {
    swaps++;
    [array[s.a], array[s.b]] = [array[s.b], array[s.a]];
    highlightA = s.a; highlightB = s.b;
  } else if (s.type === 'overwrite') {
    array[s.idx] = s.val;
    highlightA = s.idx; highlightB = -1;
  } else if (s.type === 'sorted') {
    s.idxs.forEach(i => sortedSet.add(i));
    highlightA = highlightB = -1;
  } else if (s.type === 'done') {
    finishSort(); return;
  }
  updateStats();
  drawBars();
}

// ── Animation loop ────────────────────────────────────────
function animLoop(ts) {
  if (!running) return;
  const delay = SPEEDS[+speedSlider.value - 1];
  if (ts - lastFrameTime >= delay) {
    lastFrameTime = ts;
    applyStep();
  }
  animFrame = requestAnimationFrame(animLoop);
}

function startSort() {
  if (running) return;
  running = true;
  startBtn.textContent = '⏹ Stop';
  startBtn.classList.remove('primary');
  startBtn.classList.add('stop');
  newArrayBtn.disabled = true;
  resetBtn.disabled = true;
  algoSelect.disabled = true;
  statusText.textContent = 'Sorting…';

  if (steps.length === 0 || stepIndex === 0) {
    buildSteps(algoSelect.value);
    array = [...origArray];
    sortedSet.clear(); comparisons = 0; swaps = 0;
    highlightA = highlightB = -1;
    updateStats(); drawBars();
  }
  lastFrameTime = performance.now();
  animFrame = requestAnimationFrame(animLoop);
}

function stopSort() {
  running = false;
  cancelAnimationFrame(animFrame);
  startBtn.textContent = '▶ Start';
  startBtn.classList.add('primary');
  startBtn.classList.remove('stop');
  newArrayBtn.disabled = false;
  resetBtn.disabled = false;
  algoSelect.disabled = false;
}

function finishSort() {
  stopSort();
  for (let i = 0; i < array.length; i++) sortedSet.add(i);
  highlightA = highlightB = -1;
  drawBars();
  statusText.textContent = '✅ Done!';
  steps = []; stepIndex = 0;
}

// ── Complexity card updater ───────────────────────────────
function updateComplexityCard(algo) {
  const c = COMPLEXITY[algo];
  const mk = (label, val) => `<div class="cmp-row"><span>${label}</span><span class="tag ${tagColor(val)}">${val}</span></div>`;
  cmpCard.innerHTML = `<div class="cmp-name">${c.name}</div>${mk('Best',c.best)}${mk('Average',c.avg)}${mk('Worst',c.worst)}${mk('Space',c.space)}`;
  algoLabel.textContent = c.name;
  document.body.className = `theme-${algo}`;
}

// ── Events ────────────────────────────────────────────────
algoSelect.addEventListener('change', () => {
  updateComplexityCard(algoSelect.value);
  reset();
});
sizeSlider.addEventListener('input', () => { sizeVal.textContent = sizeSlider.value; generateArray(); });
speedSlider.addEventListener('input', () => { speedVal.textContent = speedSlider.value; });
newArrayBtn.addEventListener('click', generateArray);
startBtn.addEventListener('click', () => { running ? stopSort() : startSort(); });
resetBtn.addEventListener('click', reset);

// ══════════════════════════════════════════════════════════
// ── BACKGROUND ANIMATIONS ─────────────────────────────────
// ══════════════════════════════════════════════════════════

// ── Bubble: floating bubbles ──────────────────────────────
function makeBubbles(n=30) {
  return Array.from({length:n}, () => ({
    x: Math.random() * bgCanvas.width,
    y: bgCanvas.height + Math.random() * 200,
    r: 10 + Math.random() * 40,
    speed: 0.3 + Math.random() * 0.8,
    drift: (Math.random() - 0.5) * 0.4,
    alpha: 0.04 + Math.random() * 0.12,
    hue: 190 + Math.random() * 40,
  }));
}

// ── Insertion: falling cards ──────────────────────────────
function makeCards(n=20) {
  return Array.from({length:n}, () => ({
    x: Math.random() * bgCanvas.width,
    y: -80 - Math.random() * 400,
    w: 28 + Math.random() * 16,
    h: 40 + Math.random() * 20,
    rot: (Math.random() - 0.5) * 0.5,
    speed: 0.6 + Math.random() * 1.2,
    alpha: 0.06 + Math.random() * 0.10,
  }));
}

// ── Selection: radar rings ────────────────────────────────
let radarAngle = 0;
function drawRadar() {
  const W = bgCanvas.width, H = bgCanvas.height;
  const cx = W / 2, cy = H / 2;
  const maxR = Math.hypot(W, H) / 2;
  bCtx.clearRect(0, 0, W, H);
  // rings
  for (let r = 80; r < maxR; r += 80) {
    bCtx.beginPath();
    bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    bCtx.strokeStyle = `rgba(128,203,196,${0.04 * (1 - r / maxR)})`;
    bCtx.lineWidth = 1;
    bCtx.stroke();
  }
  // sweep
  const grad = bCtx.createConicalGradient ? null : null; // fallback
  const sweepLen = Math.PI / 3;
  const gr = bCtx.createLinearGradient(cx, cy,
    cx + Math.cos(radarAngle) * maxR, cy + Math.sin(radarAngle) * maxR);
  gr.addColorStop(0, 'rgba(128,203,196,0.22)');
  gr.addColorStop(1, 'rgba(128,203,196,0)');
  bCtx.beginPath();
  bCtx.moveTo(cx, cy);
  bCtx.arc(cx, cy, maxR, radarAngle - sweepLen, radarAngle);
  bCtx.closePath();
  bCtx.fillStyle = gr;
  bCtx.fill();
  // line
  bCtx.beginPath();
  bCtx.moveTo(cx, cy);
  bCtx.lineTo(cx + Math.cos(radarAngle) * maxR, cy + Math.sin(radarAngle) * maxR);
  bCtx.strokeStyle = 'rgba(128,203,196,0.5)';
  bCtx.lineWidth = 1.5;
  bCtx.stroke();
  radarAngle += 0.008;
}

// ── Merge: DNA helix strands ──────────────────────────────
function drawDNA() {
  const W = bgCanvas.width, H = bgCanvas.height;
  bCtx.clearRect(0, 0, W, H);
  const t = Date.now() / 2000;
  const strands = 3;
  for (let s = 0; s < strands; s++) {
    const cx = (s + 0.5) * (W / strands);
    for (let y = 0; y < H; y += 4) {
      const phase = y / 60 + t + s * 2.1;
      const amp = 40 + Math.sin(y / 200 + t) * 15;
      const x1 = cx + Math.cos(phase) * amp;
      const x2 = cx + Math.cos(phase + Math.PI) * amp;
      bCtx.beginPath();
      bCtx.arc(x1, y, 2, 0, Math.PI*2);
      bCtx.fillStyle = `hsla(${130+s*30},60%,60%,0.12)`;
      bCtx.fill();
      bCtx.beginPath();
      bCtx.arc(x2, y, 2, 0, Math.PI*2);
      bCtx.fillStyle = `hsla(${160+s*30},60%,60%,0.12)`;
      bCtx.fill();
      if (Math.round(y / 4) % 7 === 0) {
        bCtx.beginPath();
        bCtx.moveTo(x1, y); bCtx.lineTo(x2, y);
        bCtx.strokeStyle = `hsla(${145+s*20},50%,70%,0.08)`;
        bCtx.lineWidth = 1;
        bCtx.stroke();
      }
    }
  }
}

// ── Quick: lightning sparks ───────────────────────────────
let sparks = [];
function spawnSpark() {
  const W = bgCanvas.width, H = bgCanvas.height;
  const x = Math.random() * W;
  const pts = [{x, y:Math.random()*H*0.3}];
  let cx = x, cy = pts[0].y;
  while (cy < H) {
    cy += 15 + Math.random() * 30;
    cx += (Math.random()-0.5)*60;
    pts.push({x:cx, y:cy});
  }
  sparks.push({ pts, alpha:0.8, hue:20+Math.random()*30, life:40+Math.random()*20 });
}
function drawSparks() {
  const W = bgCanvas.width, H = bgCanvas.height;
  bCtx.clearRect(0, 0, W, H);
  if (Math.random() < 0.04) spawnSpark();
  sparks = sparks.filter(s => s.life > 0);
  for (const s of sparks) {
    bCtx.beginPath();
    bCtx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) bCtx.lineTo(s.pts[i].x, s.pts[i].y);
    bCtx.strokeStyle = `hsla(${s.hue},100%,70%,${s.alpha * 0.3})`;
    bCtx.lineWidth = 1 + s.alpha;
    bCtx.shadowColor = `hsl(${s.hue},100%,70%)`;
    bCtx.shadowBlur = 8;
    bCtx.stroke();
    bCtx.shadowBlur = 0;
    s.alpha -= 0.025;
    s.life--;
  }
}

// ── Unified BG state ──────────────────────────────────────
let bubbles = [], cards = [];

function initBgForAlgo(algo) {
  sparks = [];
  bubbles = algo === 'bubble' ? makeBubbles(35) : [];
  cards   = algo === 'insertion' ? makeCards(22) : [];
}

function animateBg() {
  const algo = algoSelect.value;
  const W = bgCanvas.width, H = bgCanvas.height;

  if (algo === 'bubble') {
    bCtx.clearRect(0, 0, W, H);
    for (const b of bubbles) {
      b.y -= b.speed;
      b.x += b.drift;
      if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random() * W; }
      bCtx.beginPath();
      bCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      const g = bCtx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, 0, b.x, b.y, b.r);
      g.addColorStop(0, `hsla(${b.hue},80%,80%,${b.alpha * 1.5})`);
      g.addColorStop(0.6, `hsla(${b.hue},70%,60%,${b.alpha})`);
      g.addColorStop(1, `hsla(${b.hue},60%,50%,0)`);
      bCtx.fillStyle = g;
      bCtx.fill();
      bCtx.strokeStyle = `hsla(${b.hue},80%,80%,${b.alpha * 2})`;
      bCtx.lineWidth = 0.8;
      bCtx.stroke();
    }
  } else if (algo === 'insertion') {
    bCtx.clearRect(0, 0, W, H);
    for (const c of cards) {
      c.y += c.speed;
      if (c.y > H + 80) { c.y = -80; c.x = Math.random() * W; }
      bCtx.save();
      bCtx.translate(c.x, c.y);
      bCtx.rotate(c.rot);
      bCtx.globalAlpha = c.alpha;
      bCtx.fillStyle = 'rgba(206,147,216,0.5)';
      bCtx.strokeStyle = 'rgba(206,147,216,0.8)';
      bCtx.lineWidth = 1;
      bCtx.beginPath();
      const rx = -c.w/2, ry = -c.h/2, rr = 4;
      bCtx.moveTo(rx+rr, ry); bCtx.lineTo(rx+c.w-rr, ry);
      bCtx.quadraticCurveTo(rx+c.w, ry, rx+c.w, ry+rr);
      bCtx.lineTo(rx+c.w, ry+c.h-rr);
      bCtx.quadraticCurveTo(rx+c.w, ry+c.h, rx+c.w-rr, ry+c.h);
      bCtx.lineTo(rx+rr, ry+c.h);
      bCtx.quadraticCurveTo(rx, ry+c.h, rx, ry+c.h-rr);
      bCtx.lineTo(rx, ry+rr);
      bCtx.quadraticCurveTo(rx, ry, rx+rr, ry);
      bCtx.closePath();
      bCtx.fill(); bCtx.stroke();
      bCtx.restore();
      bCtx.globalAlpha = 1;
    }
  } else if (algo === 'selection') {
    drawRadar();
  } else if (algo === 'merge') {
    drawDNA();
  } else if (algo === 'quick') {
    drawSparks();
  }

  requestAnimationFrame(animateBg);
}

// ── Init ──────────────────────────────────────────────────
updateComplexityCard(algoSelect.value);
resizeCanvases();
generateArray();
initBgForAlgo(algoSelect.value);
animateBg();

algoSelect.addEventListener('change', () => initBgForAlgo(algoSelect.value));