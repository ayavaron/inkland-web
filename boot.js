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
