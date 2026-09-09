import {
  AiAnalysisError,
  analyzeWithClaude,
  claudeConfigured,
  claudeModelName,
} from "./claudeMedical";
import type { MedicalAnalysis } from "./geminiMedical";

/**
 * Provider-independent AI interpretation layer for the OCR pipeline.
 *
 * Stage 2 of the pipeline (raw OCR text -> structured medical analysis)
 * always goes through this module. The configured provider is Claude
 * (backend-only ANTHROPIC_API_KEY); the legacy Gemini module is retained
 * untouched for compatibility but is no longer in the OCR path, and the
 * two providers are never called for the same document.
 */

export { AiAnalysisError };
export type { MedicalAnalysis };

export function aiConfigured(): boolean {
  return claudeConfigured();
}

export function aiProviderName(): string {
  return "claude";
}

export function aiModelName(): string {
  return claudeModelName();
}

/**
 * Convert raw Tesseract OCR text into structured medical information
 * using the configured AI provider. Single-shot: no retries, no loops.
 */
export async function analyzeMedicalDocument(
  rawOcrText: string,
): Promise<MedicalAnalysis> {
  return analyzeWithClaude(rawOcrText);
}
