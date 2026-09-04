import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import { supabase } from "./database/supabase";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "MediKiosk API is running 🚀",
  });
});

app.get("/api/test/database", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .limit(5);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Supabase connected successfully 🚀",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MediKiosk backend running on port ${PORT}`);
});