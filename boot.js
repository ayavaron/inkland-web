/* EXIT HUNTERS: the web page's boot script (GPU-11, docs/gpu_board_plan.md). The page loads it in
   its <head> (export_presets.cfg, html/head_include), before the engine; publish_web.sh copies it
   next to index.html.

   1. The pixel-ratio cap. The engine sizes its canvas by window.devicePixelRatio, and the game
      scales its interface by the same number (ui/main.gd _apply_mobile_scale). A phone at 3 (or a
      4K screen at 2.5) draws 2 to 3 times the pixels of the same page at 2, for a picture the eye
      cannot tell apart at that size. Thus the page reports at most PIXEL_RATIO_CAP: the engine
      and the interface both read the capped number, so the layout stays the same and the browser
      stretches the picture. The true number stays readable as window.inklandPixelRatio().
   2. No WebGL 2. The 3D board needs WebGL 2. Without it the engine does not start, and its own
      notice is a developer message. This script replaces that notice with the game's.
   3. The warm-up (Aya's rule: what shows the first time is made at the loading screen). The
      engine's page removes its loading screen as soon as the engine runs; this puts it back
      until the game's warm-up is done (ui/warm_up.gd calls inklandWarm(progress), then
      inklandWarmDone()), at most WARM_MAX_MS.

      SETTINGS > PIXEL RATIO changes it (Aya, 2026-11-13: "Default cap at 2, add to 'settings'
      options"): inklandSetPixelRatioCap(n) applies it at once and keeps it in localStorage, so the
      next visit starts with it before the engine does (the game's own save is not readable yet).
   Test hooks (query string): ?dpr=N sets the cap for this visit (0: no cap); ?nowebgl acts as a
   browser without WebGL 2. */
(function () {
	"use strict";
	var PIXEL_RATIO_CAP = 2;
	var q = window.location.search || "";

	// --- 1. The pixel-ratio cap ---------------------------------------------------------------
	var STORE_KEY = "inkland.pixelRatioCap";
	var cap = PIXEL_RATIO_CAP;
	try {
		var kept = window.localStorage.getItem(STORE_KEY);
		if (kept !== null && !isNaN(parseFloat(kept))) {
			cap = parseFloat(kept);
		}
	} catch (e) { /* (no storage: the default) */ }
	var m = q.match(/[?&]dpr=([0-9.]+)/);
	if (m) {
		cap = parseFloat(m[1]);
	}
	var desc = null;
	try {
		desc = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
	} catch (e) { /* (no descriptor: leave the browser's number) */ }
	var trueRatio = function () {
		return (desc && desc.get ? desc.get.call(window) : 1) || 1;
	};
	window.inklandPixelRatio = trueRatio;
	window.inklandPixelRatioCap = 0;
	var capped = false;
	if (desc && desc.get && desc.configurable) {
		try {
			Object.defineProperty(window, "devicePixelRatio", {
				configurable: true,
				enumerable: desc.enumerable,
				get: function () {
					return cap > 0 ? Math.min(trueRatio(), cap) : trueRatio();
				},
			});
			capped = true;
			window.inklandPixelRatioCap = cap;
		} catch (e) { /* (a browser that refuses: no cap) */ }
	}
	// The cap from SETTINGS (0: none): kept for the next visit, and applied now (the engine and
	// the game size the canvas again on a resize). False where the browser refused the cap.
	window.inklandSetPixelRatioCap = function (n) {
		try {
			window.localStorage.setItem(STORE_KEY, String(n));
		} catch (e) { /* (no storage: this visit only) */ }
		if (!capped || n === cap) {
			return capped;
		}
		cap = n;
		window.inklandPixelRatioCap = n;
		window.dispatchEvent(new Event("resize"));
		return true;
	};

	// --- 2. No WebGL 2 ------------------------------------------------------------------------
	if (/[?&]nowebgl\b/.test(q)) {
		var get = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (kind) {
			if (kind === "webgl2") {
				return null;
			}
			return get.apply(this, arguments);
		};
	}
	var hasWebGL2 = function () {
		try {
			return !!document.createElement("canvas").getContext("webgl2");
		} catch (e) {
			return false;
		}
	};
	var LINES = [
		"This browser cannot draw the game. The game needs WebGL 2, and this browser does not have it.",
		"Open the game in a new version of Chrome, Firefox, Edge or Safari.",
		"If this browser is new, turn on hardware acceleration in its settings. Then open the game again.",
	];
	var showNotice = function () {
		document.documentElement.className += " no-webgl2";
		var notice = document.getElementById("status-notice");
		var status = document.getElementById("status");
		if (!notice || !status) {
			return;
		}
		while (notice.lastChild) {
			notice.removeChild(notice.lastChild);
		}
		LINES.forEach(function (line) {
			var p = document.createElement("p");
			p.appendChild(document.createTextNode(line));
			notice.appendChild(p);
		});
		status.style.visibility = "visible";
		notice.style.display = "block";
		var bar = document.getElementById("status-progress");
		if (bar) {
			bar.style.display = "none";
		}
	};
	var noWebGL = !hasWebGL2();
	if (noWebGL) {
		// (The engine's page script runs at the end of <body> and shows its own notice: this
		// replaces it once the page is read.)
		document.addEventListener("DOMContentLoaded", showNotice);
	}

	// --- 4. The splash (UI-30, Aya's version E, 2026-11-24) -------------------------------------
	// Six numbered basics beside one baked picture of the game (splash_screen.png, seed 275127 map 1,
	// bake: ui/debug/dispatch.gd --pin-souvenir). It shows from the page's first paint until the
	// player clicks CLICK TO START (ui/main_menu.gd show_gate calls inklandSplashDone). It lies over
	// the loading page and the canvas and takes no clicks, so the game's own gate gets them. The
	// title, LOADING and the bar are the loading page's (loading.css); CLICK TO START is the
	// game's: the splash sits under them on the same grid (1600 x 900 reference, 12 columns of 74
	// with 24 gutters; the board scales down as a whole, and on a narrow window the lines go above
	// the picture). All the words are here, so they change without a new bake.
	var SPLASH = [
		["Time only moves when you act.", 56],
		["Attacks only reach next to you. Pins upgrade them.", 80],
		["Click yourself to wait.", 56],
		["Click an item to use it. Drag it onto the map to get rid of it, unused.", 104],
		["Tooltips dock at the bottom.", 56],
		["Z undo, Shift+R restart. Also on the hotbar.", 80],
	];
	// Where each dot points, in the picture's own 1600 x 900: the wind and tick device, a guard,
	// your orb, hotbar slot 2, the tooltip's seam, Undo and Restart.
	var DOTS = [[928, 796], [664, 372], [1252, 252], [1068, 796], [440, 748], [1538, 796]];
	var splash = null;
	// The page's margins, as the game's menu lays its first frame out (ui/main_menu.gd _margin_x,
	// _margin_y: about 14% of the width and 12% of the height, in whole grid units of 24), so the
	// title and LOADING sit where the game's title and CLICK TO START will: no jump at the handover.
	var U = 24;
	var margins = function () {
		var w = window.innerWidth, h = window.innerHeight;
		return [Math.max(1, Math.round(w * 0.14 / U)) * U, Math.max(1, Math.round(h * 0.12 / U)) * U];
	};
	var fitMargins = function () {
		var m = margins();
		document.documentElement.style.setProperty("--mx", m[0] + "px");
		document.documentElement.style.setProperty("--my", m[1] + "px");
	};
	fitMargins();
	window.addEventListener("resize", fitMargins);
	var fitSplash = function () {
		if (!splash) {
			return;
		}
		var w = window.innerWidth, h = window.innerHeight;
		var m = margins();
		var narrow = w < 900;
		var s = Math.min(1, w / 1600, h / 900);
		splash.className = narrow ? "narrow" : "";
		splash.style.setProperty("--s", String(s));
		splash.style.setProperty("--x0", m[0] + "px");
		splash.style.setProperty("--y0", (m[1] + (narrow ? 156 : 180 * s)) + "px");
	};
	window.inklandSplashDone = function () {
		if (splash) {
			splash.remove();
			splash = null;
			window.removeEventListener("resize", fitSplash);
		}
	};
	var makeSplash = function () {
		if (noWebGL || /[?&]nosplash\b/.test(q) || document.getElementById("splash")) {
			return;
		}
		splash = document.createElement("div");
		splash.id = "splash";
		var list = document.createElement("ol");
		list.className = "sp-list";
		SPLASH.forEach(function (row, i) {
			var li = document.createElement("li");
			li.style.height = row[1] + "px";
			var dot = document.createElement("span");
			dot.className = "sp-dot";
			dot.textContent = String(i + 1);
			var text = document.createElement("span");
			text.className = "sp-text";
			text.textContent = row[0];
			li.appendChild(dot);
			li.appendChild(text);
			list.appendChild(li);
		});
		var pic = document.createElement("div");
		pic.className = "sp-pic";
		var img = document.createElement("img");
		img.src = "splash_screen.png";
		img.alt = "";
		pic.appendChild(img);
		DOTS.forEach(function (d, i) {
			var dot = document.createElement("span");
			dot.className = "sp-dot sp-on";
			dot.textContent = String(i + 1);
			dot.style.left = (d[0] / 16) + "%";
			dot.style.top = (d[1] / 9) + "%";
			pic.appendChild(dot);
		});
		splash.appendChild(list);
		splash.appendChild(pic);
		document.body.appendChild(splash);
		fitSplash();
		window.addEventListener("resize", fitSplash);
	};
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", makeSplash);
	} else {
		makeSplash();
	}

	// --- 3. The warm-up -------------------------------------------------------------------------
	var WARM_MAX_MS = 30000;
	var warmDone = false;
	var held = null;
	window.inklandWarm = function (p) {
		var bar = document.getElementById("status-progress");
		if (held && bar) {
			bar.max = 1;
			bar.value = p;
		}
	};
	window.inklandWarmDone = function () {
		warmDone = true;
		if (held) {
			held.remove();
			held = null;
			var canvas = document.getElementById("canvas");
			if (canvas) {
				canvas.focus();
			}
		}
	};
	document.addEventListener("DOMContentLoaded", function () {
		var status = document.getElementById("status");
		if (noWebGL || !status || !window.MutationObserver) {
			return;
		}
		var watch = new MutationObserver(function () {
			if (status.isConnected) {
				return;
			}
			watch.disconnect();
			if (warmDone) {
				return;
			}
			held = status;   // (the engine runs: the same loading screen back, its bar the warm-up's)
			document.body.appendChild(status);
			status.style.visibility = "visible";
			var bar = document.getElementById("status-progress");
			if (bar) {
				bar.style.display = "block";
				bar.max = 1;
				bar.value = 0;
			}
			setTimeout(window.inklandWarmDone, WARM_MAX_MS);
		});
		watch.observe(document.body, {childList: true});
	});
}());
