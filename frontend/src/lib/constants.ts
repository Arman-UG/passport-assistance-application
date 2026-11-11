export const APP_NAME = "Passport Assistance Platform";
export const APP_TAGLINE = "Your Trusted Mediator for Seamless Passport Application Preparation";
export const DISCLAIMER_TEXT =
  "Disclaimer: This platform is an independent application preparation and assistance service operated by authorized agents. It is NOT affiliated with, authorized by, or an official agency of the Government of India or Passport Seva. Passports can only be issued by the Ministry of External Affairs, Government of India.";

export const DOCUMENT_STATUSES = {
  NOT_SUBMITTED: { label: "Not Submitted", color: "bg-slate-100 text-slate-700 border-slate-300" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-50 text-blue-700 border-blue-300" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-amber-50 text-amber-700 border-amber-300" },
  APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  REJECTED: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-300" },
  RESUBMISSION_REQUIRED: { label: "Resubmission Required", color: "bg-purple-50 text-purple-700 border-purple-300" },
} as const;

export const APPLICATION_STATUS_STEPS = [
  { key: "INITIATED", label: "Account & Application Initiated", description: "Application profile created" },
  { key: "CHECKLIST_ASSIGNED", label: "Checklist Assigned", description: "Requirements tailored for your category" },
  { key: "DOCUMENTS_SUBMITTED", label: "Documents Submitted", description: "Identity proofs uploaded for agent review" },
  { key: "UNDER_REVIEW", label: "Under Review", description: "Agent inspecting clarity and validity" },
  { key: "ADDITIONAL_DOCS_REQUESTED", label: "Clarifications / Resubmission", description: "Updates requested if needed" },
  { key: "REVIEW_COMPLETE", label: "Review Complete", description: "Dossier verified and compliant" },
  { key: "PROCESSING", label: "Agent Processing", description: "Appointment and filing assistance in progress" },
  { key: "COMPLETED", label: "Completed", description: "Application process concluded" },
];

export const PHOTO_SPECIFICATIONS = {
  dimensions: "35mm x 45mm (approx 2 x 2 inches)",
  background: "Plain white or off-white background",
  composition: "Full face, front view, eyes open, neutral expression",
  recency: "Taken within the last 6 months",
  fileLimit: "JPEG/PNG format, max 2MB",
  lighting: "Even lighting, no harsh shadows, no glare on eyeglasses",
};
