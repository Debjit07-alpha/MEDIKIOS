import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

import voiceRouter from "./routes/voice";
import ocrRouter from "./routes/ocr";
import { supabase } from "./database/supabase";
import { ocrImage, ocrHttpResponse } from "./services/ocr";
import { geminiConfigured } from "./services/geminiMedical";
import {
  DOCTOR_SUMMARY_QUESTION_ID,
  DOCTOR_SUMMARY_RESPONSE_TYPE,
  PATIENT_SUMMARY_QUESTION_ID,
  PATIENT_SUMMARY_RESPONSE_TYPE,
  generateDoctorEnglishSummary,
  enhanceWithAi,
  type PatientDoctorSummaryPayload,
} from "./services/doctorSummary";

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
app.use("/api/ocr", ocrRouter);

// ---------------------------------------------------------
// External Clients
// ---------------------------------------------------------

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
// 4b. SAVE INTERVIEW RESPONSE
// ---------------------------------------------------------

app.post("/api/interview/response", async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      questionId,
      responseText,
      responseType,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "patientId is required",
      });
    }

    if (!questionId) {
      return res.status(400).json({
        success: false,
        error: "questionId is required",
      });
    }

    if (!responseText) {
      return res.status(400).json({
        success: false,
        error: "responseText is required",
      });
    }

    const { data, error } = await supabase
      .from("interview_responses")
      .insert([
        {
          patient_id: patientId,
          question_id: questionId,
          response_text: responseText,
          response_type: responseType || "voice",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Interview response save error:", error);

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error("POST /api/interview/response error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save interview response",
    });
  }
});

// ---------------------------------------------------------
// 4c. GENERATE + STORE DOCTOR SUMMARY (always English)
// ---------------------------------------------------------

app.post("/api/summary/doctor", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const patientId = body.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "patientId is required",
      });
    }

    const payload: PatientDoctorSummaryPayload = {
      patientId,
      patientLanguage: body.patientLanguage || "en",
      careMode: body.careMode === "ayush" ? "ayush" : "allopathy",
      patient: body.patient || null,
      answers: body.answers || {},
      voiceAnswers: body.voiceAnswers || {},
      documents: Array.isArray(body.documents) ? body.documents : [],
      redFlag: body.redFlag || null,
      doctorSummaryRows: Array.isArray(body.doctorSummaryRows) ? body.doctorSummaryRows : [],
      shareScope: body.shareScope === "abha" ? "abha" : "hospital",
    };

    // The doctor summary language is enforced here, server-side, and is never
    // derived from the patient's selected language.
    const englishSummary = generateDoctorEnglishSummary(payload);
    const finalSummary = openai
      ? await enhanceWithAi(payload, openai as any)
      : englishSummary;

    const doctorSummary = {
      language: "en" as const,
      content: finalSummary,
    };

    const patientSummary = {
      language: payload.patientLanguage,
      content: Array.isArray(body.patientSummaryRows) ? body.patientSummaryRows : [],
    };

    // Persist BOTH representations as additional derived rows in the existing
    // interview_responses table. Original patient responses are never touched.
    const { error: doctorError } = await supabase
      .from("interview_responses")
      .insert([
        {
          patient_id: patientId,
          question_id: PATIENT_SUMMARY_QUESTION_ID,
          response_text: JSON.stringify({ language: payload.patientLanguage, content: patientSummary.content }),
          response_type: PATIENT_SUMMARY_RESPONSE_TYPE,
        },
        {
          patient_id: patientId,
          question_id: DOCTOR_SUMMARY_QUESTION_ID,
          response_text: JSON.stringify(doctorSummary.content),
          response_type: DOCTOR_SUMMARY_RESPONSE_TYPE,
        },
      ]);

    if (doctorError) {
      console.error("Doctor summary storage error:", doctorError.message);
      return res.status(500).json({
        success: false,
        error: doctorError.message || "Failed to store summary",
        doctorSummary,
      });
    }

    return res.status(201).json({
      success: true,
      patientId,
      patientLanguage: payload.patientLanguage,
      patientSummary,
      doctorSummary,
    });
  } catch (error: any) {
    console.error("POST /api/summary/doctor error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate doctor summary",
    });
  }
});

// Retrieve the latest stored doctor (English) + patient (localised) summaries.
app.get("/api/summary/doctor/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { data, error } = await supabase
      .from("interview_responses")
      .select("*")
      .eq("patient_id", patientId)
      .in("question_id", [DOCTOR_SUMMARY_QUESTION_ID, PATIENT_SUMMARY_QUESTION_ID])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Doctor summary fetch error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    const doctorRow = (data || []).find((r) => r.question_id === DOCTOR_SUMMARY_QUESTION_ID);
    const patientRow = (data || []).find((r) => r.question_id === PATIENT_SUMMARY_QUESTION_ID);

    if (!doctorRow) {
      return res.status(404).json({
        success: false,
        error: "No shared summary found for this patient",
      });
    }

    let content: any = doctorRow.response_text;
    try {
      content = JSON.parse(doctorRow.response_text);
    } catch {
      content = { text: content };
    }

    let patientContent: any = null;
    if (patientRow) {
      try {
        patientContent = JSON.parse(patientRow.response_text);
      } catch {
        patientContent = { language: "en", content: [] };
      }
    }

    return res.json({
      success: true,
      patientId,
      patientLanguage: content?.patientLanguage || "en",
      patientSummary: {
        language: patientContent?.language || "en",
        content: patientContent?.content ?? [],
      },
      doctorSummary: {
        language: "en",
        content,
      },
    });
  } catch (error: any) {
    console.error("GET /api/summary/doctor/:patientId error:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to fetch summary" });
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
      const { patientId, ocrText } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image provided",
          code: "INVALID_FILE",
        });
      }

      let fullText = "";
      let structuredData: any = null;

      // ---------------------------------------------------
      // A. Text extraction (Tesseract.js)
      // ---------------------------------------------------

      // When the kiosk has already extracted and reviewed the text,
      // the corrected version is passed back so it is NOT re-OCRed.
      const reviewedText =
        typeof ocrText === "string" ? ocrText.trim() : "";

      if (reviewedText) {
        fullText = reviewedText;
      } else {
        try {
          const ocrResult = await ocrImage(
            file.buffer,
            file.mimetype,
            { fileName: file.originalname },
          );

          fullText = ocrResult.text;
          console.log("OCR completed successfully.");
        } catch (ocrError) {
          const mapped = ocrHttpResponse(ocrError);
          return res.status(mapped.status).json(mapped.body);
        }
      }

      // ---------------------------------------------------
      // B. Optional OpenAI Analysis
      // ---------------------------------------------------

      if (openai) {
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
          "OpenAI API key not configured."
        );
      }

      // ---------------------------------------------------
      // C. Structured data fallback if AI unavailable
      // ---------------------------------------------------

      if (!structuredData) {
        structuredData = {
          summary:
            "Prescription text extracted. AI analysis unavailable.",
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

  console.log(
    `Gemini: ${geminiConfigured() ? "configured" : "not configured (set GEMINI_API_KEY)"}`
  );

  console.log(
    "OCR: Tesseract.js (in-process, no API key required)"
  );
});