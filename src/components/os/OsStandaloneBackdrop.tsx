"use client";

import { ReflectVoidBackdrop } from "@/components/reflect/ReflectVoidBackdrop";

/** Shared void backdrop for standalone routes (/safety, /card, tips, etc.) */
export function OsStandaloneBackdrop() {
  return <ReflectVoidBackdrop staticMode />;
}
