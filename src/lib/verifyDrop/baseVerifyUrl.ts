/** Official Base Verify host — see docs.base.org/base-account/guides/verify-social-accounts */
export const BASE_VERIFY_ORIGIN = "https://verify.base.dev";

/** Default API base for POST /v1/base_verify_token */
export const DEFAULT_BASE_VERIFY_API_URL = "https://verify.base.dev/v1";

export function buildVerifyRedirectUrl(redirectUri: string, provider: string): string {
  const url = new URL(BASE_VERIFY_ORIGIN);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("providers", provider);
  return url.toString();
}
