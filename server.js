import express from "express";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Konfiguration ---
const DATA_DIR = join(__dirname, "data");
const PROGRESS_FILE = join(DATA_DIR, "progress.json");

// SHA-256 Hash des Passworts "hebendanz2025"
// Zum Aendern: echo -n "DEIN_PASSWORT" | sha256sum
const PASSWORD_HASH =
  "208d9254daf2838d96bdf07cb2fa65f5173d9a1a98668228a4811ebd2445fb4d";

// Sicherstellen dass data/ existiert
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(PROGRESS_FILE)) {
  writeFileSync(PROGRESS_FILE, "{}", "utf-8");
}

// --- Middleware ---
app.use(express.json());

// --- API-Routen ---

// Fortschritt lesen (fuer alle)
app.get("/api/progress", (_req, res) => {
  try {
    const data = readFileSync(PROGRESS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch {
    res.json({});
  }
});

// Fortschritt speichern (nur mit Passwort)
app.post("/api/progress", (req, res) => {
  const password = req.headers["x-edit-password"] || "";
  const hash = createHash("sha256").update(password).digest("hex");

  if (hash !== PASSWORD_HASH) {
    return res.status(403).json({ error: "Falsches Passwort" });
  }

  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
});

// --- Statische Dateien (dist/) ---
const distPath = join(__dirname, "dist");
app.use(express.static(distPath));

// SPA-Fallback: alle anderen Routen -> index.html
app.get("*", (_req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`Lernplan-Server laeuft auf http://localhost:${PORT}`);
});
