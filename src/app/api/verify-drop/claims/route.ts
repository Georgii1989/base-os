import { NextResponse } from "next/server";
import { claimStoreMode, listClaims } from "@/lib/verifyDrop/claimStore";
import { DROP_ACTION, DROP_AMOUNT_LABEL, DROP_PROVIDERS } from "@/lib/verifyDrop/dropConfig";
import type { ClaimsPayload } from "@/lib/verifyDrop/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const live = Boolean(process.env.BASE_VERIFY_API_URL && process.env.BASE_VERIFY_SECRET_KEY);

  const payload: ClaimsPayload = {
    mode: live ? "live" : "sandbox",
    action: DROP_ACTION,
    amountLabel: DROP_AMOUNT_LABEL,
    providers: DROP_PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      accountNoun: p.accountNoun,
      requirements: p.requirements,
    })),
    claims: await listClaims(),
    storage: claimStoreMode(),
  };

  return NextResponse.json(payload);
}
