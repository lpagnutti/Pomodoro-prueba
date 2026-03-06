import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate VAPID keys if not present
let vapidKeys = {
  publicKey: process.env.VITE_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.log("Generating new VAPID keys...");
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = generated;
  console.log("=========================================");
  console.log("NEW VAPID KEYS GENERATED:");
  console.log("PUBLIC:", vapidKeys.publicKey);
  console.log("PRIVATE:", vapidKeys.privateKey);
  console.log("Please add these to your .env file!");
  console.log("=========================================");
}

webpush.setVapidDetails(
  "mailto:lpagnutti@gmail.com",
  vapidKeys.publicKey!,
  vapidKeys.privateKey!
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for scheduled notifications (for demo purposes)
  // In a real app, use a persistent job queue
  const scheduledNotifications = new Map<string, NodeJS.Timeout>();

  app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/notifications/subscribe", (req, res) => {
    // Subscription logic - usually you'd save this to a database
    res.status(201).json({});
  });

  app.post("/api/notifications/schedule", (req, res) => {
    const { subscription, delay, title, body, userId } = req.body;

    if (!subscription || !delay) {
      return res.status(400).json({ error: "Missing subscription or delay" });
    }

    // Cancel existing notification for this user if any
    if (userId && scheduledNotifications.has(userId)) {
      clearTimeout(scheduledNotifications.get(userId));
    }

    const timeout = setTimeout(async () => {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title, body })
        );
        if (userId) scheduledNotifications.delete(userId);
      } catch (error) {
        console.error("Error sending push notification:", error);
      }
    }, delay);

    if (userId) {
      scheduledNotifications.set(userId, timeout);
    }

    res.status(200).json({ success: true });
  });

  app.post("/api/notifications/cancel", (req, res) => {
    const { userId } = req.body;
    if (userId && scheduledNotifications.has(userId)) {
      clearTimeout(scheduledNotifications.get(userId));
      scheduledNotifications.delete(userId);
    }
    res.status(200).json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
