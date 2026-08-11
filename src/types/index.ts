import { Heart, Activity, AlertTriangle, Stethoscope, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

export type Gender = "male" | "female";
export type DiseaseKey = "cancer" | "cardio" | "accident" | "surgery";

export interface Policy {
  id: string;
  company: string;
  companyEn: string;
  category: string;
  medicalType: string;
  premium: number;
  policyName: string;
  description: string;
  payoutAmount: string;
  payoutRatio: string;
  payoutStandard: "guaranteed" | "conditional" | "consult";
  flagged?: { source: string; note: string };
}