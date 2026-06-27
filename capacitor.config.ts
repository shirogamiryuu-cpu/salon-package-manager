import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.salon.manager",
  appName: "Salon Manager",
  webDir: "dist",
  server: {
    // Set to your hosted URL during dev (e.g. the Lovable preview) to live-reload
    // against the dev server. Remove this block for a fully-bundled production build.
    androidScheme: "https",
  },
};

export default config;
