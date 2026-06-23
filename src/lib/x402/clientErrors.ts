import { decodePaymentRequiredHeader } from "@x402/core/http";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export function resolveX402FetchUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function readX402ResponseError(response: Response): string | null {
  const header = response.headers.get("payment-required");
  if (!header) return null;
  try {
    const decoded = decodePaymentRequiredHeader(header);
    if (typeof decoded.error === "string" && decoded.error.trim()) {
      return decoded.error.trim();
    }
  } catch {
    return null;
  }
  return null;
}

export function formatX402PaymentError(response: Response, fallback?: string | null): string {
  const fromHeader = readX402ResponseError(response);
  const raw = fromHeader ?? fallback;
  if (!raw) {
    if (response.status === 402) {
      return "Payment was not accepted. Ensure you have at least ~$0.001 USDC on Base and approve the wallet signature.";
    }
    return `x402_payment_failed (${response.status})`;
  }

  const lower = raw.toLowerCase();
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Not enough USDC on Base for this payment (~$0.001 required).";
  }
  if (lower.includes("user rejected") || lower.includes("denied")) {
    return "Wallet signature was rejected.";
  }
  if (lower.includes("invalid") && lower.includes("signature")) {
    return "Wallet could not produce a valid payment signature. Try a different wallet on Base.";
  }
  if (lower.includes("self_send_not_allowed") || lower.includes("self send")) {
    return "You cannot pay from the same wallet that receives x402 payouts. Connect a different wallet, or use free Analyze.";
  }
  return raw;
}

export function formatX402ErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("self_send_not_allowed") || lower.includes("self send")) {
    return "You cannot pay from the same wallet that receives x402 payouts. Connect a different wallet, or use free Analyze.";
  }
  if (lower.includes("user rejected") || lower.includes("denied")) {
    return "Wallet signature was rejected.";
  }
  return raw;
}

export { USDC_BASE };
