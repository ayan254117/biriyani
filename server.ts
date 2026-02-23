import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("ramadan_biryani.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS spots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mosque_name TEXT NOT NULL,
    area TEXT NOT NULL,
    food_type TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    images TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auto-cleanup logic: Delete spots every day at 7:00 PM
  const cleanupOldSpots = () => {
    const now = new Date();
    const hours = now.getHours();
    
    // Delete spots not from today
    db.prepare("DELETE FROM spots WHERE date(created_at) < date('now', 'localtime')").run();
    
    // If it's past 7 PM (19:00), delete today's spots too as per user request
    if (hours >= 19) {
      db.prepare("DELETE FROM spots").run();
      console.log("7:00 PM Cleanup: All spots cleared for the day.");
    }
  };

  // Run cleanup on startup and every minute
  cleanupOldSpots();
  setInterval(cleanupOldSpots, 60000);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/spots", (req, res) => {
    try {
      const spots = db.prepare("SELECT * FROM spots ORDER BY created_at DESC").all();
      res.json({ success: true, spots });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/spots", (req, res) => {
    const { mosque, area, type, lat, lng, images } = req.body;

    if (!mosque || !area || !type || !lat || !lng) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO spots (mosque_name, area, food_type, lat, lng, images)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(mosque, area, type, lat, lng, JSON.stringify(images || []));
      res.json({ success: true, id: info.lastInsertRowid, message: "Spot added successfully!" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
