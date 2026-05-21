import { generateIdentityCardOgImage } from "@/lib/identityCardOgImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Base OS onchain identity card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ address: string }> };

export default async function Image({ params }: Props) {
  const { address } = await params;
  return generateIdentityCardOgImage(address);
}
