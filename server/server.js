import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import libraryRoutes from "./routes/library.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.resolve(__dirname, "../public");
const indexPath = path.join(publicPath, "index.html");

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "AR Library Management Software"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "not connected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/library", libraryRoutes);

app.use(express.static(publicPath));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.get("*", (req, res) => {
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send(
      "Website page missing. Please create public/index.html in GitHub."
    );
  }

  return res.sendFile(indexPath);
});

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) return next(err);

  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    // Create the first Admin only when no Admin exists.
    const adminExists = await User.exists({ role: "admin" });

    if (!adminExists) {
      const username = String(process.env.ADMIN_USERNAME || "")
        .trim()
        .toLowerCase();
      const password = String(process.env.ADMIN_PASSWORD || "");

      if (!username || password.length < 12) {
        console.warn(
          "First Admin not created. Set ADMIN_USERNAME and ADMIN_PASSWORD (minimum 12 characters) in Render Environment."
        );
      } else {
        const passwordHash = await bcrypt.hash(password, 12);

        await User.create({
          username,
          name: "Library Administrator",
          passwordHash,
          role: "admin",
          permissions: ["all"]
        });

        console.log("Initial Admin account created");
      }
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
      console.log("Public folder:", publicPath);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
