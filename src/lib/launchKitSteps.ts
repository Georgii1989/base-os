import type { TokenLaunchForm, TokenLaunchValidation } from "@/lib/tokenLaunchValidate";
import { validateTokenLaunchForm } from "@/lib/tokenLaunchValidate";

export type LaunchKitStepId = "intro" | "identity" | "supply" | "review" | "success";

export const LAUNCH_KIT_STEPS: { id: LaunchKitStepId; label: string }[] = [
  { id: "intro", label: "Start" },
  { id: "identity", label: "Token" },
  { id: "supply", label: "Supply" },
  { id: "review", label: "Launch" },
  { id: "success", label: "Live" },
];

export function launchStepIndex(step: LaunchKitStepId): number {
  return LAUNCH_KIT_STEPS.findIndex((s) => s.id === step);
}

export function validateIdentityStep(form: Pick<TokenLaunchForm, "name" | "symbol">): TokenLaunchValidation {
  return validateTokenLaunchForm({ ...form, supplyWhole: "1" });
}

export function validateSupplyStep(form: TokenLaunchForm): TokenLaunchValidation {
  return validateTokenLaunchForm(form);
}

export function canAdvanceFromStep(step: LaunchKitStepId, form: TokenLaunchForm): boolean {
  switch (step) {
    case "intro":
      return true;
    case "identity": {
      const v = validateIdentityStep(form);
      if (!v.ok) return false;
      return Boolean(v.name && v.symbol);
    }
    case "supply":
      return validateSupplyStep(form).ok;
    case "review":
      return validateTokenLaunchForm(form).ok;
    default:
      return false;
  }
}

export function nextLaunchStep(step: LaunchKitStepId): LaunchKitStepId | null {
  const idx = launchStepIndex(step);
  if (idx < 0 || idx >= LAUNCH_KIT_STEPS.length - 2) return null;
  return LAUNCH_KIT_STEPS[idx + 1]!.id;
}

export function prevLaunchStep(step: LaunchKitStepId): LaunchKitStepId | null {
  const idx = launchStepIndex(step);
  if (idx <= 0) return null;
  return LAUNCH_KIT_STEPS[idx - 1]!.id;
}
