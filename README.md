# LegalEase AI — AI Legal Document Assistant

LegalEase AI helps ordinary people understand legal documents in plain language — before they sign. It reads a rental agreement, employment contract, NDA, service agreement, or legal notice and explains what it actually says, answers questions about it, and compares two versions side by side.

**Chosen vertical:** AI for Legal Assistance & Access.

Legal documents are dense, one-sided, and written for lawyers. Most people sign without understanding the payments, obligations, deadlines, or exit terms they are agreeing to. LegalEase AI closes that gap using generative AI.

## Core features

- **Document upload** — drag-and-drop PDF or DOCX (up to 14 MB), with clear validation for unsupported, empty, or oversized files.
- **Plain-language analysis** — an AI summary plus key points, important clauses, payment terms, important dates, termination conditions, obligations, penalties/risks, and suggested action items.
- **AI questions** — a chat assistant grounded in the uploaded document (e.g. *"Can I terminate this agreement early?"*, *"What happens if I miss a payment?"*).
- **Document comparison** — upload an original and a new version to get a clause-by-clause diff: added, removed, and modified clauses; changes to payments, dates, obligations, termination, and penalties — each with the original and new wording, a plain-language explanation, and a High/Medium/Low importance rating, plus an overall summary and an "Ask about these changes" chat.

## How the system works

```
PDF/DOCX upload → server-side processing → Gemini AI → structured legal insights
```

1. The document is uploaded in the browser and validated (type, emptiness, size).
2. A server function receives it: PDFs are passed to Gemini as native inline data; DOCX text is extracted server-side.
3. Gemini is prompted to return structured, plain-language legal insights (JSON).
4. The structured results are rendered in the app — analysis screens, grounded chat answers, and comparison tables.

All Gemini calls happen in server-side functions. The browser never talks to Gemini directly.

## Gemini usage

- Model: **Gemini 3.8 Flash** (`gemini-3.8-flash`) for document analysis, assistant questions, and document comparison.
- One model across all features, with automatic retries and exponential backoff for temporary 503/high-demand responses.

## Security

- `GEMINI_API_KEY` is stored in **Lovable Cloud's encrypted secret store** and read only inside server-side code (`process.env`). It is never exposed to the frontend and never committed to the repository.
- `.env` is git-ignored; only a placeholder `.env.example` is tracked.
- Upload validation (file type, empty files, 14 MB limit) is enforced on both the client and the server before any AI request.

## Technology stack

- **React + TypeScript** (TanStack Start, Tailwind CSS)
- **Lovable Cloud** — backend, storage, and secret management
- **Google Gemini API** — generative AI (server-side only)

## Assumptions and limitations

- LegalEase AI provides **general information only and is not legal advice**. It is not a law firm; always confirm important decisions with a licensed professional. This disclaimer is shown throughout the app.
- Analysis is only as good as the uploaded document; the AI may occasionally misread or omit details.
- Documents are processed in memory and are not stored.
- English-language documents are supported best.

## Testing performed

- End-to-end live tests: real PDF lease analyzed by Gemini, assistant questions answered with document-grounded answers, and oversized files (e.g. 16 MB PDF) rejected with a friendly error.
- DOCX extraction, empty/unsupported-file handling, and server-side size validation tested.
- **Known limitation:** Gemini availability and daily quota can temporarily affect AI responses (503/high-demand or quota errors). The app retries automatically and shows a friendly message when the service is temporarily unavailable.

## Deployment and usage

**Deployed app:** https://image-snap-tool.lovable.app

**Local development:**

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

- Connect the project to Lovable Cloud and add your `GEMINI_API_KEY` in Project Settings → Secrets (never in code).
- **Usage:** upload a document → review the plain-language analysis → ask follow-up questions in the Assistant → use Compare to diff two versions of the same agreement.

---

*This project was built with [Lovable](https://lovable.dev).*
