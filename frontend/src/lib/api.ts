const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000";

export interface Patient {
  id: string;
  patient_code?: string | null;
  name: string;
  age: number;
  gender: string;
  phone?: string | null;
  phone_number?: string | null;
  abha_number?: string;
  aadhaar_id?: string;
  date_of_birth?: string | null;
  preferred_language?: string | null;
  uhid?: string;
  /** Write-only: sent at registration, hashed server-side, never returned. */
  password?: string;
}

export interface Medicine {
  medicineName: string | null;
  genericName: string | null;
  brandName: string | null;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  duration: string | null;
  quantity: string | null;
  timing: string | null;
  instructions: string | null;
  verificationRequired: boolean;
  confidence: number;
}

export interface PatientInfo {
  name: string | null;
  age: string | null;
  gender: string | null;
  dob: string | null;
  patientId: string | null;
}

export interface DoctorInfo {
  name: string | null;
  registrationNumber: string | null;
  clinic: string | null;
  contact: string | null;
}

export interface Vitals {
  bloodPressure: string | null;
  pulse: string | null;
  temperature: string | null;
  weight: string | null;
  spo2: string | null;
  bloodSugar: string | null;
}

export interface PrescriptionAnalysis {
  success: boolean;
  documentId: string;
  imageUrl: string;
  originalImageUrl?: string;
  preprocessing?: {
    applied: boolean;
    originalSize?: { width: number; height: number };
    processedSize?: { width: number; height: number };
    format?: string;
  };
  analysis: {
    rawText: string;
    confidence: number;
    patient: PatientInfo;
    doctor: DoctorInfo;
    medicines: Medicine[];
    diagnosis: string[];
    vitals: Vitals;
    tests: string[];
    followUp: string | null;
    instructions: string[];
    overallStatus: "verified" | "needs_verification" | "low_quality";
  };
}

export interface IntakeData {
  patient_id: string;
  symptoms: string[];
  vitals?: Record<string, unknown>;
}

export interface InterviewResponseInput {
  patientId: string;
  sessionId?: string | null;
  careMode?: string | null;
  questionId: string;
  responseText: string;
  responseType: string;
}

export interface OcrResult {
  success: boolean;
  text: string;
  pages: number;
  provider: string;
  source: string;
}

export type OcrConfidence = "high" | "medium" | "low";

export type OcrDocumentType =
  | "prescription"
  | "blood_test_report"
  | "urine_test_report"
  | "glucose_or_sugar_report"
  | "lab_report"
  | "medical_report"
  | "procedure_report"
  | "surgical_document"
  | "other_medical_document"
  | "unknown";

export interface OcrMedicine {
  name: string;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  confidence: OcrConfidence;
  evidence: string;
}

export interface OcrInvestigation {
  test: string;
  value: string | null;
  unit: string | null;
  referenceRange: string | null;
  flag: string | null;
  date: string | null;
  confidence: OcrConfidence;
  evidence: string;
}

export interface OcrProcedure {
  name: string;
  details: string | null;
  date: string | null;
  confidence: OcrConfidence;
  evidence: string;
}

export interface OcrDiagnosis {
  name: string;
  status: "documented" | "inferred" | "uncertain";
  confidence: OcrConfidence;
  evidence: string;
}

export interface OcrDocumentAnalysis {
  documentType: OcrDocumentType;
  patient: { name: string | null; age: string | null; sex: string | null };
  doctor: { name: string | null; registrationNumber: string | null };
  date: string | null;
  medicines: OcrMedicine[];
  investigations: OcrInvestigation[];
  procedures: OcrProcedure[];
  diagnoses: OcrDiagnosis[];
  instructions: string[];
  rawOcrText: string;
  warnings: string[];
}

export interface OcrPreprocessing {
  applied: boolean;
  reason?: string;
  originalSize?: { width: number; height: number };
  processedSize?: { width: number; height: number };
  format?: string;
}

export type OcrAnalysisStatus = "ready" | "temporarily_unavailable" | "unavailable";

export interface OcrAnalyzeResponse {
  success: boolean;
  ocr: {
    provider: string;
    rawText: string;
    confidence: number;
    preprocessing: OcrPreprocessing;
  };
  analysis: OcrDocumentAnalysis | null;
  analysisStatus: OcrAnalysisStatus;
  warnings: string[];
  warning: string | null;
  documentId?: string | null;
  imageUrl?: string | null;
}

export interface OcrSaveResponse {
  success: boolean;
  documentId: string;
  imageUrl?: string | null;
  alreadySaved?: boolean;
  warning?: string | null;
}

export interface TimelineItem {
  id: string;
  date: string;
  event: string;
  description: string;
}

export interface DocumentRecord {
  id: string;
  patient_id: string;
  file_path: string;
  original_file_path?: string;
  raw_ocr_text: string;
  structured_data: PrescriptionAnalysis["analysis"];
  preprocessing_info?: Record<string, unknown>;
  status: string;
  created_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data as T;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    const body = data as {
      error?: string;
      code?: string;
      suggestions?: unknown;
      details?: unknown;
    };
    const error = new Error(body.error || "Upload failed") as Error & {
      code: string;
      suggestions: unknown;
      details: unknown;
    };
    error.code = body.code || "";
    error.suggestions = body.suggestions;
    error.details = body.details;
    throw error;
  }
  return data as T;
}

export const api = {
  health: () => request<{ message: string }>("/"),

  databaseTest: () => request<{ success: boolean; data: Patient[] }>("/api/test/database"),

  patients: {
    get: (id: string) => request<Patient>(`/api/patients/${id}`),

    update: (id: string, patch: Partial<Patient>) =>
      request<Patient>(`/api/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),

    identify: (body: { method: string; value: string }): Promise<Patient> =>
      request<Patient>("/api/patients/identify", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    create: async (body: Partial<Patient>): Promise<Patient> => {
      const created = await request<Patient | { success: boolean; data: Patient }>(
        "/api/patients",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      // Backend returns the created row directly; tolerate a wrapped shape.
      if (created && typeof created === "object" && "data" in created) {
        return (created as { data: Patient }).data;
      }
      return created as Patient;
    },

    login: (body: { loginId?: string; patientCode?: string; password: string }): Promise<{
      success: boolean;
      patient: {
        id: string;
        patientCode: string;
        name: string;
        phoneNumber: string | null;
        preferredLanguage: string;
        age?: number | null;
        gender?: string | null;
      };
    }> =>
      request<{
        success: boolean;
        patient: {
          id: string;
          patientCode: string;
          name: string;
          phoneNumber: string | null;
          preferredLanguage: string;
          age?: number | null;
          gender?: string | null;
        };
      }>("/api/patients/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  intake: {
    save: (body: IntakeData) =>
      request<{ success: boolean }>("/api/intake", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    get: (patientId: string) => request<IntakeData>(`/api/intake/${patientId}`),
  },

  interview: {
    ensureSession: (body: { patientId: string; careMode: string }) =>
      request<{ success: boolean; reused: boolean; data: { id: string } }>(
        "/api/interview/session",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),

    completeSession: (sessionId: string) =>
      request<{ success: boolean }>(`/api/interview/session/${sessionId}/complete`, {
        method: "POST",
      }),

    listResponses: (sessionId: string) =>
      request<{ success: boolean; data: unknown[] }>(
        `/api/interview/session/${sessionId}/responses`,
      ),

    saveResponse: (body: InterviewResponseInput) =>
      request<{ success: boolean; sessionId: string }>("/api/interview/response", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  consents: {
    save: (body: { patientId: string; purpose?: string; consentGiven?: boolean }) =>
      request<{ success: boolean }>("/api/consents", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  consultations: {
    create: (body: { patientId: string; status?: string }) =>
      request<{ success: boolean }>("/api/consultations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  documents: {
    analyze: async (patientId: string, file: File, ocrText?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      const text = ocrText?.trim();
      if (text) {
        formData.append("ocrText", text);
      }
      return upload<PrescriptionAnalysis>("/api/documents/prescription/analyze", formData);
    },

    verify: (id: string, correctedData: Record<string, unknown>) =>
      request<{ success: boolean }>(`/api/documents/${id}/verify`, {
        method: "POST",
        body: JSON.stringify(correctedData),
      }),

    list: (patientId: string) => request<DocumentRecord[]>(`/api/documents/${patientId}`),
  },

  ocr: {
    extract: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return upload<OcrResult>("/api/ocr", formData);
    },

    analyzeDocument: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return upload<OcrAnalyzeResponse>("/api/ocr/analyze", formData);
    },

    retryAnalysis: async (file: File, ocrText: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ocrText", ocrText);
      return upload<OcrAnalyzeResponse>("/api/ocr/retry-analysis", formData);
    },

    saveDocument: async (input: {
      patientId: string;
      sessionId?: string | null;
      file: File;
      saveKey: string;
      documentType: OcrDocumentType;
      rawOcrText: string;
      analysis: OcrDocumentAnalysis | null;
      analysisStatus: OcrAnalysisStatus;
      warnings: string[];
    }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("patientId", input.patientId);
      if (input.sessionId) formData.append("sessionId", input.sessionId);
      formData.append("saveKey", input.saveKey);
      formData.append("documentType", input.documentType);
      formData.append("rawOcrText", input.rawOcrText);
      formData.append("analysis", JSON.stringify(input.analysis));
      formData.append("analysisStatus", input.analysisStatus);
      formData.append("warnings", JSON.stringify(input.warnings));
      return upload<OcrSaveResponse>("/api/ocr/save", formData);
    },
  },

  timeline: {
    get: (patientId: string) => request<TimelineItem[]>(`/api/timeline/${patientId}`),
  },

  staff: {
    patients: () => request<Patient[]>("/api/staff/patients"),
    patient: (id: string) => request<Patient>(`/api/staff/patients/${id}`),
  },

  summary: {
    generateDoctor: (body: {
      patientId: string;
      patientLanguage: string;
      careMode: string;
      patient: { name: string; age: number; sex: string; uhid: string } | null;
      answers: Record<string, string[]>;
      voiceAnswers: Record<string, string>;
      documents: unknown[];
      redFlag: { label: string; detail: string; at: string } | null;
      doctorSummaryRows: {
        qid?: string;
        section: string;
        field: string;
        label: string;
        value: string;
      }[];
      patientSummaryRows: { section: string; field: string; label: string; value: string }[];
      shareScope: "abha" | "hospital";
    }) =>
      request<{
        success: boolean;
        patientId: string;
        patientLanguage: string;
        patientSummary: { language: string; content: unknown[] };
        doctorSummary: { language: string; content: unknown };
      }>("/api/summary/doctor", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    getDoctor: (patientId: string) =>
      request<{
        success: boolean;
        patientId: string;
        patientLanguage: string;
        patientSummary: { language: string; content: unknown[] };
        doctorSummary: { language: string; content: unknown };
      }>(`/api/summary/doctor/${patientId}`),
  },
};
