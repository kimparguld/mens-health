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
