"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PatchSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  status: z.enum(["active", "paused", "complete", "planning"]),
  project_type: z.enum(["thesis", "side_project", "survey", "implementation", "other"]),
  objective: z.string().optional().default(""),
  thesis_direction: z.string().optional().default(""),
  research_problem: z.string().optional().default(""),
  research_questions: z.array(z.string()).optional().default([]),
  methodology_direction: z.string().optional().default(""),
  implementation_goal: z.string().optional().default(""),
  target_outcome: z.string().optional().default(""),
  primary_topics: z.array(z.string()).optional().default([]),
});

export function EditWorkspaceDialog({
  projectId,
  project,
  onSaved,
}: {
  projectId: string;
  project: {
    title: string;
    description: string;
    status: string;
    project_type: string;
    objective: string;
    thesis_direction: string;
    research_problem: string;
    research_questions: string[];
    methodology_direction: string;
    implementation_goal: string;
    target_outcome: string;
    primary_topics: string[];
  };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(project.title ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<string>(project.status ?? "active");
  const [projectType, setProjectType] = useState<string>(project.project_type ?? "thesis");
  const [objective, setObjective] = useState(project.objective ?? "");
  const [thesisDirection, setThesisDirection] = useState(project.thesis_direction ?? "");
  const [researchProblem, setResearchProblem] = useState(project.research_problem ?? "");
  const [researchQuestions, setResearchQuestions] = useState(
    (project.research_questions ?? []).join("\n")
  );
  const [methodologyDirection, setMethodologyDirection] = useState(project.methodology_direction ?? "");
  const [implementationGoal, setImplementationGoal] = useState(project.implementation_goal ?? "");
  const [targetOutcome, setTargetOutcome] = useState(project.target_outcome ?? "");
  const [topics, setTopics] = useState((project.primary_topics ?? []).join(", "));

  const rqList = useMemo(
    () =>
      researchQuestions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24),
    [researchQuestions]
  );
  const topicsList = useMemo(
    () =>
      topics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24),
    [topics]
  );

  async function save() {
    setSaving(true);
    try {
      const body = PatchSchema.parse({
        title,
        description,
        status,
        project_type: projectType,
        objective,
        thesis_direction: thesisDirection,
        research_problem: researchProblem,
        research_questions: rqList,
        methodology_direction: methodologyDirection,
        implementation_goal: implementationGoal,
        target_outcome: targetOutcome,
        primary_topics: topicsList,
      });

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Workspace updated.");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary">
            <Settings2 className="mr-2 size-4" />
            Edit workspace
          </Button>
        }
      />
      <DialogContent className="max-w-4xl overflow-hidden p-0 lg:max-w-5xl">
        <div className="flex max-h-[min(90dvh,900px)] flex-col">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle>Edit workspace</DialogTitle>
            <DialogDescription>
              Update the project context. The Insights Engine will use these fields to judge relevance and recommend
              next actions.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-2 min-h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v ?? "active")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="planning">planning</SelectItem>
                        <SelectItem value="paused">paused</SelectItem>
                        <SelectItem value="complete">complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project type</Label>
                    <Select value={projectType} onValueChange={(v) => setProjectType(v ?? "thesis")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thesis">thesis</SelectItem>
                        <SelectItem value="implementation">implementation</SelectItem>
                        <SelectItem value="survey">survey</SelectItem>
                        <SelectItem value="side_project">side project</SelectItem>
                        <SelectItem value="other">other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Primary topics (comma-separated)</Label>
                  <Input value={topics} onChange={(e) => setTopics(e.target.value)} className="mt-2" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Objective</Label>
                  <Textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
                <div>
                  <Label>Thesis direction</Label>
                  <Textarea
                    value={thesisDirection}
                    onChange={(e) => setThesisDirection(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
                <div>
                  <Label>Research problem</Label>
                  <Textarea
                    value={researchProblem}
                    onChange={(e) => setResearchProblem(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
                <div>
                  <Label>Research questions (one per line)</Label>
                  <Textarea
                    value={researchQuestions}
                    onChange={(e) => setResearchQuestions(e.target.value)}
                    className="mt-2 min-h-28"
                  />
                </div>
                <div>
                  <Label>Methodology direction</Label>
                  <Textarea
                    value={methodologyDirection}
                    onChange={(e) => setMethodologyDirection(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
                <div>
                  <Label>Implementation goal</Label>
                  <Textarea
                    value={implementationGoal}
                    onChange={(e) => setImplementationGoal(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
                <div>
                  <Label>Target outcome</Label>
                  <Textarea
                    value={targetOutcome}
                    onChange={(e) => setTargetOutcome(e.target.value)}
                    className="mt-2 min-h-20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 bg-muted/30 px-6 py-4">
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

