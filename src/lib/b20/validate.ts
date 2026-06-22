import { parseUnits } from "viem";
import {
  B20_MAX_DECIMALS,
  B20_MAX_SUPPLY_CAP,
  B20_MIN_DECIMALS,
} from "@/lib/b20/constants";
import {
  MAX_SUPPLY_WHOLE,
  validateTokenLaunchForm,
  type TokenLaunchForm,
} from "@/lib/tokenLaunchValidate";

export type B20LaunchForm = TokenLaunchForm & {
  decimals: string;
  capWhole: string;
};

export type B20LaunchValidation =
  | {
      ok: true;
      name: string;
      symbol: string;
      supplyWhole: string;
      capWhole: string;
      decimals: number;
    }
  | { ok: false; error: string };

export function validateB20LaunchForm(form: B20LaunchForm): B20LaunchValidation {
  const base = validateTokenLaunchForm(form);
  if (!base.ok) return base;

  const decimalsRaw = form.decimals.trim();
  if (!/^\d+$/.test(decimalsRaw)) {
    return { ok: false, error: "Decimals must be a whole number." };
  }
  const decimals = Number(decimalsRaw);
  if (decimals < B20_MIN_DECIMALS || decimals > B20_MAX_DECIMALS) {
    return {
      ok: false,
      error: `Decimals must be between ${B20_MIN_DECIMALS} and ${B20_MAX_DECIMALS}.`,
    };
  }

  const capWhole = form.capWhole.trim().replace(/,/g, "");
  if (!capWhole) return { ok: false, error: "Enter a supply cap." };
  if (!/^\d+(\.\d+)?$/.test(capWhole)) {
    return { ok: false, error: "Supply cap must be a positive number." };
  }
  const capParts = capWhole.split(".");
  if (capParts[1] && capParts[1].length > decimals) {
    return { ok: false, error: "Cap has too many decimal places for chosen decimals." };
  }
  if (Number(capWhole) <= 0) {
    return { ok: false, error: "Supply cap must be greater than zero." };
  }
  if (Number(capWhole) < Number(base.supplyWhole)) {
    return { ok: false, error: "Supply cap must be at least the initial mint amount." };
  }

  const capWholePart = capParts[0] || "0";
  if (capWholePart.length > MAX_SUPPLY_WHOLE.length) {
    return { ok: false, error: "Supply cap is too large." };
  }

  return {
    ok: true,
    name: base.name,
    symbol: base.symbol,
    supplyWhole: base.supplyWhole,
    capWhole,
    decimals,
  };
}

export function capToWei(capWhole: string, decimals: number): bigint {
  const value = parseUnits(capWhole, decimals);
  if (value > B20_MAX_SUPPLY_CAP) {
    throw new Error("Supply cap exceeds uint128 maximum.");
  }
  return value;
}
