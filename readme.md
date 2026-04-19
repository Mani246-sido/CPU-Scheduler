# ⚡ Intelligent CPU Scheduler Simulator

An interactive, real-time CPU Scheduling Simulator built with **HTML, CSS, and JavaScript**. This project visualizes how different scheduling algorithms work using an animated dashboard interface with live execution, performance analytics, and modern UI/UX.

---

## 🚀 Features

* 🧠 **Algorithms Implemented**

  * FCFS (First Come First Serve)
  * SJF (Shortest Job First)
  * SRTF (Shortest Remaining Time First)
  * Priority Scheduling
  * Round Robin (with Time Quantum)

* 🎬 **Real-Time Simulation**

  * Step-by-step execution
  * Visual flow: **Queue → CPU → Completed**
  * Highlighted active process
  * Pause, Resume, Step controls
  * Adjustable simulation speed

* 📊 **Performance Analytics**

  * Average Waiting Time
  * Average Turnaround Time
  * CPU Utilization %
  * Detailed results table

* 📈 **Interactive Graphs (Chart.js)**

  * Algorithm performance comparison
  * Process-wise waiting time visualization

* 🎨 **Premium UI/UX**

  * Glassmorphism design
  * Responsive dashboard layout
  * Smooth animations and transitions
  * KPI cards with animated values

---

## 🧾 Input Parameters

Each process includes:

* Process ID
* Arrival Time
* Burst Time
* Priority (for Priority Scheduling)

Dynamic inputs:

* Time Quantum (only for Round Robin)

---

## 🧠 How It Works

1. Select a scheduling algorithm
2. Add processes with required parameters
3. Run the simulation
4. Observe real-time execution and analytics

The simulator builds a timeline based on the selected algorithm and animates the execution flow, ensuring accurate computation of scheduling metrics.

---

## 📁 Project Structure

```
cpu-scheduler-pro/
│
├── index.html     # Main UI structure
├── styles.css     # Styling and animations
├── script.js      # Logic and simulation
└── README.md
```

---

## ▶️ How to Run

1. Download or clone the repository
2. Open the folder in **VS Code**
3. Run `index.html` using Live Server

---

## 🎯 Use Case

* 📚 Students learning Operating Systems
* 👨‍🏫 Teachers explaining scheduling concepts
* 💻 Developers exploring system simulations

---

## 💡 Highlights

* Combines **accurate scheduling logic** with **interactive visualization**
* Mimics real OS-level execution flow
* Designed as a **presentation-ready dashboard**

---

## 🔮 Future Improvements

* 🤖 AI-based best algorithm suggestion
* 📤 Export results as PDF
* ⚛️ React + Tailwind upgrade
* 🎮 Drag & drop process simulation

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!

---
