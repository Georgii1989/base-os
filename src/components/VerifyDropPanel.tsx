"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { base } from "wagmi/chains";
import { useAccount, useChainId, useConnect, useSignMessage, useSwitchChain } from "wagmi";
import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import { connectorButtonLabel, pickPreferredConnector } from "@/lib/walletConnectors";
import { buildVerifyRedirectUrl } from "@/lib/verifyDrop/baseVerifyUrl";
import { DROP_STATEMENT, deleteClaimMessage } from "@/lib/verifyDrop/dropConfig";
import {
  isValidHandle,
  normalizeHandle,
  resolveMockProfile,
  shortToken,
} from "@/lib/verifyDrop/mockProvider";
import {
  buildVerifyResources,
  evaluateTraits,
  normalizeTraitRequirement,
} from "@/lib/verifyDrop/resources";
import type {
  ClaimErrorPayload,
  ClaimSuccessPayload,
  ClaimsPayload,
  DropClaim,
  VerifyProviderId,
} from "@/lib/verifyDrop/types";

type ClaimResult =
  | { kind: "success"; claim: DropClaim }
  | { kind: "error"; status: number; payload: ClaimErrorPayload };

export function VerifyDropPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const preferredConnector = useMemo(() => pickPreferredConnector(connectors), [connectors]);
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  const [providerId, setProviderId] = useState<VerifyProviderId>("x");
  const [handleInput, setHandleInput] = useState("");
  const [linkedHandle, setLinkedHandle] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);

  const claimsQuery = useQuery({
    queryKey: ["verify-drop", "claims"],
    queryFn: async (): Promise<ClaimsPayload> => {
      const response = await fetch("/api/verify-drop/claims");
      if (!response.ok) throw new Error("claims");
      return (await response.json()) as ClaimsPayload;
    },
    refetchInterval: 30_000,
  });

  const config = claimsQuery.data;
  const isSandbox = (config?.mode ?? "sandbox") === "sandbox";
  const providerConfig = config?.providers.find((p) => p.id === providerId);
  const isOnBase = chainId === BASE_CHAIN_ID;

  const linkedProfile = useMemo(() => {
    if (!isSandbox || !linkedHandle) return null;
    return resolveMockProfile(providerId, linkedHandle);
  }, [isSandbox, linkedHandle, providerId]);

  const linkedEvaluation = useMemo(() => {
    if (!linkedProfile || !providerConfig) return null;
    return evaluateTraits(linkedProfile.traits, providerConfig.requirements);
  }, [linkedProfile, providerConfig]);

  const myClaim = useMemo(() => {
    if (!address || !config) return undefined;
    return config.claims.find((c) => c.address.toLowerCase() === address.toLowerCase());
  }, [address, config]);

  function selectProvider(id: VerifyProviderId) {
    setProviderId(id);
    setLinkedHandle(null);
    setHandleInput("");
    setResult(null);
    setFlowError(null);
  }

  function linkAccount() {
    setFlowError(null);
    setResult(null);
    if (!isValidHandle(handleInput)) {
      setFlowError("Handle must be 2–32 chars: letters, digits, dot, dash, underscore.");
      return;
    }
    setLinkedHandle(normalizeHandle(handleInput));
  }

  async function claimDrop() {
    if (!address || !providerConfig) return;
    setIsClaiming(true);
    setResult(null);
    setFlowError(null);
    try {
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: DROP_STATEMENT,
        uri: window.location.origin,
        version: "1",
        chainId: base.id,
        nonce: generateSiweNonce(),
        issuedAt: new Date(),
        expirationTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        resources: buildVerifyResources(
          providerConfig.id,
          providerConfig.requirements,
          config?.action ?? ""
        ),
      });
      const signature = await signMessageAsync({ message });

      const response = await fetch("/api/verify-drop/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          signature,
          handle: isSandbox ? linkedHandle : undefined,
        }),
      });
      const payload = (await response.json()) as ClaimSuccessPayload | ClaimErrorPayload;

      if (response.ok && "success" in payload) {
        setResult({ kind: "success", claim: payload.claim });
        void queryClient.invalidateQueries({ queryKey: ["verify-drop", "claims"] });
      } else {
        setResult({
          kind: "error",
          status: response.status,
          payload: payload as ClaimErrorPayload,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setFlowError(
        message.toLowerCase().includes("rejected")
          ? "Signature request was rejected in the wallet."
          : `Claim failed: ${message}`
      );
    } finally {
      setIsClaiming(false);
    }
  }

  async function deleteMyClaim() {
    if (!address) return;
    setIsDeleting(true);
    setFlowError(null);
    try {
      const signature = await signMessageAsync({ message: deleteClaimMessage(address) });
      const response = await fetch("/api/verify-drop/claim", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ClaimErrorPayload;
        setFlowError(payload.message ?? "Delete failed");
      } else {
        setResult(null);
        void queryClient.invalidateQueries({ queryKey: ["verify-drop", "claims"] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setFlowError(
        message.toLowerCase().includes("rejected")
          ? "Signature request was rejected in the wallet."
          : `Delete failed: ${message}`
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const verifyRedirectUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const returnTo = `${window.location.origin}${window.location.pathname}?tab=drop`;
    return buildVerifyRedirectUrl(returnTo, providerId);
  }, [providerId]);

  const canClaim =
    isConnected && isOnBase && Boolean(providerConfig) && (!isSandbox || Boolean(linkedHandle));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="os-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="os-eyebrow text-violet-200/90">Base Verify</p>
            <h2 className="os-display mt-2 text-3xl font-semibold text-white">
              Sybil-resistant claim
            </h2>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              isSandbox
                ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
                : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {isSandbox ? "Sandbox verifier" : "Live Base Verify"}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-slate-200/85">
          Integration demo for{" "}
          <a
            href="https://docs.base.org/base-account/guides/verify-social-accounts"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-violet-200 underline decoration-violet-500/40 underline-offset-4 hover:text-violet-100"
          >
            Base Verify
          </a>
          : prove ownership of X, Coinbase, Instagram, or TikTok, receive a{" "}
          <span className="text-amber-200">deterministic token</span>, and claim{" "}
          {config?.amountLabel ?? "the reward"} once — even if you switch wallets.
        </p>
        {isSandbox ? (
          <p className="mt-2 max-w-2xl text-xs text-slate-400">
            API keys require Base approval — this tab runs a local sandbox verifier (handle →
            deterministic token). For production, set{" "}
            <code className="rounded bg-black/40 px-1 font-mono text-[11px] text-amber-100">BASE_VERIFY_API_URL</code>{" "}
            and{" "}
            <code className="rounded bg-black/40 px-1 font-mono text-[11px] text-amber-100">BASE_VERIFY_SECRET_KEY</code>{" "}
            (see README).
          </p>
        ) : null}

        {!isConnected ? (
          <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-100">Step 1 — connect your wallet to start the claim.</p>
            <button
              type="button"
              disabled={isConnecting || !preferredConnector}
              onClick={() =>
                preferredConnector &&
                connect({ connector: preferredConnector })
              }
              className="mt-3 rounded-xl border border-amber-200/40 bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-100 disabled:opacity-40"
            >
              {connectorButtonLabel(preferredConnector, isConnecting)}
            </button>
          </div>
        ) : !isOnBase ? (
          <div className="mt-6 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-4">
            <p className="text-sm text-fuchsia-100">Switch to the Base network to continue.</p>
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => void switchChainAsync({ chainId: BASE_CHAIN_ID })}
              className="mt-3 rounded-xl border border-fuchsia-200/40 bg-fuchsia-500/20 px-4 py-2 text-sm font-bold text-fuchsia-100"
            >
              Switch to Base
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Step 1 — provider
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(config?.providers ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProvider(p.id)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      p.id === providerId
                        ? "border-violet-300/50 bg-violet-500/25 text-violet-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-300/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {providerConfig ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(providerConfig.requirements).map(([trait, requirement]) => (
                    <span
                      key={trait}
                      className="rounded-lg border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-100"
                    >
                      {trait}:{normalizeTraitRequirement(requirement)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {isSandbox ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Step 2 — link {providerConfig?.accountNoun ?? "account"} (simulated OAuth)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Production OAuth runs at{" "}
                  <span className="font-mono text-slate-400">verify.base.dev</span> — here you type a
                  handle and the sandbox derives traits deterministically.
                </p>
                {verifyRedirectUrl ? (
                  <a
                    href={verifyRedirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-100 hover:bg-violet-500/20"
                  >
                    Open Base Verify (OAuth preview)
                  </a>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") linkAccount();
                    }}
                    placeholder="@yourhandle"
                    spellCheck={false}
                    className="os-input max-w-xs font-mono outline-none focus:border-violet-400/40"
                  />
                  <button
                    type="button"
                    onClick={linkAccount}
                    className="rounded-xl border border-violet-300/40 bg-violet-500/20 px-4 py-2 text-sm font-bold text-violet-100"
                  >
                    Link account
                  </button>
                </div>
                {linkedProfile && linkedEvaluation ? (
                  <div
                    className={`mt-3 rounded-2xl border p-4 ${
                      linkedEvaluation.satisfied
                        ? "border-emerald-300/25 bg-emerald-500/10"
                        : "border-rose-300/25 bg-rose-500/10"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      @{linkedProfile.handle} — sandbox profile
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(linkedProfile.traits).map(([trait, value]) => (
                        <span
                          key={trait}
                          className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-200"
                        >
                          {trait}={value}
                        </span>
                      ))}
                    </div>
                    <p
                      className={`mt-2 text-sm font-bold ${
                        linkedEvaluation.satisfied ? "text-emerald-100" : "text-rose-100"
                      }`}
                    >
                      {linkedEvaluation.satisfied
                        ? "Meets Base Verify requirements — ready to claim."
                        : `Does not meet requirements: ${linkedEvaluation.failures.join("; ")}`}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Step 2 — verify at Base Verify
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Connect your social account via OAuth. When you return, sign SIWE and claim — if the
                  wallet is not verified yet, the API returns 404.
                </p>
                {verifyRedirectUrl ? (
                  <a
                    href={verifyRedirectUrl}
                    className="mt-3 inline-flex rounded-xl border border-violet-300/40 bg-violet-500/20 px-4 py-2 text-sm font-bold text-violet-100 hover:bg-violet-500/30"
                  >
                    Verify with {providerConfig?.label ?? "provider"}
                  </a>
                ) : null}
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Step {isSandbox ? "3" : "3"} — sign &amp; claim
              </p>
              <button
                type="button"
                disabled={!canClaim || isClaiming}
                onClick={() => void claimDrop()}
                className="mt-2 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isClaiming ? "Claiming…" : `Claim ${config?.amountLabel ?? "reward"}`}
              </button>
              {isSandbox && !linkedHandle ? (
                <p className="mt-2 text-xs text-slate-500">Link an account first to enable the claim.</p>
              ) : null}
            </div>

            {flowError ? (
              <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
                {flowError}
              </div>
            ) : null}
            {result ? <ClaimResultCard result={result} myAddress={address} /> : null}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
            Why this blocks sybils
          </p>
          <p className="mt-2 text-sm text-slate-300">
            The verification token is deterministic: the same provider account always produces the
            same token. Claim once, then connect a different wallet and link the{" "}
            <span className="text-amber-200">same handle</span> — the API answers{" "}
            <span className="font-mono text-rose-200">409 token_already_used</span>. One verified
            account = one token = one claim.
          </p>
        </div>
      </div>

      <aside className="os-panel p-5">
        <div className="flex items-center justify-between">
          <h3 className="os-display text-base font-semibold text-amber-100">Claim feed</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            {config?.claims.length ?? 0} claimed
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Demo storage is in-memory — claims reset on server restart.
        </p>

        {myClaim ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/80">
              Your claim
            </p>
            <p className="mt-1 font-mono text-xs text-emerald-100" title={myClaim.token}>
              {shortToken(myClaim.token)}
            </p>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void deleteMyClaim()}
              className="mt-2 rounded-lg border border-rose-300/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-100 disabled:opacity-40"
            >
              {isDeleting ? "Deleting…" : "Delete my claim"}
            </button>
          </div>
        ) : null}

        <ul className="mt-4 grid gap-2">
          {claimsQuery.isLoading ? (
            <li className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-500">
              Loading claims…
            </li>
          ) : (config?.claims.length ?? 0) === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-500">
              No claims yet — be the first.
            </li>
          ) : (
            (config?.claims ?? []).map((claim) => (
              <li key={claim.token} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-violet-300/25 bg-violet-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
                    {claim.provider}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(claim.claimedAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {claim.handle ? (
                  <p className="mt-1.5 text-sm font-semibold text-slate-200">@{claim.handle}</p>
                ) : null}
                <OsAddressDisplay
                  address={claim.address}
                  className="mt-1"
                  monoClassName="font-mono text-xs text-slate-400"
                />
                <p className="mt-1 font-mono text-[11px] text-slate-500" title={claim.token}>
                  token {shortToken(claim.token)}
                </p>
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}

function ClaimResultCard({
  result,
  myAddress,
}: {
  result: ClaimResult;
  myAddress: `0x${string}` | undefined;
}) {
  if (result.kind === "success") {
    return (
      <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
          200 — drop claimed
        </p>
        <p className="mt-2 text-sm text-emerald-50/90">
          Verification token (deterministic, anti-sybil key):
        </p>
        <p className="mt-1 break-all font-mono text-xs text-emerald-100">{result.claim.token}</p>
        <p className="mt-2 text-xs text-emerald-200/70">
          Now try another wallet with the same handle — the same token comes back and the claim is
          rejected.
        </p>
      </div>
    );
  }

  const { status, payload } = result;
  const isDuplicate = payload.error === "token_already_used" || payload.error === "address_already_claimed";
  const isTraits = payload.error === "verification_traits_not_satisfied";
  const isNotVerified = payload.error === "not_verified";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDuplicate
          ? "border-rose-300/30 bg-rose-500/10"
          : isTraits
            ? "border-amber-300/30 bg-amber-500/10"
            : "border-white/15 bg-white/5"
      }`}
    >
      <p
        className={`text-sm font-black uppercase tracking-[0.18em] ${
          isDuplicate ? "text-rose-200" : isTraits ? "text-amber-200" : "text-slate-200"
        }`}
      >
        {status} — {payload.error}
      </p>
      <p className="mt-2 text-sm text-slate-200/90">{payload.message}</p>
      {payload.failures && payload.failures.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {payload.failures.map((failure) => (
            <li key={failure} className="font-mono text-xs text-amber-100/90">
              {failure}
            </li>
          ))}
        </ul>
      ) : null}
      {payload.error === "token_already_used" && payload.claimedBy ? (
        <p className="mt-2 text-xs text-rose-100/80">
          Claimed by{" "}
          <span className="font-mono">
            {payload.claimedBy.toLowerCase() === myAddress?.toLowerCase()
              ? "this wallet"
              : payload.claimedBy}
          </span>{" "}
          — sybil resistance in action.
        </p>
      ) : null}
      {isNotVerified ? (
        <p className="mt-2 text-xs text-slate-400">
          {`Equivalent of Base Verify's 404: complete the verification step, then claim again.`}
        </p>
      ) : null}
    </div>
  );
}
