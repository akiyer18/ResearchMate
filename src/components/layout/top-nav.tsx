"use client";

import Link from "next/link";
import { Command, FolderKanban, Sparkles } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/features/command-palette/command-palette";
import { topNavInnerClass } from "@/lib/page-shell";

export function TopNav() {
  const { openPalette } = useCommandPalette();
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className={topNavInnerClass}>
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary/25 via-accent/30 to-primary/15 shadow-sm ring-1 ring-border/60">
            <Sparkles className="size-5 text-primary" />
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-foreground">
              Aroha Flow
            </div>
            <div className="text-sm text-muted-foreground">Research OS</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:text-foreground lg:inline-flex"
            onClick={() => openPalette()}
            aria-label="Open command palette"
          >
            <Command className="mr-2 size-4" />
            Search
            <kbd className="ml-2 hidden rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </Button>
          <ButtonLink href="/projects" variant="secondary" className="hidden md:inline-flex">
            <FolderKanban className="mr-2 size-4" />
            Projects
          </ButtonLink>
          <ButtonLink
            href="/research/scanner"
            variant="secondary"
            className="hidden sm:inline-flex"
          >
            Scan a paper
          </ButtonLink>
          <ButtonLink href="/research/archive" className="shadow-sm ring-1 ring-border/50">
            Open archive
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

