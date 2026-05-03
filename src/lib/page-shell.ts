/**
 * Shared layout tokens — keep shell + top nav aligned and comfortably wide.
 */
export const appShellContentClass =
  "mx-auto grid w-full max-w-[min(100%,1650px)] grid-cols-1 gap-8 px-3 pb-12 pt-6 sm:px-5 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-10 lg:px-6";

export const topNavInnerClass =
  "mx-auto flex w-full max-w-[min(100%,1650px)] items-center justify-between px-3 py-4 sm:px-5 lg:px-6";

/** Full-bleed pages inside main: no extra max-width; shell grid defines width. */
export const pageVerticalPaddingClass = "w-full py-8 sm:py-10 lg:py-12";
