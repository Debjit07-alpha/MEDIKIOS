const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  abha_number?: string;
  aadhaar_id?: string;
  uhid?: string;
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
  preprocessing_info?: any;
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
    const error = new Error(data.error || "Upload failed");
    (error as any).code = data.code;
    (error as any).suggestions = data.suggestions;
    (error as any).details = data.details;
    throw error;
  }
  return data as T;
}

export const api = {
  health: () => request<{ message: string }>("/"),

  databaseTest: () => request<{ success: boolean; data: Patient[] }>("/api/test/database"),

  patients: {
    get: (id: string) => request<Patient>(`/api/patients/${id}`),

    identify: async (body: { method: string; value: string }): Promise<Patient> => {
      try {
        return await request<Patient>("/api/patients/identify", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.warn("API identify call failed, using kiosk offline demo record:", err);
        if (body.method === "abha") {
          return {
            id: `DGH-${body.value.slice(-4)}`,
            name: "Ramesh Kumar",
            age: 52,
            gender: "Male",
            abha_number: body.value,
            uhid: "DGH/2026/8421",
          };
        }
        if (body.method === "aadhaar") {
          return {
            id: "DGH/2026/8421",
            name: "Sunita Devi (Demo)",
            age: 58,
            gender: "Female",
            aadhaar_id: "demo-fingerprint",
            uhid: "DGH/2026/8421",
          };
        }
        throw err;
      }
    },

    create: async (body: Partial<Patient>): Promise<Patient> => {
      try {
        return await request<Patient>("/api/patients", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.warn("API create patient failed, using kiosk offline record:", err);
        return {
          id: `DGH/2026/${Math.floor(1000 + Math.random() * 9000)}`,
          name: body.name || "New Patient",
          age: body.age || 40,
          gender: body.gender || "Other",
        };
      }
    },
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
    saveResponse: (body: InterviewResponseInput) =>
      request<{ success: boolean }>("/api/interview/response", {
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
      doctorSummaryRows: { qid?: string; section: string; field: string; label: string; value: string }[];
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
