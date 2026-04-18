/* ═══════════════════════════════════════════════════════════
   CPU SCHEDULER SIMULATOR — SCRIPT.JS
   Complete simulation engine with all 5 algorithms
═══════════════════════════════════════════════════════════ */

"use strict";

// ──────────────────────────────────────────────
// 1. PROCESS COLOR PALETTE
// ──────────────────────────────────────────────
const COLORS = [
  { hex: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.4)' },
  { hex: '#818cf8', bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.4)' },
  { hex: '#f472b6', bg: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.4)' },
  { hex: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)' },
  { hex: '#fb923c', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)' },
  { hex: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' },
  { hex: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
  { hex: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)' },
  { hex: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)' },
  { hex: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)' },
];

// ──────────────────────────────────────────────
// 2. STATE
// ──────────────────────────────────────────────
let processes      = [];     // { id, arrival, burst, priority, colorIdx }
let nextPid        = 1;      // auto-increment PID counter
let currentAlgo    = 'FCFS';

// Simulation state
let simTimeline    = [];     // [{pid, start, end}] — full Gantt data
let simResults     = [];     // per-process metrics
let simSteps       = [];     // step-by-step snapshots for animation
let stepIndex      = 0;      // current step pointer
let simRunning     = false;
let simPaused      = false;
let simTimer       = null;
let simSpeed       = 5;      // 1–10

// Charts
let perfChart      = null;
let processChart   = null;

// ──────────────────────────────────────────────
// 3. DOM REFS
// ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

const DOM = {
  algoBtns:         document.querySelectorAll('.algo-btn'),
  quantumField:     $('quantumField'),
  quantum:          $('quantum'),
  priorityGroup:    $('priorityGroup'),
  thPriority:       $('thPriority'),
  arrivalInput:     $('arrivalInput'),
  burstInput:       $('burstInput'),
  priorityInput:    $('priorityInput'),
  addProcessBtn:    $('addProcessBtn'),
  addRandomBtn:     $('addRandomBtn'),
  clearAllBtn:      $('clearAllBtn'),
  processTableBody: $('processTableBody'),
  processCount:     $('processCount'),
  runBtn:           $('runBtn'),
  pauseBtn:         $('pauseBtn'),
  stepBtn:          $('stepBtn'),
  resetBtn:         $('resetBtn'),
  speedSlider:      $('speedSlider'),
  speedVal:         $('speedVal'),
  statusPill:       $('statusPill'),
  statusText:       $('statusText'),
  clockDisplay:     $('clockDisplay'),
  readyQueue:       $('readyQueue'),
  cpuCore:          $('cpuCore'),
  cpuInner:         $('cpuInner'),
  doneQueue:        $('doneQueue'),
  ganttWrap:        $('ganttWrap'),
  execTime:         $('execTime'),
  execAlgo:         $('execAlgo'),
  execRunning:      $('execRunning'),
  execQueue:        $('execQueue'),
  resultsTableBody: $('resultsTableBody'),
  resultCount:      $('resultCount'),
  kpiWTVal:         $('kpiWTVal'),
  kpiTATVal:        $('kpiTATVal'),
  kpiUtilVal:       $('kpiUtilVal'),
  kpiThruVal:       $('kpiThruVal'),
  toastContainer:   $('toastContainer'),
};

// ──────────────────────────────────────────────
// 4. ALGORITHM SELECTOR
// ──────────────────────────────────────────────
DOM.algoBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.algoBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAlgo = btn.dataset.algo;
    DOM.quantumField.style.display  = (currentAlgo === 'RR')       ? 'block' : 'none';
    DOM.priorityGroup.style.display = (currentAlgo === 'PRIORITY') ? 'flex'  : 'none';
    DOM.thPriority.style.display    = (currentAlgo === 'PRIORITY') ? ''      : 'none';
    DOM.execAlgo.textContent = currentAlgo;
    renderProcessTable();
  });
});

DOM.speedSlider.addEventListener('input', () => {
  simSpeed = +DOM.speedSlider.value;
  DOM.speedVal.textContent = simSpeed + 'x';
});

// ──────────────────────────────────────────────
// 5. ADD / REMOVE PROCESSES
// ──────────────────────────────────────────────
DOM.addProcessBtn.addEventListener('click', addProcess);
DOM.addRandomBtn.addEventListener('click', addRandomProcess);
DOM.clearAllBtn.addEventListener('click', clearAll);

// Allow pressing Enter in inputs
[DOM.arrivalInput, DOM.burstInput, DOM.priorityInput].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') addProcess(); });
});

function addProcess() {
  const arrival  = parseInt(DOM.arrivalInput.value) || 0;
  const burst    = parseInt(DOM.burstInput.value);
  const priority = parseInt(DOM.priorityInput.value) || 1;

  if (isNaN(burst) || burst < 1) { showToast('Burst time must be ≥ 1', 'error'); return; }
  if (arrival < 0)               { showToast('Arrival time must be ≥ 0', 'error'); return; }
  if (processes.length >= 10)    { showToast('Maximum 10 processes', 'warn'); return; }

  const colorIdx = processes.length % COLORS.length;
  processes.push({ id: nextPid++, arrival, burst, priority, colorIdx });
  renderProcessTable();
  DOM.burstInput.value = '';
  DOM.arrivalInput.value = '';
  DOM.burstInput.focus();
  showToast(`P${processes[processes.length-1].id} added`, 'success');
}

function addRandomProcess() {
  if (processes.length >= 10) { showToast('Maximum 10 processes', 'warn'); return; }
  const colorIdx = processes.length % COLORS.length;
  processes.push({
    id:       nextPid++,
    arrival:  Math.floor(Math.random() * 8),
    burst:    Math.floor(Math.random() * 9) + 1,
    priority: Math.floor(Math.random() * 5) + 1,
    colorIdx,
  });
  renderProcessTable();
  showToast(`P${processes[processes.length-1].id} added (random)`, 'info');
}

function removeProcess(id) {
  processes = processes.filter(p => p.id !== id);
  renderProcessTable();
}

function clearAll() {
  processes = [];
  renderProcessTable();
  resetSimState();
  showToast('All processes cleared', 'info');
}

function renderProcessTable() {
  DOM.processCount.textContent = processes.length;
  if (processes.length === 0) {
    DOM.processTableBody.innerHTML = `<tr class="empty-row"><td colspan="5">No processes added</td></tr>`;
    return;
  }
  const showPri = currentAlgo === 'PRIORITY';
  DOM.processTableBody.innerHTML = processes.map((p, i) => {
    const c = COLORS[p.colorIdx];
    return `
      <tr>
        <td>
          <span class="pid-chip proc-color-${p.colorIdx}">P${p.id}</span>
        </td>
        <td>${p.arrival}</td>
        <td>${p.burst}</td>
        ${showPri ? `<td>${p.priority}</td>` : `<td style="display:none"></td>`}
        <td>
          <button class="del-btn" onclick="removeProcess(${p.id})">✕</button>
        </td>
      </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// 6. SCHEDULING ALGORITHMS
// ──────────────────────────────────────────────

/** Returns { timeline: [{pid, start, end}], results: [{pid, arrival, burst, completion, tat, wt}] } */
function runAlgorithm(procs, algo, quantum) {
  // Deep copy
  const P = procs.map(p => ({ ...p, remaining: p.burst }));

  switch (algo) {
    case 'FCFS':     return fcfs(P);
    case 'SJF':      return sjf(P);
    case 'SRTF':     return srtf(P);
    case 'PRIORITY': return prioritySched(P);
    case 'RR':       return roundRobin(P, quantum);
    default:         return fcfs(P);
  }
}

/* ── FCFS ── */
function fcfs(P) {
  const sorted = [...P].sort((a, b) => a.arrival - b.arrival || a.id - b.id);
  let time = 0;
  const timeline = [];
  sorted.forEach(p => {
    if (time < p.arrival) time = p.arrival; // CPU idle
    timeline.push({ pid: p.id, start: time, end: time + p.burst });
    time += p.burst;
  });
  return { timeline, results: calcResults(P, timeline) };
}

/* ── SJF (Non-preemptive) ── */
function sjf(P) {
  const remaining = [...P];
  let time = 0;
  const timeline = [];
  const done = new Set();

  while (done.size < P.length) {
    const available = remaining.filter(p => p.arrival <= time && !done.has(p.id));
    if (available.length === 0) {
      time++;
      continue;
    }
    // Pick shortest burst; tie-break by arrival, then id
    available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.id - b.id);
    const p = available[0];
    timeline.push({ pid: p.id, start: time, end: time + p.burst });
    time += p.burst;
    done.add(p.id);
  }
  return { timeline, results: calcResults(P, timeline) };
}

/* ── SRTF (Preemptive SJF) ── */
function srtf(P) {
  const procs = P.map(p => ({ ...p, remaining: p.burst }));
  const totalTime = P.reduce((s, p) => Math.max(s, p.arrival) + p.burst, 0) + 10;
  let time = 0;
  const timeline = [];
  const done = new Set();
  let current = null;
  let segStart = 0;

  while (done.size < P.length) {
    const available = procs.filter(p => p.arrival <= time && !done.has(p.id));
    if (available.length === 0) {
      if (current !== null) {
        timeline.push({ pid: current.id, start: segStart, end: time });
        current = null;
      }
      time++;
      continue;
    }

    available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.id - b.id);
    const best = available[0];

    if (!current || best.id !== current.id) {
      if (current !== null) {
        timeline.push({ pid: current.id, start: segStart, end: time });
      }
      current = best;
      segStart = time;
    }

    current.remaining--;
    time++;

    if (current.remaining === 0) {
      timeline.push({ pid: current.id, start: segStart, end: time });
      done.add(current.id);
      current = null;
      segStart = time;
    }

    if (time > 1000) break; // safety valve
  }

  // Merge consecutive same-PID segments for cleaner Gantt
  const merged = [];
  timeline.forEach(seg => {
    const last = merged[merged.length - 1];
    if (last && last.pid === seg.pid && last.end === seg.start) {
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  });

  return { timeline: merged, results: calcResults(P, merged) };
}

/* ── Priority (Non-preemptive, lower number = higher priority) ── */
function prioritySched(P) {
  const remaining = [...P];
  let time = 0;
  const timeline = [];
  const done = new Set();

  while (done.size < P.length) {
    const available = remaining.filter(p => p.arrival <= time && !done.has(p.id));
    if (available.length === 0) { time++; continue; }
    available.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival || a.id - b.id);
    const p = available[0];
    timeline.push({ pid: p.id, start: time, end: time + p.burst });
    time += p.burst;
    done.add(p.id);
  }
  return { timeline, results: calcResults(P, timeline) };
}

/* ── Round Robin ── */
function roundRobin(P, quantum) {
  const procs = P.map(p => ({ ...p, remaining: p.burst }));
  const queue = [];
  let time = 0;
  const timeline = [];
  const arrived = new Set();
  const done = new Set();

  // Enqueue all that arrive at t=0
  procs.filter(p => p.arrival === 0).sort((a,b)=>a.id-b.id).forEach(p => { queue.push(p); arrived.add(p.id); });

  while (done.size < P.length) {
    if (queue.length === 0) {
      // CPU idle — find next arrival
      const notArrived = procs.filter(p => !arrived.has(p.id) && !done.has(p.id));
      if (notArrived.length === 0) break;
      notArrived.sort((a,b) => a.arrival - b.arrival);
      time = notArrived[0].arrival;
      notArrived.filter(p => p.arrival === time).sort((a,b)=>a.id-b.id).forEach(p => { queue.push(p); arrived.add(p.id); });
      continue;
    }

    const p = queue.shift();
    const execTime = Math.min(quantum, p.remaining);
    const start = time;
    time += execTime;
    p.remaining -= execTime;

    // Enqueue new arrivals during this execution slice
    procs
      .filter(p2 => p2.arrival > start && p2.arrival <= time && !arrived.has(p2.id))
      .sort((a,b) => a.arrival - b.arrival || a.id - b.id)
      .forEach(p2 => { queue.push(p2); arrived.add(p2.id); });

    if (p.remaining === 0) {
      done.add(p.id);
    } else {
      queue.push(p);
    }

    timeline.push({ pid: p.id, start, end: time });
  }

  return { timeline, results: calcResults(P, timeline) };
}

/* ── Compute per-process metrics from timeline ── */
function calcResults(origProcs, timeline) {
  return origProcs.map(p => {
    // Completion = end of last segment for this pid
    const segs = timeline.filter(s => s.pid === p.id);
    if (segs.length === 0) return { pid: p.id, arrival: p.arrival, burst: p.burst, completion: 0, tat: 0, wt: 0 };
    const completion = Math.max(...segs.map(s => s.end));
    const tat        = completion - p.arrival;
    const wt         = tat - p.burst;
    return { pid: p.id, arrival: p.arrival, burst: p.burst, completion, tat, wt: Math.max(0, wt) };
  });
}

// ──────────────────────────────────────────────
// 7. BUILD STEP-BY-STEP SNAPSHOTS
// ──────────────────────────────────────────────
/**
 * Each step = one time-unit snapshot:
 * { time, runningPid, queuePids, completedPids, ganttSoFar }
 */
function buildSteps(timeline, results, allProcs) {
  const totalTime = timeline.length > 0 ? Math.max(...timeline.map(s => s.end)) : 0;
  const steps = [];
  const completed = new Set();

  for (let t = 0; t <= totalTime; t++) {
    // Find which process is running at time t
    const seg = timeline.find(s => s.start <= t && t < s.end);
    const runningPid = seg ? seg.pid : null;

    // Mark completions at this time
    timeline.filter(s => s.end === t).forEach(s => {
      // Only mark done if last segment for this pid
      const allSegs = timeline.filter(x => x.pid === s.pid);
      if (Math.max(...allSegs.map(x => x.end)) === t) completed.add(s.pid);
    });

    // Ready queue = arrived but not done and not currently running
    const queuePids = allProcs
      .filter(p => p.arrival <= t && !completed.has(p.id) && p.id !== runningPid)
      .map(p => p.id);

    // Gantt so far: all segments that started before current time
    const ganttSoFar = timeline.filter(s => s.start < t);

    steps.push({
      time: t,
      runningPid,
      queuePids,
      completedPids: [...completed],
      ganttSoFar: JSON.parse(JSON.stringify(ganttSoFar)),
    });
  }

  // Final step with full gantt
  steps.push({
    time: totalTime,
    runningPid: null,
    queuePids: [],
    completedPids: results.map(r => r.pid),
    ganttSoFar: JSON.parse(JSON.stringify(timeline)),
    isFinal: true,
  });

  return steps;
}

// ──────────────────────────────────────────────
// 8. SIMULATION CONTROLS
// ──────────────────────────────────────────────
DOM.runBtn.addEventListener('click', startSimulation);
DOM.pauseBtn.addEventListener('click', togglePause);
DOM.stepBtn.addEventListener('click', doStep);
DOM.resetBtn.addEventListener('click', resetSim);

function startSimulation() {
  if (processes.length === 0) { showToast('Add at least one process first', 'warn'); return; }

  const quantum = parseInt(DOM.quantum.value) || 2;
  const { timeline, results } = runAlgorithm(processes, currentAlgo, quantum);

  simTimeline = timeline;
  simResults  = results;
  simSteps    = buildSteps(timeline, results, processes);
  stepIndex   = 0;

  simRunning = true;
  simPaused  = false;

  DOM.runBtn.disabled   = true;
  DOM.pauseBtn.disabled = false;
  DOM.stepBtn.disabled  = false;

  setStatus('running', 'Running');
  DOM.execAlgo.textContent = currentAlgo;
  tickSimulation();
}

function togglePause() {
  if (!simRunning) return;
  simPaused = !simPaused;
  if (simPaused) {
    clearTimeout(simTimer);
    DOM.pauseBtn.innerHTML = '<span class="btn-icon">▶</span> Resume';
    setStatus('paused', 'Paused');
  } else {
    DOM.pauseBtn.innerHTML = '<span class="btn-icon">⏸</span> Pause';
    setStatus('running', 'Running');
    tickSimulation();
  }
}

function doStep() {
  if (processes.length === 0) { showToast('Add at least one process first', 'warn'); return; }

  // Init if fresh
  if (!simRunning || simSteps.length === 0) {
    const quantum = parseInt(DOM.quantum.value) || 2;
    const { timeline, results } = runAlgorithm(processes, currentAlgo, quantum);
    simTimeline = timeline;
    simResults  = results;
    simSteps    = buildSteps(timeline, results, processes);
    stepIndex   = 0;
    simRunning  = true;
    simPaused   = true;
    DOM.runBtn.disabled   = true;
    DOM.pauseBtn.disabled = false;
    setStatus('paused', 'Stepping');
    DOM.execAlgo.textContent = currentAlgo;
  }

  if (simPaused) clearTimeout(simTimer);
  applyStep(stepIndex);
  stepIndex++;
  if (stepIndex >= simSteps.length) finishSimulation();
}

function tickSimulation() {
  if (!simRunning || simPaused) return;
  applyStep(stepIndex);
  stepIndex++;
  if (stepIndex >= simSteps.length) { finishSimulation(); return; }
  const delay = Math.max(50, 1000 - (simSpeed - 1) * 100);
  simTimer = setTimeout(tickSimulation, delay);
}

function applyStep(idx) {
  if (idx >= simSteps.length) return;
  const step = simSteps[idx];

  // Update clock
  DOM.clockDisplay.textContent = `T = ${step.time}`;
  DOM.execTime.textContent     = step.time;

  // Update CPU
  if (step.runningPid !== null) {
    const proc = processes.find(p => p.id === step.runningPid);
    const c = COLORS[proc.colorIdx];
    DOM.cpuCore.classList.add('active');
    DOM.cpuInner.innerHTML = `<span style="color:${c.hex};font-size:13px;font-weight:700;">P${step.runningPid}</span>`;
    DOM.cpuInner.style.borderColor = c.hex;
    DOM.execRunning.textContent = `P${step.runningPid}`;
  } else {
    DOM.cpuCore.classList.remove('active');
    DOM.cpuInner.innerHTML = `<span class="cpu-idle-text">IDLE</span>`;
    DOM.cpuInner.style.borderColor = '';
    DOM.execRunning.textContent = '—';
  }

  // Update ready queue
  DOM.execQueue.textContent = step.queuePids.length;
  if (step.queuePids.length === 0) {
    DOM.readyQueue.innerHTML = '<span class="flow-empty">Empty</span>';
  } else {
    DOM.readyQueue.innerHTML = step.queuePids.map(pid => {
      const proc = processes.find(p => p.id === pid);
      const c = COLORS[proc.colorIdx];
      return `<span class="flow-chip proc-color-${proc.colorIdx}"
        style="background:${c.bg};color:${c.hex};border-color:${c.border}">P${pid}</span>`;
    }).join('');
  }

  // Update completed
  if (step.completedPids.length === 0) {
    DOM.doneQueue.innerHTML = '<span class="flow-empty">None</span>';
  } else {
    DOM.doneQueue.innerHTML = step.completedPids.map(pid => {
      const proc = processes.find(p => p.id === pid);
      const c = COLORS[proc.colorIdx];
      return `<span class="flow-chip proc-color-${proc.colorIdx}"
        style="background:${c.bg};color:${c.hex};border-color:${c.border};opacity:0.7">P${pid}</span>`;
    }).join('');
  }

  // Update Gantt
  renderGantt(step.ganttSoFar, step.runningPid);
}

function finishSimulation() {
  simRunning = false;
  clearTimeout(simTimer);
  DOM.runBtn.disabled   = false;
  DOM.pauseBtn.disabled = true;
  DOM.stepBtn.disabled  = false;
  setStatus('done', 'Done');
  DOM.clockDisplay.textContent = `T = ${simTimeline.length > 0 ? Math.max(...simTimeline.map(s => s.end)) : 0}`;

  // Full gantt
  renderGantt(simTimeline, null);

  // Results
  renderResults(simResults);

  // KPIs
  const avgWT  = simResults.reduce((s, r) => s + r.wt, 0) / simResults.length;
  const avgTAT = simResults.reduce((s, r) => s + r.tat, 0) / simResults.length;
  const totalTime = simTimeline.length > 0 ? Math.max(...simTimeline.map(s => s.end)) : 0;
  const busyTime = simTimeline.reduce((s, seg) => s + (seg.end - seg.start), 0);
  const utilization = totalTime > 0 ? (busyTime / totalTime) * 100 : 0;
  const throughput = totalTime > 0 ? (simResults.length / totalTime).toFixed(3) : 0;

  animateKPI('kpiWTVal', avgWT.toFixed(2));
  animateKPI('kpiTATVal', avgTAT.toFixed(2));
  animateKPI('kpiUtilVal', utilization.toFixed(1) + '%');
  animateKPI('kpiThruVal', throughput + '/t');

  document.querySelectorAll('.kpi-card').forEach(c => c.classList.add('populated'));

  // Charts
  updateCharts(simResults, avgWT, avgTAT);

  showToast(`Simulation complete — ${simResults.length} processes scheduled`, 'success');
}

function resetSim() {
  clearTimeout(simTimer);
  simRunning = false; simPaused = false;
  simTimeline = []; simResults = []; simSteps = []; stepIndex = 0;
  resetSimState();
  setStatus('idle', 'Idle');
  showToast('Simulation reset', 'info');
}

function resetSimState() {
  DOM.runBtn.disabled   = false;
  DOM.pauseBtn.disabled = true;
  DOM.stepBtn.disabled  = false;
  DOM.pauseBtn.innerHTML = '<span class="btn-icon">⏸</span> Pause';

  DOM.clockDisplay.textContent = 'T = 0';
  DOM.execTime.textContent     = '0';
  DOM.execRunning.textContent  = '—';
  DOM.execQueue.textContent    = '0';

  DOM.cpuCore.classList.remove('active');
  DOM.cpuInner.innerHTML = `<span class="cpu-idle-text">IDLE</span>`;
  DOM.cpuInner.style.borderColor = '';

  DOM.readyQueue.innerHTML = '<span class="flow-empty">Empty</span>';
  DOM.doneQueue.innerHTML  = '<span class="flow-empty">None</span>';
  DOM.ganttWrap.innerHTML  = '<div class="gantt-empty">Run simulation to see Gantt chart</div>';

  DOM.resultsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">Results will appear after simulation completes</td></tr>`;
  DOM.resultCount.textContent = '';

  ['kpiWTVal','kpiTATVal','kpiUtilVal','kpiThruVal'].forEach(id => $(id).textContent = '—');
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('populated'));

  if (perfChart)    { perfChart.destroy();    perfChart = null; }
  if (processChart) { processChart.destroy(); processChart = null; }
}

// ──────────────────────────────────────────────
// 9. GANTT RENDER
// ──────────────────────────────────────────────
function renderGantt(timeline, currentPid) {
  if (!timeline || timeline.length === 0) return;

  const totalEnd = Math.max(...timeline.map(s => s.end));
  const UNIT_PX  = Math.max(24, Math.min(60, Math.floor(900 / (totalEnd || 1))));

  let html = `<div class="gantt-inner">`;
  let prevEnd = 0;

  // Sort by start
  const sorted = [...timeline].sort((a, b) => a.start - b.start);

  sorted.forEach(seg => {
    // Idle gap
    if (seg.start > prevEnd) {
      const w = (seg.start - prevEnd) * UNIT_PX;
      html += `<div class="gantt-block idle" style="width:${w}px;min-width:${w}px" title="Idle [${prevEnd}-${seg.start}]">
                 <span style="font-size:9px;opacity:.5">IDLE</span>
               </div>`;
    }
    const proc = processes.find(p => p.id === seg.pid);
    const c = proc ? COLORS[proc.colorIdx] : COLORS[0];
    const w = (seg.end - seg.start) * UNIT_PX;
    html += `<div class="gantt-block" 
               style="width:${w}px;min-width:${w}px;background:${c.bg};color:${c.hex};border-color:${c.border};border-top:2px solid ${c.hex}"
               title="P${seg.pid} [${seg.start}-${seg.end}] (${seg.end-seg.start} units)">
               P${seg.pid}
             </div>`;
    prevEnd = seg.end;
  });

  html += `</div>`;

  // Time ticks
  html += `<div style="position:relative;height:20px;margin-top:4px;min-width:${totalEnd * UNIT_PX + 20}px">`;
  const tickInterval = totalEnd <= 20 ? 1 : totalEnd <= 50 ? 5 : 10;
  for (let t = 0; t <= totalEnd; t++) {
    if (t % tickInterval === 0 || t === totalEnd) {
      html += `<span class="gantt-tick" style="left:${t * UNIT_PX}px">${t}</span>`;
    }
  }
  html += `</div>`;

  // Legend
  const uniquePids = [...new Set(timeline.map(s => s.pid))];
  html += `<div class="gantt-legend">`;
  uniquePids.forEach(pid => {
    const proc = processes.find(p => p.id === pid);
    const c = proc ? COLORS[proc.colorIdx] : COLORS[0];
    html += `<div class="legend-item"><span class="legend-dot" style="background:${c.hex}"></span>P${pid}</div>`;
  });
  html += `</div>`;

  DOM.ganttWrap.innerHTML = html;
}

// ──────────────────────────────────────────────
// 10. RESULTS TABLE
// ──────────────────────────────────────────────
function renderResults(results) {
  if (!results.length) return;
  DOM.resultCount.textContent = results.length;

  const minWT  = Math.min(...results.map(r => r.wt));
  const maxWT  = Math.max(...results.map(r => r.wt));
  const minTAT = Math.min(...results.map(r => r.tat));

  DOM.resultsTableBody.innerHTML = results.map((r, i) => {
    const proc = processes.find(p => p.id === r.pid);
    const c = proc ? COLORS[proc.colorIdx] : COLORS[0];
    return `
      <tr style="animation-delay:${i * 0.05}s">
        <td><span class="pid-chip proc-color-${proc.colorIdx}">P${r.pid}</span></td>
        <td>${r.arrival}</td>
        <td>${r.burst}</td>
        <td style="color:${c.hex};font-weight:600">${r.completion}</td>
        <td class="${r.tat === minTAT ? 'best' : ''}">${r.tat}</td>
        <td class="${r.wt === minWT ? 'best' : r.wt === maxWT && maxWT !== minWT ? 'worst' : ''}">${r.wt}</td>
      </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// 11. CHARTS
// ──────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 }, padding: 12 } } },
};

function updateCharts(results, avgWT, avgTAT) {
  if (perfChart)    { perfChart.destroy();    perfChart = null; }
  if (processChart) { processChart.destroy(); processChart = null; }

  // Perf chart — bar with WT vs TAT per process
  const labels = results.map(r => `P${r.pid}`);
  perfChart = new Chart($('perfChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Waiting Time',
          data: results.map(r => r.wt),
          backgroundColor: 'rgba(249,115,22,0.5)',
          borderColor: '#f97316',
          borderWidth: 1, borderRadius: 4,
        },
        {
          label: 'Turnaround Time',
          data: results.map(r => r.tat),
          backgroundColor: 'rgba(34,211,238,0.4)',
          borderColor: '#22d3ee',
          borderWidth: 1, borderRadius: 4,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      animation: { duration: 600 },
    },
  });

  // Process-wise chart — horizontal bars for WT
  processChart = new Chart($('processChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Waiting Time',
          data: results.map(r => r.wt),
          backgroundColor: results.map((_, i) => COLORS[i % COLORS.length].bg),
          borderColor:     results.map((_, i) => COLORS[i % COLORS.length].hex),
          borderWidth: 1, borderRadius: 4,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      plugins: { legend: { display: false } },
      animation: { duration: 600 },
    },
  });
}

// ──────────────────────────────────────────────
// 12. UI HELPERS
// ──────────────────────────────────────────────
function setStatus(type, text) {
  DOM.statusPill.className = 'status-pill ' + type;
  DOM.statusText.textContent = text;
}

function animateKPI(id, target) {
  const el = $(id);
  el.style.transition = 'all 0.3s ease';
  el.textContent = target;
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  DOM.toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ──────────────────────────────────────────────
// 13. PRESET DATA LOADER
// ──────────────────────────────────────────────
function loadPreset() {
  processes = [];
  nextPid = 1;
  const preset = [
    { arrival: 0, burst: 6, priority: 2 },
    { arrival: 1, burst: 4, priority: 1 },
    { arrival: 2, burst: 8, priority: 4 },
    { arrival: 3, burst: 2, priority: 3 },
    { arrival: 4, burst: 5, priority: 2 },
  ];
  preset.forEach((p, i) => {
    processes.push({ id: nextPid++, arrival: p.arrival, burst: p.burst, priority: p.priority, colorIdx: i });
  });
  renderProcessTable();
  showToast('Sample dataset loaded', 'success');
}

// ──────────────────────────────────────────────
// 14. INIT
// ──────────────────────────────────────────────
(function init() {
  DOM.execAlgo.textContent = currentAlgo;
  // Load a sample set automatically for demo-readiness
  loadPreset();
})();
