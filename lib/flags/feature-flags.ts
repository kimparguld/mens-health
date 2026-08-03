// import { flag } from "flags/next";
// import { vercelAdapter } from "@flags-sdk/vercel";

// export const premiumEnabledFlag = flag({
//   key: "premium",
//   adapter: vercelAdapter(),
// });

export const premium = {
  isEnabled: () => {
    // For now, always return true to enable the premium features
    return false; // Change this to true to enable premium features
  },
};

// Instant kill switch for MEDIUM-risk video auto-publish (see
// lib/publishing/auto-publish-gate.ts) — flip to false to pause it without
// a deploy if something looks wrong. HIGH-risk auto-publish is never gated
// behind a flag: it is hard-disabled in code with no override.
export const mediumRiskAutoPublish = {
  isEnabled: () => true,
};
