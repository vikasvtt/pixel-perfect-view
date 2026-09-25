import type { RiskLevel } from "@/data/mockData";

export type Analysis = {
  title: string;
  type: string;
  subtitle: string;
  riskGrade: string;
  summary: string;
  tags: string[];
  keyPoints: string[];
  clauses: { section: string; title: string; detail: string; risk: RiskLevel }[];
  paymentTerms: { label: string; value: string }[];
  dates: { label: string; value: string }[];
  termination: string[];
  obligations: string[];
  risks: { title: string; detail: string; risk: RiskLevel }[];
  actionItems: string[];
};

export type ChangeCategory =
  | "added" | "removed" | "modified" | "payment" | "date" | "obligation" | "termination" | "penalty";

export type ComparisonChange = {
  category: ChangeCategory;
  section: string;
  title: string;
  original: string;
  revised: string;
  explanation: string;
  importance: "High" | "Medium" | "Low";
};

export type Comparison = {
  summary: string;
  keyChanges: string[];
  changes: ComparisonChange[];
};
