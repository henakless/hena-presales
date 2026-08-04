import type { NextConfig } from "next";
import { SITE_BASE_PATH } from "./lib/site";

const nextConfig: NextConfig = {
  basePath: SITE_BASE_PATH,
  experimental: {
    serverActions: {
      // Multipart uploads include a small amount of framing around the app's
      // 24 MB image limit, so leave enough room for that overhead.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
