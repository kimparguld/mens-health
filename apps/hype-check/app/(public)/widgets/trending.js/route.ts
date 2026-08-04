export const revalidate = 3600;

// Vanilla JS, self-injecting widget. Reads its own <script data-topic data-count>
// attributes via document.currentScript, fetches /api/widgets/trending, and
// renders a small "Reviewed by Hype Check" list at its own location.
const WIDGET_JS = `(function () {
  var script = document.currentScript;
  if (!script) return;
  var topic = script.getAttribute("data-topic") || "";
  var count = script.getAttribute("data-count") || "5";
  var origin = new URL(script.src).origin;

  var container = document.createElement("div");
  container.style.fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  container.style.maxWidth = "360px";
  container.style.border = "1px solid #e5e7eb";
  container.style.borderRadius = "8px";
  container.style.padding = "12px";
  container.innerHTML =
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;">Reviewed by Hype Check</div>' +
    '<div data-mhd-list>Loading\\u2026</div>';
  script.parentNode.insertBefore(container, script.nextSibling);

  var url =
    origin +
    "/api/widgets/trending?count=" +
    encodeURIComponent(count) +
    (topic ? "&topic=" + encodeURIComponent(topic) : "");

  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      var list = container.querySelector("[data-mhd-list]");
      list.innerHTML = "";
      (data.videos || []).forEach(function (video) {
        var link = document.createElement("a");
        link.href = video.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.display = "block";
        link.style.padding = "8px 0";
        link.style.borderBottom = "1px solid #f3f4f6";
        link.style.textDecoration = "none";
        link.style.color = "#111827";

        var title = document.createElement("div");
        title.style.fontSize = "13px";
        title.style.fontWeight = "600";
        title.textContent = video.title;

        var meta = document.createElement("div");
        meta.style.fontSize = "11px";
        meta.style.color = "#6b7280";
        meta.style.marginTop = "2px";
        meta.textContent =
          video.channelTitle + " \\u00b7 " + video.evidenceLabel + " \\u00b7 " + video.riskLevel + " risk";

        link.appendChild(title);
        link.appendChild(meta);
        list.appendChild(link);
      });
      if ((data.videos || []).length === 0) {
        list.textContent = "No videos yet.";
      }
    })
    .catch(function () {
      var list = container.querySelector("[data-mhd-list]");
      if (list) list.textContent = "Unable to load.";
    });
})();`;

export async function GET(): Promise<Response> {
  return new Response(WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
