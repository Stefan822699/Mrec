(async () => {
  const status = document.getElementById("status");
  const id = new URLSearchParams(window.location.search).get("v");
  if (!id) { status.textContent = "No video specified."; return; }

  // Logged-in users get a link back to their dashboard
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const home = document.getElementById("home-link");
    home.href = "dashboard.html";
    home.textContent = "Dashboard";
  }

  const { data: video, error } = await db.from("videos").select("*").eq("id", id).maybeSingle();
  if (error || !video) { status.textContent = "Video not found."; return; }

  const url = db.storage.from("videos").getPublicUrl(video.file_path).data.publicUrl;
  const player = document.getElementById("player");
  player.src = url;
  player.style.display = "block";
  status.style.display = "none";

  document.title = "MREC — " + video.title;
  document.getElementById("video-title").textContent = video.title;
  document.getElementById("video-meta").textContent =
    `${(video.views || 0) + 1} views · ${new Date(video.created_at).toLocaleDateString()}`;

  const actions = document.getElementById("watch-actions");
  actions.style.display = "flex";
  const copy = document.getElementById("copy-btn");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copy.textContent = "Copied!";
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
    setTimeout(() => (copy.textContent = "Copy link"), 1500);
  });

  db.rpc("increment_views", { video_id: id });
})();
