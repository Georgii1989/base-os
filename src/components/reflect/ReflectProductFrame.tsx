import type { AriaAttributes, ReactNode } from "react";

type Props = {
  id?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "hero";
  role?: string;
  tabIndex?: number;
} & Pick<AriaAttributes, "aria-labelledby">;

export function ReflectProductFrame({
  id,
  children,
  className = "",
  variant = "default",
  role,
  "aria-labelledby": ariaLabelledby,
  tabIndex,
}: Props) {
  const variantClass = variant === "hero" ? "reflect-product-frame--hero" : "";
  return (
    <div
      id={id}
      role={role}
      aria-labelledby={ariaLabelledby}
      tabIndex={tabIndex}
      className={`reflect-product-frame outline-none ${variantClass} ${className}`.trim()}
    >
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
