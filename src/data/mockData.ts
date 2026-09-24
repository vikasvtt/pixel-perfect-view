/**
 * Local mock data for the first build of LegalEase AI.
 * No external API calls — everything here is fictional sample content.
 */

export type RiskLevel = "low" | "medium" | "high";

export interface RecentDocument {
  id: string;
  title: string;
  type: string;
  uploadedLabel: string;
  status: string;
  risk: RiskLevel;
}

export const recentDocuments: RecentDocument[] = [
  {
    id: "doc-rental-4b",
    title: "Rental Agreement — Apartment 4B",
    type: "Rental agreement",
    uploadedLabel: "Today",
    status: "Analysis ready",
    risk: "medium",
  },
  {
    id: "doc-nda-vantage",
    title: "NDA — Vantage Labs",
    type: "Non-disclosure agreement",
    uploadedLabel: "2 days ago",
    status: "Low risk",
    risk: "low",
  },
  {
    id: "doc-employment",
    title: "Employment Contract — Northwind",
    type: "Employment contract",
    uploadedLabel: "5 days ago",
    status: "3 flags",
    risk: "high",
  },
  {
    id: "doc-freelance",
    title: "Freelance Services Agreement",
    type: "Service agreement",
    uploadedLabel: "1 week ago",
    status: "Resolved",
    risk: "low",
  },
];

export const dashboardStats = [
  { label: "Documents analyzed", value: "27" },
  { label: "Questions answered", value: "184" },
  { label: "Clauses flagged", value: "63" },
  { label: "Avg. read time saved", value: "42 min" },
];

export const sampleDocument = {
  title: "Rental Agreement",
  type: "Residential lease",
  subtitle: "Apartment 4B · Meridian Properties LLC · 24 pages · 18.4k words",
  status: "Analysis · Resolved",
  riskGrade: "B",
  summary:
    "You're renting a one-bedroom from Meridian for $1,850/month, on a 12-month term starting March 1. You must give 60 days' notice to move out, and breaking the lease early costs two months' rent. The landlord covers water and trash; you handle electricity.",
  tags: ["12-month term", "Auto-renews monthly", "No pets clause"],
  keyPoints: [
    "Rent is fixed at $1,850 for the whole 12-month term — it cannot be raised mid-lease.",
    "A $1,850 security deposit is held and returned within 30 days of move-out.",
    "You are responsible for electricity, internet and renter's insurance.",
    "Subletting is not allowed without written approval from the landlord.",
  ],
  clauses: [
    {
      section: "§ 3.1",
      title: "Security deposit — $1,850",
      detail: "Refundable within 30 days if there is no damage beyond normal wear and tear.",
      risk: "low" as RiskLevel,
    },
    {
      section: "§ 4.4",
      title: "Late payment fee — $75",
      detail: "Charged if rent arrives after the 5th of each month, plus 5% of the balance owed.",
      risk: "medium" as RiskLevel,
    },
    {
      section: "§ 6.2",
      title: "Maintenance access — 24h notice",
      detail: "Landlord may enter with one day's notice, except in emergencies.",
      risk: "low" as RiskLevel,
    },
    {
      section: "§ 9.1",
      title: "Auto-renewal into a new term",
      detail:
        "Without 60 days' written notice the lease rolls into a further fixed 12-month term.",
      risk: "high" as RiskLevel,
    },
  ],
  paymentTerms: [
    { label: "Monthly rent", value: "$1,850.00" },
    { label: "Security deposit", value: "$1,850.00" },
    { label: "Due date", value: "1st, 5-day grace" },
    { label: "Late fee", value: "$75 + 5%" },
  ],
  dates: [
    { label: "Term start", value: "Mar 1, 2026" },
    { label: "Term end", value: "Feb 28, 2027" },
    { label: "Notice to vacate", value: "60 days" },
    { label: "Early break", value: "2 months' rent" },
  ],
  termination: [
    "Either party may end the lease at the term end with 60 days' written notice.",
    "Early termination by the tenant costs two months' rent plus forfeiture of the deposit.",
    "The landlord may terminate for non-payment after a 14-day cure notice.",
  ],
  obligations: [
    "Pay rent by the 1st of each month via bank transfer.",
    "Keep renter's insurance with at least $100,000 liability cover.",
    "Report maintenance issues within 48 hours of noticing them.",
    "Keep the unit free of pets and smoking at all times.",
  ],
  risks: [
    {
      title: "Auto-renewal can lock you in for another year",
      detail: "Set a reminder for Dec 30, 2026 — 60 days before the term ends.",
      risk: "high" as RiskLevel,
    },
    {
      title: "Compounding late fee",
      detail: "A flat $75 plus 5% of the balance grows quickly on a missed month.",
      risk: "medium" as RiskLevel,
    },
    {
      title: "Deposit deductions are loosely defined",
      detail: "'Normal wear and tear' is not defined anywhere in the document.",
      risk: "medium" as RiskLevel,
    },
  ],
  actionItems: [
    "Photograph the unit's condition before move-in.",
    "Ask for the auto-renewal notice window to be shortened to 30 days.",
    "Request a written definition of normal wear and tear.",
    "Diary the 60-day notice deadline: Dec 30, 2026.",
  ],
};

export const suggestedQuestions = [
  "Can I terminate this agreement early?",
  "What payments am I responsible for?",
  "What happens if I miss a payment?",
  "How much notice is required?",
];

export const mockAnswers: Record<string, string> = {
  "Can I terminate this agreement early?":
    "Yes, but it is expensive. Section 9.3 lets you end the lease before Feb 28, 2027 if you give 60 days' written notice and pay an early termination fee equal to two months' rent ($3,700). Your security deposit may also be withheld if the unit needs repairs.",
  "What payments am I responsible for?":
    "Monthly rent of $1,850 due on the 1st, a one-time $1,850 security deposit, electricity and internet, and renter's insurance with at least $100,000 of liability cover. The landlord pays for water and trash collection.",
  "What happens if I miss a payment?":
    "If rent arrives after the 5th, Section 4.4 adds a $75 late fee plus 5% of the outstanding balance. If rent stays unpaid, the landlord can issue a 14-day cure notice and then start termination proceedings.",
  "How much notice is required?":
    "You need to give 60 days' written notice before the end of the term (by Dec 30, 2026) to avoid the lease auto-renewing for another 12 months. The landlord must give you 24 hours' notice before entering the unit, except in emergencies.",
};

export const fallbackAnswer =
  "Based on the rental agreement you uploaded, I couldn't find a clause that directly covers that. The document does cover rent, the deposit, maintenance access, termination and auto-renewal — try asking about one of those, or check the full clause list on the Analysis page.";

export const comparison = {
  original: { name: "Lease_Draft_v2.pdf", label: "Original document", meta: "22 pages · Jan 14" },
  revised: { name: "Lease_Final_v3.pdf", label: "New document", meta: "24 pages · Feb 02" },
  added: [
    { section: "§ 9.1", text: "Lease auto-renews for a further 12-month term without notice." },
    { section: "§ 12.4", text: "Tenant must maintain renter's insurance of $100,000." },
    { section: "§ 14.2", text: "Disputes go to binding arbitration in the landlord's county." },
  ],
  removed: [
    { section: "§ 5.6", text: "Tenant could sublet with 14 days' written notice." },
    { section: "§ 8.1", text: "Landlord covered the first $200 of any repair per year." },
  ],
  modified: [
    { section: "§ 4.4", label: "Late payment fee", before: "$50 flat", after: "$75 + 5%" },
    { section: "§ 2.1", label: "Term length", before: "6 months", after: "12 months" },
    { section: "§ 3.1", label: "Security deposit", before: "$1,200", after: "$1,850" },
  ],
  headline: "+3 clauses, 2 risks",
  headlineDetail: "Deposit and late fee both increased between versions.",
};
