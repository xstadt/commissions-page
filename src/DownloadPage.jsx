import { useEffect, useMemo, useState } from "react";
import { downloadZip } from "client-zip";
import { client } from "./sanityClient";

/*
 * ========================================
 * CLIENT DOWNLOADS — /downloads/<slug>
 * ========================================
 *
 * A private page where one customer collects their finished files
 * (e.g. Photoshop layers). Everything on it is managed in Sanity
 * Studio under "Client Downloads" — no code changes are needed to
 * add a customer or another folder.
 *
 * Like the concept review pages, this mounts on its own from
 * main.jsx, so it brings its own styling. The link itself (a long,
 * random address nobody is shown) is what keeps it private. It is
 * not a lock: anyone who has the link can download.
 */

// Published edits should show up right away rather than sitting in
// the CDN cache for a few minutes.
const liveClient = client.withConfig({ useCdn: false });

const FILE = `{ "name": asset->originalFilename, "url": asset->url, "size": asset->size }`;
const QUERY = `*[_type == "clientDownload" && slug.current == $slug][0]{
  clientName, status, message,
  folders[]{
    name,
    "files": files[]${FILE},
    "subfolders": subfolders[]{ name, "files": files[]${FILE} }
  }
}`;

const fmtSize = (n) => {
  if (!n || n < 1024) return `${n || 0} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
};

// Sanity returns folders as arrays; the page wants a tree it can walk.
// Folder and file names come from the artist, so strip path separators.
const clean = (s) => String(s || "").replace(/[\\/]+/g, "-").trim();
const toFiles = (list) => (list || []).filter((f) => f?.url).map((f) => ({ ...f, name: clean(f.name) || "file" }));

function buildTree(folders) {
  return (folders || []).map((f) => ({
    name: clean(f.name) || "Folder",
    files: toFiles(f.files),
    folders: (f.subfolders || []).map((s) => ({
      name: clean(s.name) || "Subfolder",
      files: toFiles(s.files),
      folders: [],
    })),
  }));
}

const allFiles = (node) => [...node.files, ...node.folders.flatMap(allFiles)];

// Give every file its path inside the zip, e.g. "Cover/Alternates/layer1.psd".
function withPaths(node, prefix) {
  const base = prefix ? `${prefix}/${node.name}` : node.name;
  return [
    ...node.files.map((f) => ({ ...f, zipPath: `${base}/${f.name}` })),
    ...node.folders.flatMap((n) => withPaths(n, base)),
  ];
}

async function saveZip(name, entries, onProgress) {
  // Files stream from storage into the zip. With the File System Access
  // API (Chrome/Edge) the zip streams straight to disk, so multi-GB PSD
  // folders don't have to fit in memory. Other browsers fall back to an
  // in-memory blob.
  const zip = downloadZip(entries.map((e) => ({
    name: e.zipPath,
    input: fetch(e.url).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch ${e.zipPath}`);
      onProgress?.(e.zipPath);
      return r;
    }),
    lastModified: new Date(),
  })));
  const fileName = `${name}.zip`;
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: "Zip archive", accept: { "application/zip": [".zip"] } }],
    });
    await zip.body.pipeTo(await handle.createWritable());
    return;
  }
  const url = URL.createObjectURL(await zip.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  .dl-root {
    --bg: #0e0d0b; --surface: #181613; --border: #2e2a24;
    --text: #e8dfd4; --text-dim: #9a8e82;
    --sage: #8fad8b; --lavender: #b8a5cc; --dusty-rose: #d4a0a0;
    --warm-gold: #dbc078; --soft-teal: #7fb5b0;

    font-family: 'Inter', sans-serif;
    background: var(--bg); color: var(--text);
    min-height: 100vh; padding: 48px 20px 64px;
    max-width: 760px; margin: 0 auto;
  }
  .dl-root * { margin: 0; padding: 0; box-sizing: border-box; }

  .dl-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; }
  .dl-title { font-size: clamp(32px, 8vw, 52px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 14px; }
  .dl-title .flow {
    background: linear-gradient(135deg, var(--lavender), var(--dusty-rose), var(--warm-gold), var(--sage));
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .dl-sub { font-size: 15px; line-height: 1.8; color: var(--text-dim); font-weight: 300; white-space: pre-line; margin-bottom: 32px; max-width: 560px; }

  .dl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 26px 24px; }
  .dl-card p { font-size: 15px; line-height: 1.8; color: var(--text-dim); font-weight: 300; }
  .dl-skel { background: linear-gradient(90deg, var(--surface), #22201c, var(--surface)); background-size: 200% 100%; animation: dl-shimmer 1.4s infinite; border-radius: 10px; }
  @keyframes dl-shimmer { to { background-position: -200% 0; } }

  .dl-all { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 18px 22px; margin-bottom: 20px; }
  .dl-all-title { font-weight: 700; margin-bottom: 2px; }
  .dl-meta { font-size: 12px; color: var(--text-dim); }

  .dl-btn { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 99px; padding: 9px 18px; cursor: pointer; text-decoration: none; white-space: nowrap; transition: border-color .15s, background .15s; display: inline-block; }
  .dl-btn:hover:not(:disabled) { border-color: var(--sage); background: rgba(143,173,139,.08); }
  .dl-btn:disabled { opacity: .6; cursor: progress; }
  .dl-btn-primary { border: none; color: #0e0d0b; letter-spacing: .5px; background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender)); }
  .dl-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender)); filter: brightness(1.1); }
  .dl-btn-small { padding: 6px 14px; font-size: 12px; }

  .dl-zip { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 4px; max-width: 100%; }
  .dl-zip-progress { font-size: 11px; color: var(--text-dim); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dl-zip-error { font-size: 12px; color: var(--dusty-rose); text-align: right; }

  .dl-folder { border: 1px solid var(--border); border-radius: 20px; background: var(--surface); margin-bottom: 14px; overflow: hidden; }
  .dl-folder .dl-folder { margin: 10px 0 0; border-radius: 14px; background: transparent; }
  .dl-folder-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; flex-wrap: wrap; }
  .dl-toggle { display: flex; align-items: baseline; gap: 10px; background: none; border: none; color: inherit; font: inherit; cursor: pointer; text-align: left; flex: 1; min-width: 0; flex-wrap: wrap; }
  .dl-chev { display: inline-block; color: var(--text-dim); transition: transform .15s; width: 10px; }
  .dl-chev.dl-open { transform: rotate(90deg); }
  .dl-folder-name { font-weight: 700; word-break: break-word; }
  .dl-top > .dl-folder-head .dl-folder-name { font-size: 17px; }
  .dl-folder-body { padding: 0 18px 16px; }
  .dl-files { list-style: none; }
  .dl-file { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--border); }
  .dl-files > .dl-file:first-child { border-top: none; }
  .dl-folder-body > .dl-folder + .dl-files > .dl-file:first-child { border-top: 1px solid var(--border); margin-top: 10px; }
  .dl-file-name { flex: 1; min-width: 0; font-size: 14px; word-break: break-word; }
  .dl-file-size { font-size: 12px; color: var(--text-dim); white-space: nowrap; }
  @media (max-width: 480px) { .dl-file { flex-wrap: wrap; } .dl-file-name { flex-basis: 100%; } .dl-file-size { flex: 1; } }
`;

function ZipButton({ label, name, entries, primary }) {
  const [state, setState] = useState({ busy: false, current: "", error: "" });
  const run = async () => {
    setState({ busy: true, current: "", error: "" });
    try {
      await saveZip(name, entries, (current) => setState((s) => ({ ...s, current })));
      setState({ busy: false, current: "", error: "" });
    } catch (e) {
      // Closing the save dialog is not an error worth shouting about.
      setState({
        busy: false, current: "",
        error: e.name === "AbortError" ? "" : "Download failed — try again, or download the files one by one.",
      });
    }
  };
  return (
    <span className="dl-zip">
      <button className={`dl-btn ${primary ? "dl-btn-primary" : ""}`} onClick={run} disabled={state.busy}>
        {state.busy ? "Preparing zip…" : label}
      </button>
      {state.busy && state.current && <span className="dl-zip-progress">{state.current.split("/").at(-1)}</span>}
      {state.error && <span className="dl-zip-error">{state.error}</span>}
    </span>
  );
}

function FileList({ files }) {
  if (!files.length) return null;
  return (
    <ul className="dl-files">
      {files.map((f) => (
        <li className="dl-file" key={f.url}>
          <span className="dl-file-name">{f.name}</span>
          <span className="dl-file-size">{fmtSize(f.size)}</span>
          {/* ?dl= makes the CDN send it as a download with the original name */}
          <a className="dl-btn dl-btn-small" href={`${f.url}?dl=${encodeURIComponent(f.name)}`}>Download</a>
        </li>
      ))}
    </ul>
  );
}

function Folder({ node, parentPath, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const files = allFiles(node);
  const total = files.reduce((s, f) => s + (f.size || 0), 0);
  const entries = withPaths(node, parentPath);
  return (
    <div className={`dl-folder ${depth === 0 ? "dl-top" : ""}`}>
      <div className="dl-folder-head">
        <button className="dl-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className={`dl-chev ${open ? "dl-open" : ""}`}>›</span>
          <span className="dl-folder-name">{node.name}</span>
          <span className="dl-meta">{files.length} file{files.length === 1 ? "" : "s"} · {fmtSize(total)}</span>
        </button>
        {files.length > 0 && <ZipButton label="Download folder" name={node.name} entries={entries} />}
      </div>
      {open && (
        <div className="dl-folder-body">
          {node.folders.map((sub) => (
            <Folder key={sub.name} node={sub} parentPath={parentPath ? `${parentPath}/${node.name}` : node.name} depth={depth + 1} />
          ))}
          <FileList files={node.files} />
        </div>
      )}
    </div>
  );
}

function Message({ title, body }) {
  return (
    <div className="dl-root">
      <style>{STYLES}</style>
      <div className="dl-card" style={{ marginTop: "18vh", textAlign: "center" }}>
        <h1 className="dl-title" style={{ fontSize: 28, letterSpacing: -0.5 }}>{title}</h1>
        <p>{body}</p>
      </div>
    </div>
  );
}

export default function DownloadPage({ slug }) {
  // "loading" -> "ready", with "missing", "archived" and "error" as dead ends.
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);

  // Keeps the page out of search results, alongside the header in vercel.json.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    liveClient
      .fetch(QUERY, { slug })
      .then((found) => {
        if (cancelled) return;
        if (!found) return setPhase("missing");
        if (found.status === "archived") return setPhase("archived");
        document.title = `${found.clientName} — Your files`;
        setData(found);
        setPhase("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Download page lookup failed:", err);
        setPhase("error");
      });
    return () => { cancelled = true; };
  }, [slug]);

  const tree = useMemo(() => buildTree(data?.folders), [data]);

  if (phase === "missing") {
    return <Message title="Nothing here" body="This link isn't valid. Double-check that you copied the whole link, or ask for it to be sent again." />;
  }
  if (phase === "archived") {
    return <Message title="No longer available" body="These downloads have been closed out. Get in touch with Visual Frequencies Studios if you need access again." />;
  }
  if (phase === "error") {
    return <Message title="Couldn't load your files" body="Something went wrong on our end. Please refresh and try again in a moment." />;
  }
  if (phase === "loading") {
    return (
      <div className="dl-root">
        <style>{STYLES}</style>
        <div className="dl-skel" style={{ height: 14, width: "30%", marginBottom: 14 }} />
        <div className="dl-skel" style={{ height: 48, width: "60%", marginBottom: 30 }} />
        <div className="dl-skel" style={{ height: 90, marginBottom: 14 }} />
        <div className="dl-skel" style={{ height: 90 }} />
      </div>
    );
  }

  const everything = tree.flatMap((n) => withPaths(n, ""));
  const total = everything.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div className="dl-root">
      <style>{STYLES}</style>
      <div className="dl-eyebrow">Your files</div>
      <h1 className="dl-title"><span className="flow">{data.clientName}</span></h1>
      <p className="dl-sub">
        {data.message || "Download files one at a time, or grab a whole folder as a zip."}
      </p>

      {everything.length === 0 ? (
        <div className="dl-card"><p>Your files are still being added. Check back soon.</p></div>
      ) : (
        <>
          <div className="dl-all">
            <div>
              <div className="dl-all-title">Everything</div>
              <div className="dl-meta">{everything.length} file{everything.length === 1 ? "" : "s"} · {fmtSize(total)}</div>
            </div>
            <ZipButton primary label="Download all" name={`${clean(data.clientName)} - files`} entries={everything} />
          </div>
          {tree.map((node) => <Folder key={node.name} node={node} parentPath="" />)}
        </>
      )}
    </div>
  );
}
