export type ProjectStatus = "active" | "paused" | "complete" | "planning";
export type ProjectType = "thesis" | "side_project" | "survey" | "implementation" | "other";

export type ProjectRecord = {
  id: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;

  title: string;
  slug: string;
  description: string;
  project_type: ProjectType;
  status: ProjectStatus;

  objective: string;
  thesis_direction: string;
  research_problem: string;
  research_questions: string[];
  hypothesis: string | null;
  methodology_direction: string;
  implementation_goal: string;
  target_outcome: string;
  deadline: string | null; // YYYY-MM-DD

  primary_topics: string[];
  preferred_methods: string[];
  preferred_datasets: string[];
  preferred_metrics: string[];
  notes_summary: string;

  accent: "indigo" | "emerald" | "fuchsia" | "amber" | "cyan";
};

