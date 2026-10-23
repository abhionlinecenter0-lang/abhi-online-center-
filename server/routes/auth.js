
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Login
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required"
      });
    }

    const user = await User.findOne({ username }).select("+passwordHash");

    if (!user || !user.active) {
      return res.status(401).json({ error: "Invalid login details" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid login details" });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Admin creates Staff or Member accounts.
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "");
    const allowedRoles = ["staff", "member"];

    if (!name || !username || password.length < 8) {
      return res.status(400).json({
        error: "Name, username and password (minimum 8 characters) are required"
      });
    }

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return res.status(400).json({
        error: "Username must be 3-40 characters: letters, numbers, dot, underscore or hyphen"
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: "Admin can create staff or member accounts only"
      });
    }

    const existing = await User.findOne({ username });

    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      username,
      passwordHash,
      role,
      permissions: Array.isArray(req.body.permissions)
        ? req.body.permissions.filter(p => typeof p === "string").slice(0, 30)
        : []
    });

    return res.status(201).json({
      message: "Account created",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username already exists" });
    }

    console.error("Create user error:", error.message);
    return res.status(500).json({ error: "Could not create account" });
  }
});

export default router;
