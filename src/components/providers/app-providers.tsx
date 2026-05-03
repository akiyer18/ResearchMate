"use client";

import { ThemeProvider } from "next-themes";

import { CommandPaletteProvider } from "@/features/command-palette/command-palette";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </ThemeProvider>
  );
}

