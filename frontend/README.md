# MediMate Assistant

Design and implement a production-quality elderly-first AI healthcare kiosk frontend called MediKiosk. The application is an AI-powered clinical history-taking and medical document digitization platform for Indian hospitals. The primary users are elderly, low-literacy and first-time digital users, so every patient-facing screen must use large typography, very large touch targets, high contrast, simple icon-driven navigation, minimal text, clear visual hierarchy, and audio guidance.

The patient journey must be: Login → Language Selection → Audio-Guided Consent → ABHA/Aadhaar/New Patient Verification → Care Mode Selection → Patient Dashboard → AI Clinical Interview → Red-Flag Detection → Medical Document Scan/Upload → OCR/AI Processing → Medical Timeline → Patient History Review → Structured Clinical Summary → ABHA/HIS Sharing Consent → Completion.

The Care Mode screen must prominently separate two workflows: Allopathy and AYUSH. Allopathy should collect Chief Complaint, HPI, Past Medical/Surgical History, Drug and Allergy History, Family History, Personal History, Review of Systems and Prior Investigations. AYUSH should provide an extended history workflow covering Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara Shakti, Vyamaya Shakti, Vaya, Nidana and Samprapti. The user should never be overwhelmed by these medical terms; present simple patient-friendly questions and map answers to the structured clinical fields.

The AI interview must support dual-mode input on every question: voice and large touch options. Create a reusable voice interaction component with idle, listening, processing, speaking and confirmation states. Questions must be adaptive rather than a static questionnaire.

Implement a prominent red-flag state. If an AI response indicates a possible emergency symptom, immediately stop the routine interview and display a highly visible priority alert for triage staff. Use a clear warning state, audio announcement, and large action buttons.

Create a document digitization workflow supporting prescriptions, laboratory reports and discharge summaries. Show OCR processing, extracted diagnoses, medications, dosages, investigation values, dates and abnormal-value warnings. Automatically present extracted records in a chronological medical timeline.

Create an editable and verifiable structured clinical summary. For Allopathy use the standard clinical history structure. For AYUSH display the extended AYUSH assessment. The physician must retain control through Edit, Confirm and Reject actions.

Create a separate physician dashboard showing waiting patients, completed intake, AYUSH/Allopathy mode and red-flag priority patients. Clicking a patient should open the structured physician-ready summary with history, documents, timeline, abnormal values and edit/confirm actions.

Use a calm, trustworthy healthcare visual language suitable for an Indian government hospital but make it modern enough for a national hackathon demonstration. Use large rounded cards, accessible typography, strong visual hierarchy, subtle animations, clear icons, responsive tablet/kiosk layouts and a consistent component system. Do not use dense hospital-management dashboards for patient screens. Do not use small buttons, complex forms, excessive dropdowns or jargon. Every important instruction should have an audio/speaker control.

The frontend should feel like a guided healthcare assistant rather than a conventional website. Optimize the complete experience for a patient standing in front of a touchscreen kiosk with minimal assistance.
u can follow this

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
