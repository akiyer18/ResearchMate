import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Database,
  FolderKanban,
  GitBranch,
  Lightbulb,
  NotebookPen,
  Radar,
} from "lucide-react";

export type ModuleStatus = "ready" | "placeholder";

export type AppModule = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: ModuleStatus;
  accent: "indigo" | "emerald" | "fuchsia" | "amber" | "cyan";
};

export const MODULES: AppModule[] = [
  {
    key: "projects",
    title: "Project Workspaces",
    description:
      "Focused thesis/project mode with project-aware scanning and insights.",
    href: "/projects",
    icon: FolderKanban,
    status: "ready",
    accent: "fuchsia",
  },
  {
    key: "scanner",
    title: "Research Paper Scanner",
    description: "Upload a PDF, paste a link, or drop text to get a structured scan.",
    href: "/research/scanner",
    icon: BookOpen,
    status: "ready",
    accent: "indigo",
  },
  {
    key: "archive",
    title: "Research Archive",
    description: "A premium knowledge vault for your logged papers and notes.",
    href: "/research/archive",
    icon: Database,
    status: "ready",
    accent: "emerald",
  },
  {
    key: "literature-map",
    title: "Literature Map",
    description: "Visualize the relationships between papers, ideas, and citations.",
    href: "/#",
    icon: GitBranch,
    status: "placeholder",
    accent: "cyan",
  },
  {
    key: "topic-tracker",
    title: "Topic Tracker",
    description: "Track what you’re learning, what’s trending, and what’s next.",
    href: "/#",
    icon: Radar,
    status: "placeholder",
    accent: "amber",
  },
  {
    key: "notes-workspace",
    title: "Notes Workspace",
    description: "Write, connect, and revisit notes in a calm, focused space.",
    href: "/#",
    icon: NotebookPen,
    status: "placeholder",
    accent: "fuchsia",
  },
  {
    key: "insight-generator",
    title: "Insight Generator",
    description: "Turn scans into hypotheses, experiments, and concrete next steps.",
    href: "/#",
    icon: Lightbulb,
    status: "placeholder",
    accent: "indigo",
  },
];

