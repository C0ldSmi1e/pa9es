"use client";

import { useEffect } from "react";
import { HOST_LABEL_REGEX } from "@/src/schemas/shared";

// Captures ?ref=<username> from any landing URL into a cookie the signup
// flow reads server-side (auth's create.before hook). Client-side on
// purpose: server components can't set cookies, and the proxy stays pure
// host routing. Last-touch wins; renders nothing.
//
// window.location instead of useSearchParams: no Suspense boundary needed,
// and this runs once after hydration — referral capture isn't render state.
const REF_COOKIE = "pa9es_ref";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const ReferralCapture = () => {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search)
      .get("ref")
      ?.trim()
      .toLowerCase();
    if (ref && HOST_LABEL_REGEX.test(ref)) {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
    }
  }, []);
  return null;
};

export { ReferralCapture };
