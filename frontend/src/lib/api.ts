const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000";

// --- TYPES & INTERFACES ---
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  abha_number?: string;
  aadhaar_id?: string;
}

export interface Medicine {
  writtenName: string;
  genericName: string | null;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  purpose: string | null;
  confidence: number;
  needsVerification: boolean;
}

export interface PrescriptionAnalysis {
  documentId: string;
  imageUrl: string;
  analysis: {
    medicines: Medicine[];
    summary?: string;
    doctorInfo?: {
      name?: string;
      hospital?: string;
    };
  };
}

export interface IntakeData {
  patient_id: string;
  symptoms: string[];
  vitals?: Record<string, unknown>;
}

export interface TimelineItem {
  id: string;
  date: string;
  event: string;
  description: string;
}

// --- CORE REQUEST FUNCTIONS ---

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
    throw new Error(data.error || "Upload failed");
  }
  return data as T;
}

// --- API EXPORTS ---
export const api = {
  health: () => request<{ message: string }>("/"),

  databaseTest: () => request<{ success: boolean; data: Patient[] }>("/api/test/database"),

  patients: {
    get: (id: string) => request<Patient>(`/api/patients/${id}`),

    identify: (body: { method: string; value: string }) =>
      request<Patient>("/api/patients/identify", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    create: (body: Partial<Patient>) =>
      request<Patient>("/api/patients", {
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

  documents: {
    analyze: async (patientId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      return upload<PrescriptionAnalysis>("/api/documents/prescription/analyze", formData);
    },

    // Fixed 'any' by using Record<string, unknown>
    verify: (id: string, correctedData: Record<string, unknown>) =>
      request<{ success: boolean }>(`/api/documents/${id}/verify`, {
        method: "POST",
        body: JSON.stringify(correctedData),
      }),

    list: (patientId: string) => request<unknown[]>(`/api/documents/${patientId}`),
  },

  timeline: {
    get: (patientId: string) => request<TimelineItem[]>(`/api/timeline/${patientId}`),
  },

  staff: {
    patients: () => request<Patient[]>("/api/staff/patients"),
    patient: (id: string) => request<Patient>(`/api/staff/patients/${id}`),
  },
};
// --- Add these interfaces to your frontend/src/lib/api.ts ---

export interface Medicine {
  writtenName: string;
  genericName: string | null;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  purpose: string | null;
  confidence: number;
  needsVerification: boolean;
}

export interface PrescriptionAnalysis {
  success: boolean;
  documentId: string;
  imageUrl: string;
  analysis: {
    medicines: Medicine[];
    summary?: string;
    doctorInfo?: {
      name?: string;
      hospital?: string;
    };
  };
}

// ... keep the rest of your api.ts as is
