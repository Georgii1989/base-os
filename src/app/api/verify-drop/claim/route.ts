import { NextResponse } from "next/server";
import { isAddress, isHex } from "viem";
import { parseSiweMessage } from "viem/siwe";
import { base } from "viem/chains";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import {
  deleteClaimByAddress,
  findClaimByAddress,
  findClaimByToken,
  saveClaim,
} from "@/lib/verifyDrop/claimStore";
import {
  DROP_ACTION,
  DROP_STATEMENT,
  deleteClaimMessage,
  dropProviderConfig,
  isVerifyProviderId,
} from "@/lib/verifyDrop/dropConfig";
import {
  deriveVerificationToken,
  isValidHandle,
  normalizeHandle,
  resolveMockProfile,
} from "@/lib/verifyDrop/mockProvider";
import { evaluateTraits, parseVerifyResources, validateTraits } from "@/lib/verifyDrop/resources";
import type { ClaimErrorPayload, DropClaim } from "@/lib/verifyDrop/types";

export const runtime = "nodejs";

function claimError(status: number, payload: ClaimErrorPayload) {
  return NextResponse.json(payload, { status });
}

/**
 * Claim endpoint — mirrors POST /api/verify-token from base/base-verify-demo:
 * validate trait requirements server-side, check verification, enforce token
 * uniqueness (sybil resistance), then record the claim.
 *
 * Live mode (BASE_VERIFY_API_URL + BASE_VERIFY_SECRET_KEY set) forwards the
 * signature to the real Base Verify API. Without keys it runs the local
 * sandbox verifier with deterministic tokens.
 */
export async function POST(request: Request) {
  let body: { message?: unknown; signature?: unknown; handle?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return claimError(400, { error: "bad_request", message: "Invalid JSON body" });
  }

  const { message, signature, handle } = body;
  if (typeof message !== "string" || typeof signature !== "string" || !isHex(signature)) {
    return claimError(400, {
      error: "bad_request",
      message: "Missing required parameters: message and signature",
    });
  }

  const siwe = parseSiweMessage(message);
  if (!siwe.address || !isAddress(siwe.address)) {
    return claimError(400, { error: "bad_request", message: "SIWE message has no valid address" });
  }
  if (siwe.chainId !== base.id) {
    return claimError(400, { error: "bad_request", message: "SIWE message must target Base (8453)" });
  }
  if (siwe.statement !== DROP_STATEMENT) {
    return claimError(400, { error: "bad_request", message: "Unexpected SIWE statement" });
  }
  if (siwe.expirationTime && siwe.expirationTime.getTime() < Date.now()) {
    return claimError(400, { error: "bad_request", message: "Signature expired — sign again" });
  }

  const parsed = parseVerifyResources(siwe.resources ?? []);
  if (!parsed || parsed.action !== DROP_ACTION) {
    return claimError(400, {
      error: "invalid_traits",
      message: "SIWE resources are missing the verify provider or action URN",
    });
  }

  // Security-critical: requirements signed by the user must match the backend
  // config, otherwise the frontend could relax them (see original demo README).
  const providerConfig = isVerifyProviderId(parsed.provider)
    ? dropProviderConfig(parsed.provider)
    : undefined;
  if (!providerConfig) {
    return claimError(400, {
      error: "invalid_traits",
      message: `Unsupported provider '${parsed.provider}'`,
    });
  }
  const traitsCheck = validateTraits(parsed, providerConfig.id, providerConfig.requirements);
  if (!traitsCheck.valid) {
    return claimError(400, {
      error: "invalid_traits",
      message: traitsCheck.error ?? "Trait requirements do not match this drop",
    });
  }

  // Verify the SIWE signature (EOA + smart wallets via ERC-6492/1271).
  const client = getBasePublicClient();
  let signatureOk = false;
  try {
    signatureOk = await client.verifyMessage({
      address: siwe.address,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    return claimError(401, { error: "invalid_signature", message: "Signature verification failed" });
  }

  const liveApiUrl = process.env.BASE_VERIFY_API_URL;
  const liveSecret = process.env.BASE_VERIFY_SECRET_KEY;

  let token: string;
  let claimedHandle: string | null = null;

  if (liveApiUrl && liveSecret) {
    let verifyResponse: Response;
    try {
      verifyResponse = await fetch(`${liveApiUrl.replace(/\/$/, "")}/base_verify_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${liveSecret}`,
        },
        body: JSON.stringify({ signature, message }),
      });
    } catch {
      return claimError(502, { error: "upstream_error", message: "Base Verify API unreachable" });
    }

    if (verifyResponse.status === 404) {
      return claimError(404, {
        error: "not_verified",
        message: "No verification found for this wallet — complete verification first",
      });
    }
    if (verifyResponse.status === 400) {
      return claimError(400, {
        error: "verification_traits_not_satisfied",
        message: "Account is verified but does not meet the drop requirements",
      });
    }
    if (!verifyResponse.ok) {
      return claimError(502, {
        error: "upstream_error",
        message: `Base Verify API error (${verifyResponse.status})`,
      });
    }

    const data = (await verifyResponse.json()) as { token?: string; data?: { token?: string } };
    const liveToken = data.token ?? data.data?.token;
    if (typeof liveToken !== "string" || liveToken.length === 0) {
      return claimError(502, {
        error: "upstream_error",
        message: "Verification token missing from Base Verify response",
      });
    }
    token = liveToken;
  } else {
    // Sandbox verifier: the linked handle plays the role of the OAuth'd account.
    if (typeof handle !== "string" || handle.trim().length === 0) {
      return claimError(404, {
        error: "not_verified",
        message: "No verification found — link an account first",
      });
    }
    if (!isValidHandle(handle)) {
      return claimError(400, {
        error: "bad_request",
        message: "Handle must be 2–32 chars: letters, digits, dot, dash, underscore",
      });
    }

    const profile = resolveMockProfile(providerConfig.id, handle);
    const evaluation = evaluateTraits(profile.traits, providerConfig.requirements);
    if (!evaluation.satisfied) {
      return claimError(400, {
        error: "verification_traits_not_satisfied",
        message: "Account is verified but does not meet the drop requirements",
        failures: evaluation.failures,
      });
    }

    token = deriveVerificationToken(providerConfig.id, handle, DROP_ACTION);
    claimedHandle = normalizeHandle(handle);
  }

  // Anti-sybil core: one deterministic token = one claim, whatever the wallet.
  const existingByToken = await findClaimByToken(token);
  if (existingByToken) {
    return claimError(409, {
      error: "token_already_used",
      message: "This verified account has already claimed the drop",
      claimedBy: existingByToken.address,
    });
  }
  const existingByAddress = await findClaimByAddress(siwe.address);
  if (existingByAddress) {
    return claimError(409, {
      error: "address_already_claimed",
      message: "This wallet has already claimed the drop",
    });
  }

  const claim: DropClaim = {
    address: siwe.address,
    provider: providerConfig.id,
    token,
    handle: claimedHandle,
    claimedAt: Date.now(),
  };
  await saveClaim(claim);

  return NextResponse.json({ success: true, claim });
}

/** Delete own claim — signed plain message, like the original demo. */
export async function DELETE(request: Request) {
  let body: { address?: unknown; signature?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return claimError(400, { error: "bad_request", message: "Invalid JSON body" });
  }

  const { address, signature } = body;
  if (typeof address !== "string" || !isAddress(address) || typeof signature !== "string" || !isHex(signature)) {
    return claimError(400, { error: "bad_request", message: "address and signature required" });
  }

  const client = getBasePublicClient();
  let signatureOk = false;
  try {
    signatureOk = await client.verifyMessage({
      address,
      message: deleteClaimMessage(address),
      signature: signature as `0x${string}`,
    });
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    return claimError(401, { error: "invalid_signature", message: "Signature verification failed" });
  }

  const removed = await deleteClaimByAddress(address);
  if (!removed) {
    return claimError(404, { error: "bad_request", message: "No claim found for this wallet" });
  }
  return NextResponse.json({ success: true });
}
