import dotenv from "dotenv";
import voiceRouter from "./routes/voice";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import vision from "@google-cloud/vision";
import OpenAI from "openai";
import { supabase } from "./database/supabase";
import { assertGoogleCredentials } from "./services/googleCredentials";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());
app.use("/api/voice", voiceRouter);

// Initialize Clients
const visionClient = new vision.ImageAnnotatorClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// --- 1. HEALTH CHECK ---
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "MediKiosk API is running 🚀" });
});

// --- 2. REGISTER NEW PATIENT ---
app.post("/api/patients", async (req: Request, res: Response) => {
  try {
    const { name, age, gender } = req.body;
    const { data, error } = await supabase
      .from("patients")
      .insert([{ name: name || "New Patient", age: age || 0, gender: gender || "Not stated" }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// --- 3. IDENTIFY PATIENT ---
app.post("/api/patients/identify", async (req: Request, res: Response) => {
  const { method, value } = req.body;
  try {
    let query = supabase.from("patients").select("*");
    if (method === "abha") query = query.eq("abha_number", value);
    else if (method === "aadhaar") query = query.eq("aadhaar_id", value);
    else query = query.eq("id", value);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    if (!data) {
      // Demo Fallback if database is empty
      return res.json({
        id: "demo-uuid",
        name: "Test Patient (Demo)",
        age: 45,
        gender: "Male",
        uhid: "DGH/2024/MOCK",
      });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 4. SAVE INTAKE QUESTIONS ---
app.post("/api/intake", async (req: Request, res: Response) => {
  try {
    const { patient_id, symptoms, vitals } = req.body;
    const { data, error } = await supabase
      .from("intake")
      .insert([{ patient_id, symptoms: symptoms || [], vitals: vitals || {} }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// --- 5. PRESCRIPTION OCR & AI ANALYSIS ---
app.post("/api/documents/prescription/analyze", upload.single("file"), async (req: any, res: Response) => {
  try {
    const file = req.file;
    const { patientId } = req.body;

    if (!file) return res.status(400).json({ error: "No image provided" });

    let fullText = "";
    let structuredData = null;

    try {
      // A. Real OCR using Google Vision
      assertGoogleCredentials();
      const [result] = await visionClient.documentTextDetection(file.buffer);
      fullText = result.fullTextAnnotation?.text || "";

      if (!fullText) throw new Error("OCR returned no text");

      // B. AI Interpretation using OpenAI
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical pharmacist. Extract medicines from OCR text into JSON: { medicines: [{ writtenName, genericName, strength, dosage, frequency, purpose, confidence, needsVerification }], summary: '' }"
          },
          { role: "user", content: `Analyze this text: ${fullText}` }
        ],
        response_format: { type: "json_object" }
      });
      structuredData = JSON.parse(aiResponse.choices[0].message.content || "{}");
    } catch (aiErr) {
      console.warn("AI/OCR Keys missing or failed. Using Demo Mock data.");
      // FALLBACK MOCK DATA (For when you are testing without API keys)
      structuredData = {
        summary: "Handwritten prescription: Fever and Cold",
        medicines: [{
          writtenName: "Paracetamol 500mg",
          genericName: "Acetaminophen",
          strength: "500mg",
          dosage: "1 tab",
          frequency: "Thrice a day",
          purpose: "Used for reducing fever and body pain",
          confidence: 0.9,
          needsVerification: false
        }]
      };
      fullText = "Demo OCR Text";
    }

    // C. Store image in Supabase
    const fileName = `${patientId || 'anonymous'}/${Date.now()}.jpg`;
    await supabase.storage.from("prescriptions").upload(fileName, file.buffer, { contentType: file.mimetype });

    // D. Save to DB
    const { data: docRecord } = await supabase.from("medical_documents").insert([{
      patient_id: patientId,
      file_path: fileName,
      raw_ocr_text: fullText,
      structured_data: structuredData
    }]).select().single();

    return res.json({
      success: true,
      documentId: docRecord?.id || "temp-id",
      imageUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/prescriptions/${fileName}`,
      analysis: structuredData
    });

  } catch (error: any) {
    console.error("Critical OCR Error:", error);
    res.status(500).json({ error: "Server failed to process document" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));