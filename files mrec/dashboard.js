const MAX_SIZE = 50 * 1024 * 1024; // Supabase free plan limit
let currentUser = null;

const grid = document.getElementById("video-grid");
const emptyMsg = document.getElementById("empty");
const uploadMsg = document.getElementById("upload-msg");
const fileInput = document.getElementById("video-file");
const titleInput = document.getElementById("video-title");
const dropText = document.getElementById("drop-text");

function fmtSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function shareLink(id) {
  return new URL("watch.html?v=" + id, window.location.href).href;
}
function note(message, isError) {
  uploadMsg.textContent = message;
  uploadMsg.classList.toggle("error-note", Boolean(isError));
}
function videoUrl(path) {
  return db.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

// ---- Auth gate ----
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return window.location.replace("index.html");
  currentUser = session.user;
  const name = (currentUser.user_metadata && currentUser.user_metadata.username) || currentUser.email;
  document.getElementById("welcome").textContent = `Welcome back, ${name}`;
  document.getElementById("user-name").textContent = name;
  document.getElementById("dash").style.visibility = "visible";
  loadVideos();
})();

db.auth.onAuthStateChange((event, session) => {
  if (!session) window.location.replace("index.html");
});
document.getElementById("logout-btn").addEventListener("click", () => db.auth.signOut());

// ---- Load + render videos ----
async function loadVideos() {
  const { data, error } = await db
    .from("videos")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = "Could not load videos: " + error.message;
    return;
  }

  grid.innerHTML = "";
  emptyMsg.style.display = data.length ? "none" : "block";
  emptyMsg.textContent = "No videos yet. Upload your first one above.";

  document.getElementById("stat-videos").textContent = data.length;
  document.getElementById("stat-views").textContent = data.reduce((n, v) => n + (v.views || 0), 0);
  document.getElementById("stat-size").textContent = fmtSize(data.reduce((n, v) => n + (v.size_bytes || 0), 0));

  data.forEach(v => grid.appendChild(renderCard(v)));
}

function renderCard(v) {
  const card = document.createElement("article");
  card.className = "video-card";

  const link = document.createElement("a");
  link.href = "watch.html?v=" + v.id;
  link.className = "thumb";
  const vid = document.createElement("video");
  vid.src = videoUrl(v.file_path) + "#t=0.5";
  vid.preload = "metadata";
  vid.muted = true;
  link.appendChild(vid);

  const body = document.createElement("div");
  body.className = "video-body";
  const title = document.createElement("h3");
  title.textContent = v.title;
  const meta = document.createElement("p");
  meta.textContent = `${fmtDate(v.created_at)} · ${v.views || 0} views · ${fmtSize(v.size_bytes || 0)}`;

  const actions = document.createElement("div");
  actions.className = "video-actions";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "small-button";
  copy.textContent = "Copy link";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareLink(v.id));
      copy.textContent = "Copied!";
    } catch {
      window.prompt("Copy this link:", shareLink(v.id));
    }
    setTimeout(() => (copy.textContent = "Copy link"), 1500);
  });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "small-button danger";
  del.textContent = "Delete";
  del.addEventListener("click", () => deleteVideo(v));

  actions.append(copy, del);
  body.append(title, meta, actions);
  card.append(link, body);
  return card;
}

async function deleteVideo(v) {
  if (!confirm(`Delete "${v.title}"? This can't be undone.`)) return;
  const { error: fileError } = await db.storage.from("videos").remove([v.file_path]);
  if (fileError) return alert("Could not delete file: " + fileError.message);
  const { error } = await db.from("videos").delete().eq("id", v.id);
  if (error) return alert("Could not delete video: " + error.message);
  loadVideos();
}

// ---- Upload ----
fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f) return;
  dropText.textContent = `${f.name} (${fmtSize(f.size)})`;
  if (!titleInput.value.trim()) titleInput.value = f.name.replace(/\.[^.]+$/, "").slice(0, 80);
});

document.getElementById("upload-form").addEventListener("submit", async event => {
  event.preventDefault();
  const file = fileInput.files[0];
  const title = titleInput.value.trim();

  if (!file) return note("Choose a video file first.", true);
  if (!file.type.startsWith("video/")) return note("That file is not a video.", true);
  if (file.size > MAX_SIZE) return note("Video is too big. Max size is 50 MB.", true);
  if (!title) return note("Give your video a title.", true);

  const button = document.getElementById("upload-btn");
  button.disabled = true;
  note("Uploading... please wait.", false);

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upError } = await db.storage.from("videos").upload(path, file, { contentType: file.type });
  if (upError) {
    button.disabled = false;
    return note("Upload failed: " + upError.message, true);
  }

  const { error: rowError } = await db.from("videos").insert({ user_id: currentUser.id, title, file_path: path, storage_path: path, size_bytes: file.size });
  button.disabled = false;
  if (rowError) {
    await db.storage.from("videos").remove([path]);
    return note("Could not save video: " + rowError.message, true);
  }

  note("Uploaded! Your video is ready to share.", false);
  fileInput.value = "";
  titleInput.value = "";
  dropText.textContent = "Click to choose a video (max 50 MB)";
  loadVideos();
});
