# Aroha Flow — Research Mate

**Aroha Flow** is a local-first research workspace for graduate students, researchers, and builders who want papers turned into **structured understanding**, not loose PDFs in a folder. It combines ingestion, AI-assisted analysis, a searchable archive, and **project workspaces** so reading, notes, and writing stay tied to the same sources.

The app is a [Next.js](https://nextjs.org) 16 application (React 19) with a **SQLite** database via [Drizzle ORM](https://orm.drizzle.team), designed so you can work offline-capable on your machine and optionally grow toward cloud sync later.

---
<img width="1679" height="974" alt="Screenshot 2026-05-03 at 10 56 01" src="https://github.com/user-attachments/assets/f70a107f-3470-42cb-8425-f7465e779fdf" />
<img width="1596" height="783" alt="Screenshot 2026-05-03 at 10 56 22" src="https://github.com/user-attachments/assets/bf9bd761-68bc-4071-a9a7-e0b4cf426bd9" />
<img width="1665" height="896" alt="Screenshot 2026-05-03 at 10 56 41" src="https://github.com/user-attachments/assets/22280123-4e4a-4fd9-bb6f-533380b15087" />


## Why use it

- **One pipeline** from PDF, link, or pasted text → structured summaries, keywords, facets, and confidence signals.
- **Archive you can actually filter** by methods, datasets, performance hints, topics, keywords, source type, and scan confidence—not just title search.
- **Project workspaces** align scans with your thesis direction, research questions, and goals; generate **literature review drafts** and citations from papers already in the project.
- **Resume context**: dashboard and command palette surface recent papers, projects, and activity so you pick up where you left off.

---

## Current features

### Research dashboard

- At-a-glance stats: papers scanned this week, active projects, topic signals, and “needs revisit” candidates.
- **Continue where you left off** from cross-app recent activity.
- Quick actions: upload paper, paste link, paste text, open archive.

### Research paper scanner

- **Three input modes**: PDF upload, article URL (with readable content extraction), or pasted text.
- **Progressive pipeline**: ingest → extract text → analyze → formatted result.
- **Structured output**: executive overview plus methodology, results, discussion, and future work summaries; key takeaways, keywords, and important concepts.
- **Research metadata** (`research_facets`): methods, datasets, performance level, contribution, and key results for filtering downstream.
- **Content awareness**: distinguishes research papers vs general articles when possible; stores extended **scan metadata** for richer UIs.
- **Confidence** levels on scans so you know what to re-read or re-run.

### Research archive

- **Table and card** layouts with hover previews.
- **Power filters**: full-text-ish search, topic tag, keyword, source type (PDF / URL / text), methods and datasets (comma lists), performance levels, confidence bands, sorting (e.g. newest first).
- **Smart filter helpers** to tighten queries without memorizing syntax.
- Opens into a dedicated **paper results** experience for deep review.

### Paper results & editing

- Full detail view for each saved paper: all summary sections, facets, and user fields.
- **Structured notes** aligned to how you think: idea, critique, use in project, open questions, follow-up tasks (editable and persisted).
- Patch and save user annotations: notes, reason for reading, topic tags.

### Project workspaces

- **Rich project profile**: objective, thesis direction, research problem, research questions, methodology direction, implementation goal, target outcome, deadlines, topics, preferred methods/datasets/metrics, status, and accent theming.
- **Overview** hero with quick actions: scan into project, edit workspace, copy thesis direction.
- **Papers** tab: project-scoped library with the same **archive-style filters** plus **collections**—group papers inside a project, reorder, merge collections, bulk assign, and **AI-assisted collection suggestions** for organization.
- **Insights** tab: per-paper **project fit** analysis (relevance, thesis/methodology/lit-review usefulness, gaps, contradictions, recommended actions and thesis sections, priority).
- **Notes** tab: project notes with optional **link to a paper** for cross-navigation.
- **Writing** tab: long-form **project writing** surface, **literature review draft** generation from linked papers, and **citation helpers** (APA-lite, MLA-lite, CHI-style options) with insert-at-cursor flow.
- **Dedicated project scan** flow so new captures land already associated with the workspace.

### Global UX

- **Command palette** (`⌘K` / `Ctrl+K`, or `/` when not typing in a field): jump to scanner, archive, dashboard, projects; fuzzy search across papers, projects, notes, and recent activity.
- **Sidebar navigation** and modular **dashboard cards** that describe the Research OS surface area.
- **Theme** support via `next-themes` (light/dark follows your app shell).

### Data & operations (under the hood)

- **SQLite** file database (configurable via `DATABASE_URL`); migrations via Drizzle Kit.
- **Paper reading log** snapshots for longitudinal tracking.
- **Project activity** and **recent activity** feeds for auditing and “continue” surfaces.
- **Provider usage** counters (daily requests/tokens/success/failure) to monitor LLM usage when keys are configured.

---

## Upcoming & roadmap

These items are reflected in the codebase as **placeholders**, **commented env templates**, or **navigation stubs**—they advertise direction, not shipped UI unless noted.

### Dashboard modules (placeholders)

The home dashboard lists modules; some are **ready** (projects, scanner, archive) and others are **planned**:

| Module | Direction |
|--------|-----------|
| **Literature map** | Visualize relationships between papers, ideas, and citations. |
| **Topic tracker** | Track learning threads, momentum, and what to read next. |
| **Notes workspace** | Standalone, calm writing space beyond per-project notes (project notes already exist today). |
| **Insight generator** | Broader “turn scans into hypotheses, experiments, and next steps” beyond per-paper project insights. |

### Cloud & auth

- **Supabase** variables are documented in `.env.example` for an optional future production backend (sync, auth, shared storage). The app today is oriented around **local SQLite**.

### LLM providers

- **Active**: OpenAI and OpenRouter when API keys are set; sensible defaults and **daily request/token limits** in env.
- **Prepared in router** (disabled until wired): Gemini, Groq, Together, and a **custom OpenAI-compatible** base URL + key.

### In-app configuration

- Sidebar entries for **Providers** and **Settings** point toward first-class screens for model routing, limits, and preferences; those routes are **not implemented yet**—configuration today is primarily **environment-based** (see `.env.example`).

---

## Getting started

### Requirements

- Node.js 20+ (recommended)
- npm (or pnpm/yarn/bun if you adapt commands)

### Setup

```bash
cd ResearchMate
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL and at least one LLM key for scanning (e.g. OPENAI_API_KEY or OPENROUTER_API_KEY)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

```bash
npm run db:generate   # generate migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:studio     # open Drizzle Studio against your SQLite file
```

See `src/db/README.md` for database-specific notes.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

---

## Environment variables

Copy `.env.example` to `.env.local`. Highlights:

- **`DATABASE_URL`** — SQLite file URL (default `file:./local.db`).
- **`OPENAI_API_KEY`** / **`OPENROUTER_API_KEY`** — enable scanning and other LLM features; optional model and daily limit overrides.
- **Supabase** and additional provider keys — optional / future use as described in the example file.

---

## Tech stack

- **Framework**: Next.js (App Router), React 19, TypeScript  
- **UI**: Tailwind CSS 4, shadcn-style primitives, Framer Motion, Lucide icons  
- **Data**: Drizzle ORM, better-sqlite3  
- **Forms & validation**: React Hook Form, Zod  
- **Ingestion**: PDF text extraction, Mozilla Readability + JSDOM for URLs  

---

## Package name

The npm package is **`aroha-flow`**; the in-product name is **Aroha Flow — Research OS**.

---

## License

Private project (`"private": true` in `package.json`). Adjust this section if you open-source the repo.
