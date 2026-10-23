
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project structure:
// project/
//   package.json
//   public/index.html
//   server/server.js

const publicPath = path.resolve(__dirname, "../public");
const indexPath = path.join(publicPath, "index.html");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// Health check: Render can use this to verify the server.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "AR Library Management Software",
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection status.
app.get("/api/status", (req, res) => {
  res.status(200).json({
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "not connected"
  });
});

// API 404 response.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

// Send the website page for browser routes.
app.get("*", (req, res) => {
  if (!fs.existsSync(indexPath)) {
    console.error("Website file not found:", indexPath);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>AR Library Management</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:30px">
          <h2>AR Library Management</h2>
          <p>The website file public/index.html was not found.</p>
          <p>Please create index.html inside the public folder in GitHub.</p>
        </body>
      </html>
    `);
  }

  return res.sendFile(indexPath);
});

// Central error handler.
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Internal server error"
  });
});

const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected successfully");
    } else {
      console.warn(
        "MONGODB_URI is missing. Add it in Render Environment settings."
      );
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
      console.log("Public folder:", publicPath);
      console.log("Index file:", indexPath);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
