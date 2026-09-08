import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import vision from "@google-cloud/vision";
import OpenAI from "openai";

import voiceRouter from "./routes/voice";
import { supabase } from "./database/supabase";
import { assertGoogleCredentials } from "./services/googleCredentials";

const app = express();

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
});

app.use(cors());
app.use(express.json());

app.use("/api/voice", voiceRouter);

// ---------------------------------------------------------
// External Clients
// ---------------------------------------------------------

// Google Vision client.
// Credentials are checked only when OCR is actually requested.
const visionClient = new vision.ImageAnnotatorClient();

// OpenAI is OPTIONAL.
// The server can start even when OPENAI_API_KEY is not configured.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  : null;

// ---------------------------------------------------------
// 1. HEALTH CHECK
// ---------------------------------------------------------

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "MediKiosk API is running 🚀",
  });
});

// ---------------------------------------------------------
// 2. REGISTER NEW PATIENT
// ---------------------------------------------------------

app.post("/api/patients", async (req: Request, res: Response) => {
  try {
    const {
      name,
      age,
      gender,
      phone,
      abha_number,
      aadhaar_id,
      date_of_birth,
      preferred_language,
      full_name,
      phone_number,
    } = req.body;

    const patientData = {
      name: name || full_name || "New Patient",
      age: age ?? 0,
      gender: gender || "Not stated",
      phone: phone || phone_number || null,
      abha_number: abha_number || null,
      aadhaar_id: aadhaar_id || null,
      date_of_birth: date_of_birth || null,
      preferred_language: preferred_language || null,
    };

    const { data, error } = await supabase
      .from("patients")
      .insert([patientData])
      .select()
      .single();

    if (error) {
      console.error("Patient creation error:", error);

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error("POST /api/patients error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create patient",
    });
  }
});

// ---------------------------------------------------------
// 3. IDENTIFY PATIENT
// ---------------------------------------------------------

app.post("/api/patients/identify", async (req: Request, res: Response) => {
  try {
    const { method, value } = req.body;

    if (!method || !value) {
      return res.status(400).json({
        success: false,
        error: "Identification method and value are required",
      });
    }

    let query = supabase.from("patients").select("*");

    if (method === "abha") {
      query = query.eq("abha_number", value);
    } else if (method === "aadhaar") {
      query = query.eq("aadhaar_id", value);
    } else {
      query = query.eq("id", value);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Patient identification error:", error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
      });
    }

    return res.json(data);
  } catch (error: any) {
    console.error("POST /api/patients/identify error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to identify patient",
    });
  }
});

// ---------------------------------------------------------
// 4. SAVE INTAKE
// ---------------------------------------------------------

app.post("/api/intake", async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      symptoms,
      vitals,
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: "patient_id is required",
      });
    }

    const { data, error } = await supabase
      .from("intake")
      .insert([
        {
          patient_id,
          symptoms: symptoms || [],
          vitals: vitals || {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Intake save error:", error);

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error("POST /api/intake error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save intake",
    });
  }
});

// ---------------------------------------------------------
// 5. PRESCRIPTION OCR + OPTIONAL AI ANALYSIS
// ---------------------------------------------------------

app.post(
  "/api/documents/prescription/analyze",
  upload.single("file"),
  async (req: any, res: Response) => {
    try {
      const file = req.file;
      const { patientId } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image provided",
        });
      }

      let fullText = "";
      let structuredData: any = null;

      // ---------------------------------------------------
      // A. Google Vision OCR
      // ---------------------------------------------------

      try {
        assertGoogleCredentials();

        const [result] =
          await visionClient.documentTextDetection(file.buffer);

        fullText =
          result.fullTextAnnotation?.text?.trim() || "";

        if (!fullText) {
          throw new Error("OCR returned no text");
        }

        console.log("Google OCR completed successfully.");
      } catch (ocrError: any) {
        console.warn(
          "Google Vision OCR failed:",
          ocrError?.message || ocrError
        );

        // Demo fallback for development/testing.
        fullText = "Demo OCR Text";

        console.warn(
          "Using demo OCR text because Google Vision is unavailable."
        );
      }

      // ---------------------------------------------------
      // B. Optional OpenAI Analysis
      // ---------------------------------------------------

      if (openai && fullText !== "Demo OCR Text") {
        try {
          const aiResponse =
            await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a medical pharmacist. Extract medicines from OCR text into JSON. Return exactly this structure: { medicines: [{ writtenName, genericName, strength, dosage, frequency, purpose, confidence, needsVerification }], summary: '' }. Do not invent information that is not present in the prescription.",
                },
                {
                  role: "user",
                  content: `Analyze this prescription text:\n\n${fullText}`,
                },
              ],
              response_format: {
                type: "json_object",
              },
            });

          structuredData = JSON.parse(
            aiResponse.choices[0].message.content || "{}"
          );

          console.log("OpenAI prescription analysis completed.");
        } catch (aiError: any) {
          console.warn(
            "OpenAI analysis failed:",
            aiError?.message || aiError
          );
        }
      } else {
        console.warn(
          "OpenAI API key not configured or OCR is demo data."
        );
      }

      // ---------------------------------------------------
      // C. Demo structured data if AI unavailable
      // ---------------------------------------------------

      if (!structuredData) {
        structuredData = {
          summary:
            fullText === "Demo OCR Text"
              ? "Demo prescription analysis"
              : "Prescription text extracted. AI analysis unavailable.",
          medicines: [],
        };
      }

      // ---------------------------------------------------
      // D. Upload prescription image to Supabase Storage
      // ---------------------------------------------------

      const fileName =
        `${patientId || "anonymous"}/${Date.now()}.jpg`;

      const { error: storageError } = await supabase.storage
        .from("prescriptions")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageError) {
        console.error(
          "Prescription storage upload error:",
          storageError
        );

        return res.status(500).json({
          success: false,
          error: storageError.message,
        });
      }

      // ---------------------------------------------------
      // E. Save document record in Supabase
      // ---------------------------------------------------

      const { data: docRecord, error: documentError } =
        await supabase
          .from("medical_documents")
          .insert([
            {
              patient_id: patientId || null,
              file_path: fileName,
              raw_ocr_text: fullText,
              structured_data: structuredData,
            },
          ])
          .select()
          .single();

      if (documentError) {
        console.error(
          "Medical document database error:",
          documentError
        );

        return res.status(500).json({
          success: false,
          error: documentError.message,
        });
      }

      // ---------------------------------------------------
      // F. Return result
      // ---------------------------------------------------

      const supabaseUrl = process.env.SUPABASE_URL;

      const imageUrl = supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/prescriptions/${fileName}`
        : null;

      return res.json({
        success: true,
        documentId: docRecord.id,
        imageUrl,
        analysis: structuredData,
        rawOcrText: fullText,
      });
    } catch (error: any) {
      console.error(
        "Critical prescription processing error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Server failed to process document",
      });
    }
  }
);

// ---------------------------------------------------------
// SERVER
// ---------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Backend running on http://localhost:${PORT}`
  );

  console.log(
    `OpenAI: ${openai ? "configured" : "not configured"
    }`
  );
});