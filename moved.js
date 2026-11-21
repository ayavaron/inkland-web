// The old GitHub Pages copy (ayavaron.github.io/inkland-web) points players to itch.io
// (Aya, 2026-11-20). Shown only on github.io, and never on the ?studio / ?an9 style debug
// pages, so the itch copy and the debug tools are untouched. "Keep playing here" closes it.
(function () {
	if (!location.hostname.endsWith("github.io") || location.search) return;
	var ITCH = "https://raezen.itch.io/exit-hunters";
	function show() {
		var box = document.createElement("div");
		box.id = "moved";
		box.style.cssText = "position:fixed;inset:0;z-index:100;display:flex;align-items:flex-start;" +
			"background:#12335c;color:#fff;font-family:'League Spartan',sans-serif;" +
			"padding:12vh 14vw;box-sizing:border-box;flex-direction:column;";
		box.innerHTML =
			'<div style="font-weight:900;font-size:min(76px,11vw);line-height:1">EXIT HUNTERS</div>' +
			'<div style="color:#ff8c42;font-weight:600;font-size:min(24px,5vw);margin-top:6px">HAS MOVED TO ITCH.IO</div>' +
			'<p style="font-size:min(20px,4.5vw);line-height:1.4;max-width:34em;margin:32px 0 24px">' +
			'The game now lives on its itch.io page. Saves made on this site stay here; on itch.io you start fresh.</p>' +
			'<a href="' + ITCH + '" target="_top" style="display:inline-block;border:3px solid #fff;color:#fff;' +
			'text-decoration:none;font-weight:700;font-size:min(24px,5vw);padding:10px 20px">PLAY ON ITCH.IO</a>' +
			'<a href="#" id="moved-stay" style="color:#fff;opacity:.75;font-size:min(16px,4vw);margin-top:24px">' +
			'Keep playing here</a>';
		document.body.appendChild(box);
		document.getElementById("moved-stay").onclick = function (e) {
			e.preventDefault();
			box.remove();
		};
	}
	if (document.body) show();
	else document.addEventListener("DOMContentLoaded", show);
})();
