import type { ReflectModule } from "@/lib/reflectModules";

type ModuleIconId = ReflectModule["icon"];

const ACCENT: Record<
  ModuleIconId,
  { shell: string; glow: string; gradA: string; gradB: string }
> = {
  score: {
    shell: "reflect-module-icon--score",
    glow: "rgba(232, 121, 249, 0.45)",
    gradA: "#f0abfc",
    gradB: "#a855f7",
  },
  chart: {
    shell: "reflect-module-icon--chart",
    glow: "rgba(34, 211, 238, 0.42)",
    gradA: "#67e8f9",
    gradB: "#3b82f6",
  },
  radar: {
    shell: "reflect-module-icon--radar",
    glow: "rgba(52, 211, 153, 0.4)",
    gradA: "#6ee7b7",
    gradB: "#10b981",
  },
  wallet: {
    shell: "reflect-module-icon--wallet",
    glow: "rgba(251, 191, 36, 0.42)",
    gradA: "#fde68a",
    gradB: "#f59e0b",
  },
  swap: {
    shell: "reflect-module-icon--swap",
    glow: "rgba(167, 139, 250, 0.45)",
    gradA: "#c4b5fd",
    gradB: "#7c3aed",
  },
  launch: {
    shell: "reflect-module-icon--launch",
    glow: "rgba(240, 223, 160, 0.5)",
    gradA: "#fef3c7",
    gradB: "#d4af55",
  },
  game: {
    shell: "reflect-module-icon--game",
    glow: "rgba(244, 114, 182, 0.42)",
    gradA: "#fbcfe8",
    gradB: "#ec4899",
  },
  shield: {
    shell: "reflect-module-icon--shield",
    glow: "rgba(251, 191, 36, 0.38)",
    gradA: "#fcd34d",
    gradB: "#f97316",
  },
};

function ModuleGlyph({
  icon,
  gradId,
  glowId,
}: {
  icon: ModuleIconId;
  gradId: string;
  glowId: string;
}) {
  const fill = `url(#${gradId})`;
  const glow = `url(#${glowId})`;

  switch (icon) {
    case "score":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.55} />
          <path
            d="M12 3.25a8.75 8.75 0 0 1 7.65 4.55"
            fill="none"
            stroke={fill}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M12 20.75a8.75 8.75 0 0 1-7.1-3.85"
            fill="none"
            stroke={fill}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity={0.55}
          />
          <circle cx="12" cy="12" r="6.25" fill="none" stroke={fill} strokeWidth="1.5" opacity={0.35} />
          <circle cx="12" cy="12" r="3" fill={fill} />
          <circle cx="12" cy="12" r="1.1" fill="#fff" opacity={0.9} />
        </>
      );
    case "chart":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <rect x="5.5" y="13" width="3.5" height="6.5" rx="1.2" fill={fill} opacity={0.65} />
          <rect x="10.25" y="8.5" width="3.5" height="11" rx="1.2" fill={fill} opacity={0.85} />
          <rect x="15" y="10.5" width="3.5" height="9" rx="1.2" fill={fill} />
          <path
            d="M5 19.5h14"
            stroke={fill}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={0.45}
          />
        </>
      );
    case "radar":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <circle cx="12" cy="12" r="8" fill="none" stroke={fill} strokeWidth="1.4" opacity={0.35} />
          <circle cx="12" cy="12" r="5" fill="none" stroke={fill} strokeWidth="1.6" opacity={0.55} />
          <path d="M12 12 18.75 6.75" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16.25" cy="8.25" r="2.1" fill={fill} />
          <circle cx="16.25" cy="8.25" r="0.75" fill="#fff" opacity={0.85} />
        </>
      );
    case "wallet":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <rect x="3.75" y="7.25" width="16.5" height="10.5" rx="3" fill={fill} opacity={0.22} />
          <rect
            x="3.75"
            y="7.25"
            width="16.5"
            height="10.5"
            rx="3"
            fill="none"
            stroke={fill}
            strokeWidth="2"
          />
          <path d="M3.75 10.75h16.5" stroke={fill} strokeWidth="1.6" opacity={0.5} />
          <rect x="14.25" y="12.75" width="4.25" height="3" rx="1.2" fill={fill} />
        </>
      );
    case "swap":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <path
            d="M6.5 8.25h10.5M14.75 5.5 17.5 8.25 14.75 11"
            fill="none"
            stroke={fill}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 15.75H7M9.25 18.5 6.5 15.75 9.25 13"
            fill="none"
            stroke={fill}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        </>
      );
    case "launch":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <path
            d="M12 4.5 8.25 14.25h7.5L12 4.5Z"
            fill={fill}
            opacity={0.9}
          />
          <path
            d="M12 4.5 8.25 14.25h7.5L12 4.5Z"
            fill="none"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinejoin="round"
            opacity={0.35}
          />
          <path d="M10 17.25h4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="12" cy="19.25" rx="3.25" ry="1.1" fill={fill} opacity={0.55} />
        </>
      );
    case "game":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <rect
            x="5.25"
            y="5.25"
            width="13.5"
            height="13.5"
            rx="3"
            fill={fill}
            opacity={0.15}
            stroke={fill}
            strokeWidth="1.8"
          />
          <path d="M9.25 5.25v13.5M14.75 5.25v13.5M5.25 9.25h13.5M5.25 14.75h13.5" stroke={fill} opacity={0.28} />
          <circle cx="9.25" cy="9.25" r="1.65" fill={fill} />
          <circle cx="14.75" cy="14.75" r="1.65" fill={fill} />
          <circle cx="14.75" cy="9.25" r="1.2" fill={fill} opacity={0.55} />
        </>
      );
    case "shield":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={glow} opacity={0.5} />
          <path
            d="M12 3.25 18.25 6.1v5.35c0 4.35-2.85 6.85-6.25 8.55-3.4-1.7-6.25-4.2-6.25-8.55V6.1L12 3.25Z"
            fill={fill}
            opacity={0.28}
          />
          <path
            d="M12 3.25 18.25 6.1v5.35c0 4.35-2.85 6.85-6.25 8.55-3.4-1.7-6.25-4.2-6.25-8.55V6.1L12 3.25Z"
            fill="none"
            stroke={fill}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9.1 12.35 11.1 14.35 15.2 9.85"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    default:
      return null;
  }
}

export function ReflectModuleIcon({ icon }: { icon: ModuleIconId }) {
  const accent = ACCENT[icon];
  const gradId = `rm-${icon}-grad`;
  const glowId = `rm-${icon}-glow`;

  return (
    <span className={`reflect-module-icon ${accent.shell}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="reflect-module-icon__svg" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={accent.gradA} />
            <stop offset="100%" stopColor={accent.gradB} />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ModuleGlyph icon={icon} gradId={gradId} glowId={glowId} />
      </svg>
    </span>
  );
}
