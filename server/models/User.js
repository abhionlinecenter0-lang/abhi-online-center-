
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["admin", "staff", "member"],
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
