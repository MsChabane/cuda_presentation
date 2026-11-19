/* ================= Helpers ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, "0");

function make(tag, cls, text) {
	const el = document.createElement(tag);
	if (cls) el.className = cls;
	if (text !== undefined) el.textContent = text;
	return el;
}

/* ================= Static generators ================= */
function genSquares() {
	$$('[data-gen="squares"]').forEach((box) => {
		const n = Number(box.dataset.count || 64);
		const frag = document.createDocumentFragment();
		for (let i = 0; i < n; i++) {
			const sq = make("div", "sq");
			sq.style.opacity = (0.25 + ((i * 37) % 75) / 100).toFixed(2);
			frag.appendChild(sq);
		}
		box.appendChild(frag);
	});
}

function genDie() {
	$$('[data-gen="die"]').forEach((box) => {
		let gpcs = "";
		for (let g = 0; g < 4; g++) {
			let sms = "";
			for (let s = 0; s < 6; s++) {
				sms +=
					'<div class="sm-mini"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
			}
			gpcs += `<div class="gpc"><p>GPC ${g + 1}</p><div class="sm-grid">${sms}</div></div>`;
		}
		box.innerHTML =
			`<div class="gpcs">${gpcs}</div>` +
			'<div class="mem-row"><div>L2 cache (shared)</div><div>Memory controllers</div><div>VRAM (HBM / GDDR)</div></div>';
	});
}

function genDots() {
	$$(".dots").forEach((d) => {
		const v = Number(d.dataset.v);
		for (let i = 1; i <= 5; i++) d.appendChild(make("i", i <= v ? "on" : ""));
	});
}

/* Simple keyword highlighter for code blocks (no external libraries) */
const KEYWORDS =
	/(#include|#define|\b(?:__global__|__device__|void|int|float|const|if|for|return|sizeof|size_t|main)\b)/g;
const esc = (s) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlightCode() {
	$$("pre.code").forEach((pre) => {
		const lines = pre.textContent.split("\n").map((line) => {
			const at = line.indexOf("//");
			const code = at >= 0 ? line.slice(0, at) : line;
			const comment = at >= 0 ? line.slice(at) : "";
			return (
				esc(code).replace(KEYWORDS, '<span class="kw">$1</span>') +
				(comment ? `<span class="cm">${esc(comment)}</span>` : "")
			);
		});
		pre.innerHTML = lines.join("\n");
	});
}

/* Animate horizontal bar charts when their slide is shown */
function animateBars(root) {
	$$(".bar-group", root).forEach((group) => {
		const fills = $$(".bar-fill", group);
		const max = Math.max(...fills.map((f) => Number(f.dataset.value)));
		fills.forEach((f) => {
			f.style.width = "0%";
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					f.style.width = `${Math.max((Number(f.dataset.value) / max) * 100, 1.5)}%`;
				}),
			);
		});
	});
}

/* ================= Slide navigation ================= */
const slides = $$(".slide");
const total = slides.length;
let current = 0;

function show(i) {
	console.log("show", i);
	current = Math.max(0, Math.min(total - 1, i));

	slides.forEach((s, k) => s.classList.toggle("active", k === current));
	$$("#dots button").forEach((b, k) =>
		b.classList.toggle("active", k === current),
	);
	slides[current].scrollTop = 0;
	$("#prev").disabled = current === 0;
	$("#next").disabled = current === total - 1;
	$("#counter").textContent = `${pad(current + 1)} / ${pad(total)}`;
	$("#progress").style.width = `${((current + 1) / total) * 100}%`;
	animateBars(slides[current]);
}

function initNav() {
	const dots = $("#dots");
	slides.forEach((s, i) => {
		const head = $(".slide-head", s);
		if (head) {
			const no = make("div", "slide-no");
			no.innerHTML = `${pad(i + 1)}<span> / ${pad(total)}</span>`;
			head.appendChild(no);
		}
		const b = make("button");
		b.title = `${i + 1}. ${s.dataset.title}`;
		b.setAttribute("aria-label", b.title);
		b.addEventListener("click", () => show(i));
		dots.appendChild(b);
	});

	$("#prev").addEventListener("click", () => show(current - 1));
	$("#next").addEventListener("click", () => show(current + 1));

	document.addEventListener("click", (e) => {
		const t = e.target.closest("[data-goto]");
		if (t) show(Number(t.dataset.goto) - 1);
	});

	document.addEventListener("keydown", (e) => {
		if (e.target.closest && e.target.closest("input, select, textarea")) return;
		if (
			e.target.closest &&
			e.target.closest("button") &&
			(e.key === " " || e.key === "Enter")
		)
			return;
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		switch (e.key) {
			case "ArrowRight":
			case "PageDown":
			case " ":
				e.preventDefault();
				show(current + 1);
				break;
			case "ArrowLeft":
			case "PageUp":
				e.preventDefault();
				show(current - 1);
				break;
			case "Home":
				show(0);
				break;
			case "End":
				show(total - 1);
				break;
		}
	});

	let startX = null;
	const stage = $("#stage");
	stage.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), {
		passive: true,
	});
	stage.addEventListener("touchend", (e) => {
		if (startX === null) return;
		const dx = e.changedTouches[0].clientX - startX;
		if (Math.abs(dx) > 60) show(current + (dx < 0 ? 1 : -1));
		startX = null;
	});
}

/* ================= Thread hierarchy demo ================= */
function initThreadDemo() {
	const range = $("#tgN");
	const field = $("#tgField");
	let T = 8;

	function render() {
		const n = Number(range.value);
		const blocks = Math.ceil(n / T);
		const threads = blocks * T;
		$("#tgNOut").textContent = n;
		$("#tgBlocks").textContent = blocks;
		$("#tgThreads").textContent = threads;
		$("#tgIdle").textContent = threads - n;

		const cols = Math.min(T, 8);
		field.innerHTML = "";
		for (let b = 0; b < blocks; b++) {
			const box = make("div", "blk-box");
			box.appendChild(make("b", "", `Block ${b}`));
			const grid = make("div", "tg");
			grid.style.gridTemplateColumns = `repeat(${cols}, 34px)`;
			for (let t = 0; t < T; t++) {
				const idx = b * T + t;
				const cell = make("div", idx < n ? "tc on" : "tc idle", String(idx));
				cell.title = `threadIdx.x = ${t}, i = ${idx}`;
				grid.appendChild(cell);
			}
			box.appendChild(grid);
			field.appendChild(box);
		}
	}

	range.addEventListener("input", render);
	$$("#tgBlock button").forEach((btn) =>
		btn.addEventListener("click", () => {
			T = Number(btn.dataset.t);
			$$("#tgBlock button").forEach((x) => x.classList.toggle("on", x === btn));
			render();
		}),
	);
	render();
}

/* ================= Warp (SIMT) demo ================= */
function initWarp() {
	const box = $("#warp");
	const status = $("#warpStatus");
	const cells = Array.from({ length: 32 }, (_, i) => {
		const c = make("div", "tc", String(i));
		box.appendChild(c);
		return c;
	});
	const paint = (fn) => cells.forEach((c, i) => (c.className = `tc ${fn(i)}`));
	let busy = false;

	$("#warpUni").addEventListener("click", async () => {
		if (busy) return;
		busy = true;
		paint(() => "run");
		status.textContent =
			"Uniform branch: all 32 threads take the same path, so the warp finishes in 1 pass.";
		await sleep(1100);
		paint(() => "done");
		busy = false;
	});

	$("#warpDiv").addEventListener("click", async () => {
		if (busy) return;
		busy = true;
		paint((i) => (i % 2 === 0 ? "run" : "idle"));
		status.textContent =
			"Pass 1: even threads run path A while odd threads wait (masked off).";
		await sleep(1100);
		paint((i) => (i % 2 === 0 ? "done" : "run"));
		status.textContent =
			"Pass 2: odd threads run path B while even threads wait. The warp took 2 passes.";
		await sleep(1100);
		paint(() => "done");
		status.textContent =
			"Divergence doubled the work for this warp: 2 passes instead of 1.";
		busy = false;
	});
}

/* ================= Workflow stepper ================= */
function initWorkflow() {
	const steps = [
		{
			title: "Allocate GPU memory",
			api: "cudaMalloc(&d_a, bytes);",
			text: "Reserve buffers in the GPU's video memory (VRAM) for the input and output data.",
			flow: "device",
		},
		{
			title: "Copy input to GPU",
			api: "cudaMemcpy(d_a, h_a, bytes,\n          cudaMemcpyHostToDevice);",
			text: "Transfer the input arrays from CPU RAM over the PCIe bus into GPU memory.",
			flow: "right",
		},
		{
			title: "Launch kernel",
			api: "vectorAdd<<<blocks, threads>>>(d_a, d_b, d_c, n);",
			text: "The CPU starts the kernel. Thousands of GPU threads execute it in parallel on the SMs.",
			flow: "device",
		},
		{
			title: "Copy result back",
			api: "cudaMemcpy(h_c, d_c, bytes,\n          cudaMemcpyDeviceToHost);",
			text: "After the kernel finishes, results are copied from GPU memory back to host RAM.",
			flow: "left",
		},
		{
			title: "Free memory",
			api: "cudaFree(d_a);",
			text: "Release the GPU buffers so the memory can be reused. Host and device are then cleaned up.",
			flow: "none",
		},
	];

	const box = $("#wfSteps");
	const host = $("#wfHost");
	const device = $("#wfDevice");
	const pk = $("#wfPk");
	const label = $("#wfArrowLbl");
	const code = $("#wfCode");
	const text = $("#wfText");
	const playBtn = $("#wfPlay");
	let active = 0;
	let timer = null;

	steps.forEach((s, i) => {
		const b = make("button", "step");
		b.innerHTML = `<small>STEP ${i + 1}</small><b></b>`;
		b.querySelector("b").textContent = s.title;
		b.addEventListener("click", () => {
			active = i;
			render();
		});
		box.appendChild(b);
	});

	function render() {
		const s = steps[active];
		$$(".step", box).forEach((b, i) => b.classList.toggle("on", i === active));

		host.classList.toggle("lit", s.flow === "left");
		device.classList.toggle("lit", s.flow === "right" || s.flow === "device");
		device.classList.toggle("pulse", s.flow === "device");

		const moving = s.flow === "right" || s.flow === "left";
		label.textContent =
			s.flow === "right"
				? "PCIe: host to device"
				: s.flow === "left"
					? "PCIe: device to host"
					: "on-device";
		pk.style.opacity = moving ? "1" : "0";

		pk.getAnimations().forEach((a) => a.cancel());
		if (moving) {
			const dist = Math.max(0, $("#wfTrack").clientWidth - pk.offsetWidth);
			const [from, to] = s.flow === "right" ? [0, dist] : [dist, 0];
			pk.animate(
				[
					{ transform: `translateX(${from}px)` },
					{ transform: `translateX(${to}px)` },
				],
				{ duration: 900, easing: "ease-in-out", fill: "forwards" },
			);
		}

		code.textContent = s.api;
		text.textContent = s.text;
	}

	playBtn.addEventListener("click", () => {
		if (timer) {
			clearInterval(timer);
			timer = null;
			playBtn.textContent = "Auto-play";
		} else {
			timer = setInterval(() => {
				active = (active + 1) % steps.length;
				render();
			}, 2600);
			playBtn.textContent = "Pause";
		}
	});

	render();
}

/* ================= Live simulator: vector addition ================= */
function initSimulator() {
	const N_SEL = $("#simN");
	const T_SEL = $("#simT");
	const SPEED = $("#simSpeed");
	const RUN = $("#simRun");
	const RESET = $("#simReset");
	const logBox = $("#simLog");
	const pk = $("#simPk");
	const bus = $("#simBus");
	const phaseEls = $$("#simPhases li");
	const SMS = 4;
	const SLOTS = 2;

	let cells = {};
	let slots = [];
	let runId = 0;
	let busy = false;

	const delay = () => [900, 550, 300, 150, 60][Number(SPEED.value) - 1];

	function log(msg, cls = "") {
		logBox.appendChild(make("p", cls, msg));
		logBox.scrollTop = logBox.scrollHeight;
	}

	function setPhase(k) {
		phaseEls.forEach((p, i) => {
			p.classList.toggle("done", i < k);
			p.classList.toggle("current", i === k);
		});
	}

	function animatePacket(dir, ms) {
		pk.getAnimations().forEach((a) => a.cancel());
		const dist = Math.max(0, bus.clientWidth - pk.offsetWidth);
		const [from, to] = dir > 0 ? [0, dist] : [dist, 0];
		pk.animate(
			[
				{ transform: `translateX(${from}px)` },
				{ transform: `translateX(${to}px)` },
			],
			{ duration: ms, easing: "ease-in-out", fill: "forwards" },
		);
	}

	function fillRow(key, id, n, valueFn) {
		const box = $("#" + id);
		box.innerHTML = "";
		cells[key] = [];
		for (let i = 0; i < n; i++) {
			const c = make("div", "cell", valueFn ? String(valueFn(i)) : "");
			if (valueFn) c.classList.add("on");
			box.appendChild(c);
			cells[key].push(c);
		}
	}

	function build() {
		const N = Number(N_SEL.value);
		fillRow("hA", "hA", N, (i) => i);
		fillRow("hB", "hB", N, (i) => 2 * i);
		fillRow("hC", "hC", N);
		fillRow("dA", "dA", N);
		fillRow("dB", "dB", N);
		fillRow("dC", "dC", N);

		const grid = $("#smGrid");
		grid.innerHTML = "";
		slots = [];
		for (let s = 0; s < SMS; s++) {
			const sm = make("div", "sm");
			sm.appendChild(make("h5", "", `Streaming Multiprocessor ${s}`));
			const wrap = make("div", "slots");
			for (let k = 0; k < SLOTS; k++) {
				const el = make("div", "slot");
				const lbl = make("span", "lbl", "idle");
				el.appendChild(lbl);
				wrap.appendChild(el);
				slots.push({ sm: s, el, lbl, thrs: [], blk: null });
			}
			sm.appendChild(wrap);
			grid.appendChild(sm);
		}

		logBox.innerHTML = "";
		setPhase(-1);
		pk.getAnimations().forEach((a) => a.cancel());
	}

	function startBlock(s, id, N, T) {
		const start = id * T;
		const end = Math.min(N, start + T);
		s.blk = { id, start, end };
		s.el.classList.add("busy");
		s.el.innerHTML = "";
		s.lbl = make("span", "lbl", `Block ${id} · threads ${start}..${end - 1}`);
		s.el.appendChild(s.lbl);
		s.thrs = [];
		for (let k = 0; k < T; k++) {
			const t = make("div", "thr");
			const g = start + k;
			if (g < N) {
				t.classList.add("run");
				t.title = `threadIdx.x = ${k}, i = ${g}`;
				cells.dC[g].classList.add("run");
			} else {
				t.style.opacity = "0.3";
			}
			s.el.appendChild(t);
			s.thrs.push(t);
		}
		log(`Block ${id} scheduled on SM ${s.sm}`);
	}

	function finishBlock(s) {
		const { id, start, end } = s.blk;
		for (let g = start; g < end; g++) {
			const c = cells.dC[g];
			c.textContent = String(3 * g);
			c.classList.remove("run");
			c.classList.add("done");
		}
		s.thrs.forEach((t, k) => {
			if (start + k < end) t.className = "thr done";
		});
		s.el.classList.remove("busy");
		s.lbl.textContent = `Block ${id} finished`;
		log(
			`Block ${id} finished on SM ${s.sm}: wrote c[${start}..${end - 1}]`,
			"ok",
		);
		s.blk = null;
	}

	async function run() {
		if (busy) return;
		busy = true;
		RUN.disabled = true;
		build();

		const id = ++runId;
		const alive = () => id === runId;
		const N = Number(N_SEL.value);
		const T = Number(T_SEL.value);
		const NB = Math.ceil(N / T);
		const d = delay();
		const batch = Math.max(1, Math.ceil(N / 12));
		const copySteps = Math.ceil(N / batch);
		const copyMs = (copySteps * d) / 2;

		log(
			`Host: N = ${N} elements, ${T} threads per block, ${NB} blocks needed.`,
		);

		setPhase(0);
		log("cudaMalloc(&d_a, &d_b, &d_c): reserve N floats each in GPU VRAM.");
		await sleep(d);
		if (!alive()) return;

		setPhase(1);
		log("cudaMemcpy(d_a, h_a, ..., HostToDevice): copy inputs over PCIe.");
		animatePacket(1, copyMs);
		for (let i = 0; i < N; i += batch) {
			if (!alive()) return;
			for (let j = i; j < Math.min(N, i + batch); j++) {
				cells.dA[j].textContent = String(j);
				cells.dA[j].classList.add("on");
				cells.dB[j].textContent = String(2 * j);
				cells.dB[j].classList.add("on");
			}
			await sleep(d / 2);
		}

		setPhase(2);
		log(`Kernel launch: vectorAdd<<<${NB}, ${T}>>>(d_a, d_b, d_c, N)`);
		await sleep(d);
		if (!alive()) return;

		setPhase(3);
		const queue = Array.from({ length: NB }, (_, b) => b);
		for (;;) {
			if (!alive()) return;
			slots.forEach((s) => {
				if (s.blk) finishBlock(s);
			});
			let started = 0;
			for (const s of slots) {
				if (!s.blk && queue.length) {
					startBlock(s, queue.shift(), N, T);
					started++;
				}
			}
			if (!started) break;
			await sleep(d);
		}

		setPhase(4);
		log("All blocks done. Results sit in GPU memory (d_c).");
		animatePacket(-1, copyMs);
		for (let i = 0; i < N; i += batch) {
			if (!alive()) return;
			for (let j = i; j < Math.min(N, i + batch); j++) {
				cells.hC[j].textContent = String(3 * j);
				cells.hC[j].classList.add("on");
			}
			await sleep(d / 2);
		}

		setPhase(5);
		log("cudaFree(d_a, d_b, d_c): GPU buffers released.");
		await sleep(d);
		if (!alive()) return;

		const ok = cells.hC.every((c, j) => Number(c.textContent) === 3 * j);
		log(
			ok
				? `Verification passed: ${N} of ${N} results are correct (c[i] = a[i] + b[i]).`
				: "Verification failed.",
			ok ? "ok" : "",
		);
		busy = false;
		RUN.disabled = false;
	}

	RUN.addEventListener("click", run);
	RESET.addEventListener("click", () => {
		runId++;
		busy = false;
		RUN.disabled = false;
		build();
	});
	N_SEL.addEventListener("change", () => !busy && build());
	T_SEL.addEventListener("change", () => !busy && build());
	build();
}

/* ================= CUDA release history ================= */
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const MONTHS_LONG = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* GPU generations targeted by each group of toolkit versions */
const ERAS = [
	{ min: 1, max: 4, cls: "era-1", name: "Tesla and Fermi" },
	{ min: 5, max: 7, cls: "era-2", name: "Kepler and Maxwell" },
	{ min: 8, max: 10, cls: "era-3", name: "Pascal, Volta and Turing" },
	{ min: 11, max: 11, cls: "era-4", name: "Ampere" },
	{ min: 12, max: 13, cls: "era-5", name: "Hopper and Blackwell" },
];

/* Every major.minor CUDA Toolkit release with its release month (NVIDIA CUDA Toolkit Archive).
   Patch "Update" releases are not listed. Notes are checked against NVIDIA release notes and blog posts. */
const RAW_RELEASES = [
	{
		v: "1.0",
		d: "2007-06",
		note: "First CUDA toolkit: a C-like language, the nvcc compiler and runtime and driver APIs for G80 GPUs (GeForce 8800). The first public SDK appeared in February 2007.",
	},
	{
		v: "1.1",
		d: "2007-12",
		note: "Adds 32-bit atomic operations on global memory, so many threads can safely update the same value.",
	},
	{
		v: "2.0",
		d: "2008-08",
		note: "Adds double-precision (64-bit) arithmetic on GT200 GPUs, plus Windows Vista and Mac OS X support.",
	},
	{ v: "2.1", d: "2009-01" },
	{ v: "2.2", d: "2009-05" },
	{ v: "2.3", d: "2009-06" },
	{
		v: "3.0",
		d: "2010-03",
		note: "Adds support for Fermi GPUs (ECC memory, concurrent kernels) and C++ class and template inheritance.",
	},
	{ v: "3.1", d: "2010-06" },
	{ v: "3.2", d: "2010-11" },
	{
		v: "4.0",
		d: "2011-05",
		note: "Adds Unified Virtual Addressing, giving CPU and GPU memory one shared address space.",
	},
	{ v: "4.1", d: "2012-01" },
	{ v: "4.2", d: "2012-04" },
	{
		v: "5.0",
		d: "2012-10",
		note: "Adds Dynamic Parallelism on Kepler GK110 GPUs, so a GPU kernel can launch other kernels.",
	},
	{ v: "5.5", d: "2013-07" },
	{
		v: "6.0",
		d: "2014-04",
		note: "Adds Unified Memory: one pointer that works on both CPU and GPU, with data moved automatically.",
	},
	{ v: "6.5", d: "2014-08" },
	{
		v: "7.0",
		d: "2015-03",
		note: "Adds C++11 support (auto and lambda), the cuSOLVER library and runtime compilation.",
	},
	{ v: "7.5", d: "2015-09" },
	{
		v: "8.0",
		d: "2016-09",
		note: "Adds Pascal GPUs (Tesla P100), NVLink, FP16 and INT8 arithmetic, and the nvGRAPH library.",
	},
	{
		v: "9.0",
		d: "2017-09",
		note: "Adds Volta GPUs (Tesla V100) with Tensor Cores, and the Cooperative Groups programming model.",
	},
	{ v: "9.1", d: "2017-12" },
	{ v: "9.2", d: "2018-05" },
	{
		v: "10.0",
		d: "2018-09",
		note: "Adds Turing GPUs (RTX 20 series) with Tensor Cores, the CUDA Graphs task model and the nvJPEG library.",
	},
	{ v: "10.1", d: "2019-02" },
	{
		v: "10.2",
		d: "2019-11",
		note: "The last CUDA release with macOS support.",
	},
	{
		v: "11.0",
		d: "2020-06",
		note: "Adds Ampere GPUs (A100) and Multi-Instance GPU (MIG), which splits one GPU into isolated instances.",
	},
	{
		v: "11.1",
		d: "2020-09",
		note: "Adds support for GeForce RTX 30 series GPUs.",
	},
	{
		v: "11.2",
		d: "2020-12",
		note: "Adds the stream-ordered memory allocator (cudaMallocAsync and cudaFreeAsync).",
	},
	{ v: "11.3", d: "2021-04" },
	{ v: "11.4", d: "2021-06" },
	{ v: "11.5", d: "2021-10" },
	{ v: "11.6", d: "2022-01" },
	{ v: "11.7", d: "2022-05" },
	{
		v: "11.8",
		d: "2022-10",
		note: "Adds Ada Lovelace (sm_89) and Hopper (sm_90) GPU support.",
	},
	{
		v: "12.0",
		d: "2022-12",
		note: "Starts CUDA 12 with Hopper (H100) features such as thread block clusters and the Tensor Memory Accelerator.",
	},
	{ v: "12.1", d: "2023-02" },
	{ v: "12.2", d: "2023-06" },
	{ v: "12.3", d: "2023-10" },
	{ v: "12.4", d: "2024-03" },
	{ v: "12.5", d: "2024-05" },
	{ v: "12.6", d: "2024-08" },
	{
		v: "12.8",
		d: "2025-01",
		note: "First CUDA release with native Blackwell support (compute capabilities 10.0 and 12.0).",
	},
	{ v: "12.9", d: "2025-05" },
	{
		v: "13.0",
		d: "2025-08",
		note: "Unifies the Arm toolkit and removes offline compilation for pre-Turing GPUs (Maxwell, Pascal and Volta).",
	},
	{
		v: "13.1",
		d: "2025-12",
		note: "Introduces CUDA Tile, a tile-based programming model with cuTile Python. The driver is no longer bundled on Windows.",
	},
	{
		v: "13.2",
		d: "2026-03",
		note: "Extends CUDA Tile to Ampere and Ada GPUs, and cuTile Python becomes installable from PyPI.",
	},
	{
		v: "13.3",
		d: "2026-05",
		note: "Introduces CUDA Tile C++, and adds C++23 support in NVCC and NVRTC.",
	},
	{
		v: "13.4",
		d: "2026-07",
		note: "Developer preview. The NVIDIA driver is no longer bundled with the toolkit on Linux.",
	},
	{
		v: "13.5",
		d: "2026-11",
		note: "Newest release in this list: PTX ISA 9.5, a precompile option in nvprune, and new CCCL 3.5 algorithms.",
	},
];

const RELEASES = RAW_RELEASES.map((r) => {
	const [year, month] = r.d.split("-").map(Number);
	const major = Number(r.v.split(".")[0]);
	return {
		...r,
		year,
		month,
		major,
		era: ERAS.find((e) => major >= e.min && major <= e.max),
	};
});

const monthsBetween = (a, b) => (b.year - a.year) * 12 + (b.month - a.month);

/* Interactive year chart: one column per year, a chip per release */
function initReleaseTimeline() {
	const FIRST = 2007;
	const LAST = 2026;
	const chart = $("#rtChart");
	const detail = $("#rtDetail");
	const slider = $("#rtYear");
	const playBtn = $("#rtPlay");
	const chips = new Map();
	const columns = new Map();
	let timer = null;

	for (let y = FIRST; y <= LAST; y++) {
		const col = make("div", "rt-col");
		const stack = make("div", "rt-stack");
		RELEASES.filter((r) => r.year === y).forEach((r) => {
			const chip = make("button", `rt-chip ${r.era.cls}`, r.v);
			chip.type = "button";
			chip.title = `CUDA ${r.v}, ${MONTHS_LONG[r.month - 1]} ${r.year}`;
			chip.addEventListener("click", () => selectRelease(r.v));
			stack.appendChild(chip);
			chips.set(r.v, chip);
		});
		col.append(stack, make("div", "rt-year", String(y)));
		chart.appendChild(col);
		columns.set(y, col);
	}

	function selectRelease(v) {
		const i = RELEASES.findIndex((r) => r.v === v);
		if (i < 0) return;
		const r = RELEASES[i];
		const prev = RELEASES[i - 1];
		chips.forEach((el, key) => el.classList.toggle("sel", key === v));

		const head = make("div", "rd-head");
		head.append(
			make("span", `rd-badge ${r.era.cls}`, `CUDA ${r.v}`),
			make("span", "rd-date", `${MONTHS_LONG[r.month - 1]} ${r.year}`),
		);
		const series = make(
			"p",
			"rd-line",
			`Series: CUDA ${r.major}.x (${r.era.name})`,
		);
		const timing = make(
			"p",
			"rd-line",
			prev
				? `Timing: ${plural(monthsBetween(prev, r), "month")} after CUDA ${prev.v} (${MONTHS[prev.month - 1]} ${prev.year})`
				: "Timing: first release in NVIDIA's archive.",
		);
		const note = make(
			"p",
			"rd-note",
			r.note ||
				`Minor update in the ${r.major}.x series. See NVIDIA's release notes for the full change list.`,
		);
		detail.replaceChildren(head, series, timing, note);
	}

	function setYear(y) {
		const done = RELEASES.filter((r) => r.year <= y);
		columns.forEach((col, year) => {
			col.classList.toggle("future", year > y);
			col.classList.toggle("now", year === y);
		});
		$("#rtYearOut").textContent = y;
		$("#rtCount").textContent = done.length;
		$("#rtLatest").textContent = done.length
			? `CUDA ${done[done.length - 1].v}`
			: "None yet";
	}

	function stop() {
		clearInterval(timer);
		timer = null;
		playBtn.textContent = "Play timeline";
	}

	slider.addEventListener("input", () => {
		stop();
		setYear(Number(slider.value));
	});

	playBtn.addEventListener("click", () => {
		if (timer) {
			stop();
			return;
		}
		if (Number(slider.value) >= LAST) slider.value = FIRST;
		playBtn.textContent = "Pause";
		setYear(Number(slider.value));
		timer = setInterval(() => {
			const next = Number(slider.value) + 1;
			if (next > LAST) {
				stop();
				return;
			}
			slider.value = next;
			setYear(next);
		}, 700);
	});

	setYear(Number(slider.value));
	selectRelease("13.5");
}

/* ================= Boot ================= */
genSquares();
genDie();
genDots();
highlightCode();
initNav();
initThreadDemo();
initWarp();
initWorkflow();
initSimulator();
initReleaseTimeline();

show(0);
