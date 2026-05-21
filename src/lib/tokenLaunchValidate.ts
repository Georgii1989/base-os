const MAX_NAME_LEN = 32;
const MAX_SYMBOL_LEN = 11;
/** Whole-token cap before parseUnits (18 decimals). */
export const MAX_SUPPLY_WHOLE = "1000000000000000";

export type TokenLaunchForm = {
  name: string;
  symbol: string;
  supplyWhole: string;
};

export type TokenLaunchValidation =
  | { ok: true; name: string; symbol: string; supplyWhole: string }
  | { ok: false; error: string };

export function validateTokenLaunchForm(form: TokenLaunchForm): TokenLaunchValidation {
  const name = form.name.trim();
  const symbol = form.symbol.trim().toUpperCase();
  const supplyWhole = form.supplyWhole.trim().replace(/,/g, "");

  if (!name) return { ok: false, error: "Enter a token name." };
  if (name.length > MAX_NAME_LEN) {
    return { ok: false, error: `Name must be at most ${MAX_NAME_LEN} characters.` };
  }

  if (!symbol) return { ok: false, error: "Enter a symbol (ticker)." };
  if (symbol.length > MAX_SYMBOL_LEN) {
    return { ok: false, error: `Symbol must be at most ${MAX_SYMBOL_LEN} characters.` };
  }
  if (!/^[A-Z0-9]+$/.test(symbol)) {
    return { ok: false, error: "Symbol: letters and numbers only (A–Z, 0–9)." };
  }

  if (!supplyWhole) return { ok: false, error: "Enter initial supply." };
  if (!/^\d+(\.\d+)?$/.test(supplyWhole)) {
    return { ok: false, error: "Supply must be a positive number." };
  }

  const parts = supplyWhole.split(".");
  if (parts[1] && parts[1].length > 18) {
    return { ok: false, error: "At most 18 decimal places." };
  }

  const wholePart = parts[0] || "0";
  if (wholePart.length > MAX_SUPPLY_WHOLE.length) {
    return { ok: false, error: "Supply is too large." };
  }
  if (wholePart.length === MAX_SUPPLY_WHOLE.length && wholePart > MAX_SUPPLY_WHOLE) {
    return { ok: false, error: "Supply is too large." };
  }

  if (Number(supplyWhole) <= 0) {
    return { ok: false, error: "Supply must be greater than zero." };
  }

  return { ok: true, name, symbol, supplyWhole };
}
