"use client";

import type { OsTabId } from "@/lib/osTabs";
import { REFLECT_FEATURE_MODULES } from "@/lib/reflectModules";
import { OsIcon, OsIconShell } from "@/components/icons/OsIcon";

type Props = {
  onSelect: (tab: OsTabId) => void;
};

export function ReflectFeatureGrid({ onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REFLECT_FEATURE_MODULES.map((mod) => (
        <button
          key={mod.tab}
          type="button"
          onClick={() => onSelect(mod.tab)}
          className="group reflect-feature-card reflect-feature-card--interactive"
        >
          <OsIconShell>
            <OsIcon name={mod.icon} size="lg" />
          </OsIconShell>
          <h3 className="reflect-feature-card__title mt-4">{mod.title}</h3>
          <p className="reflect-feature-card__desc mt-2">{mod.description}</p>
          <span className="reflect-feature-card__link">Open →</span>
        </button>
      ))}
    </div>
  );
}
