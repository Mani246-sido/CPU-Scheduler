let processes = [];
let timeline = [];
let currentTime = 0;
let interval = null;

let cpuChart = null;
let compareChart = null;

let cpuData = [];
let busyTime = 0;
let idleTime = 0;

// ADD PROCESS
function addProcess() {
  const pid = document.getElementById("pid").value;
  const arrival = +document.getElementById("arrival").value;
  const burst = +document.getElementById("burst").value;
  const priority = +document.getElementById("priority").value || 0;

  if (!pid || burst <= 0) return alert("Invalid input");

  processes.push({ pid, arrival, burst, priority });
  renderTable();
}

// TABLE
function renderTable() {
  const tbody = document.querySelector("#processTable tbody");
  tbody.innerHTML = "";

  processes.forEach((p, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.pid}</td>
        <td>${p.arrival}</td>
        <td>${p.burst}</td>
        <td>${p.priority}</td>
        <td><button onclick="deleteProcess(${i})">❌</button></td>
      </tr>
    `;
  });
}

function deleteProcess(i) {
  processes.splice(i, 1);
  renderTable();
}

function resetAll() {
  processes = [];
  renderTable();
  document.getElementById("gantt").innerHTML = "";
  document.getElementById("results").innerHTML = "";
}

// ================= BUILD TIMELINE =================
function buildTimeline(algo) {
  let time = 0;
  let copy = processes.map(p => ({ ...p, remaining: p.burst }));
  let queue = [];

  timeline = [];

  while (copy.some(p => p.remaining > 0)) {

    copy.forEach(p => {
      if (p.arrival === time) queue.push(p);
    });

    let available = queue.filter(p => p.remaining > 0);
    let current = null;

    if (algo === "fcfs") current = available[0];
    if (algo === "sjf") current = [...available].sort((a,b)=>a.burst-b.burst)[0];
    if (algo === "srtf") current = [...available].sort((a,b)=>a.remaining-b.remaining)[0];
    if (algo === "priority") current = [...available].sort((a,b)=>a.priority-b.priority)[0];

    // ROUND ROBIN FIX
    if (algo === "rr") {
      let q = +document.getElementById("quantum").value || 2;

      if (queue.length) {
        current = queue.shift();

        for (let i = 0; i < q && current.remaining > 0; i++) {
          timeline.push(current.pid);
          current.remaining--;
          time++;
        }

        if (current.remaining > 0) queue.push(current);
        continue;
      }
    }

    if (!current) {
      timeline.push("Idle");
      time++;
      continue;
    }

    current.remaining--;
    timeline.push(current.pid);
    time++;
  }
}


function runSimulation() {
  const algo = document.getElementById("algorithm").value;

  if (!processes.length) return alert("Add processes");

  buildTimeline(algo);

  const gantt = document.getElementById("gantt");
  gantt.innerHTML = "";

  currentTime = 0;

  // RESET CPU GRAPH DATA
  cpuData = [];
  busyTime = 0;
  idleTime = 0;

  if (cpuChart) {
    cpuChart.destroy();
    cpuChart = null;
  }

  if (interval) clearInterval(interval);

  interval = setInterval(() => {
    if (currentTime >= timeline.length) {
      clearInterval(interval);
      calculateFinal();
      return;
    }

    const pid = timeline[currentTime];

    // CPU UTILIZATION CALC
    if (pid === "Idle") idleTime++;
    else busyTime++;

    let total = busyTime + idleTime;
    let utilization = (busyTime / total) * 100;

    cpuData.push(utilization);

    updateCPUChart();

    // GANTT BLOCK
    const block = document.createElement("div");
    block.className = "block";
    block.innerHTML = `${pid}<br>${currentTime}`;

    if (pid === "Idle") block.style.background = "#ef4444";

    gantt.appendChild(block);
    gantt.scrollLeft = gantt.scrollWidth;

    currentTime++;
  }, 400);
}


function calculateFinal() {
  let completion = {};

  for (let i = 0; i < timeline.length; i++) {
    let pid = timeline[i];
    if (pid !== "Idle") completion[pid] = i + 1;
  }

  let res = processes.map(p => {
    let ct = completion[p.pid] || 0;
    let tat = ct - p.arrival;
    let wt = tat - p.burst;

    return { ...p, completion: ct, turnaround: tat, waiting: wt };
  });

  let avgWT = res.reduce((a,b)=>a+b.waiting,0)/res.length;
  let avgTAT = res.reduce((a,b)=>a+b.turnaround,0)/res.length;

  document.getElementById("results").innerHTML = `
    Avg Waiting Time: ${avgWT.toFixed(2)} <br>
    Avg Turnaround Time: ${avgTAT.toFixed(2)}
  `;
}


function updateCPUChart() {
  const ctx = document.getElementById("cpuChart");

  if (!cpuChart) {
    cpuChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "CPU Utilization %",
          data: [],
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        animation: false,
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 100
          }
        }
      }
    });
  }

  cpuChart.data.labels.push(currentTime);
  cpuChart.data.datasets[0].data.push(cpuData[cpuData.length - 1]);
  cpuChart.update();
}


function compareAll() {
  let algos = ["fcfs","sjf","srtf","priority","rr"];
  let labels=[],wt=[],tat=[];

  algos.forEach(a=>{
    buildTimeline(a);

    let completion={};

    timeline.forEach((pid,i)=>{
      if(pid!=="Idle") completion[pid]=i+1;
    });

    let res=processes.map(p=>{
      let ct=completion[p.pid]||0;
      let tat=ct-p.arrival;
      let wt=tat-p.burst;
      return {waiting:wt,turnaround:tat};
    });

    labels.push(a.toUpperCase());
    wt.push(res.reduce((a,b)=>a+b.waiting,0)/res.length);
    tat.push(res.reduce((a,b)=>a+b.turnaround,0)/res.length);
  });

  if(compareChart) compareChart.destroy();

  compareChart=new Chart(document.getElementById("chart"),{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Waiting Time",data:wt},
        {label:"Turnaround Time",data:tat}
      ]
    }
  });
}