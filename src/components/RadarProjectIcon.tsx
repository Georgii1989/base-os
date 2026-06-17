import Image from "next/image";

type Props = {
  iconUrl: string;
  accent: string;
  size?: "card" | "list";
};

const SIZES = {
  card: { box: "h-10 w-10 rounded-lg", img: "h-6 w-6 rounded-md", px: 24 },
  list: { box: "h-8 w-8 rounded-md", img: "h-5 w-5 rounded", px: 20 },
} as const;

export function RadarProjectIcon({ iconUrl, accent, size = "card" }: Props) {
  const s = SIZES[size];
  return (
    <span
      className={`grid shrink-0 place-items-center bg-gradient-to-br ${accent} ${s.box}`}
      aria-hidden
    >
      <Image
        src={iconUrl}
        alt=""
        role="presentation"
        width={s.px}
        height={s.px}
        className={`${s.img} object-contain`}
        referrerPolicy="no-referrer"
        unoptimized
      />
    </span>
  );
}
