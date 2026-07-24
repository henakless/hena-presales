import type { NextConfig } from "next";
import { SITE_BASE_PATH } from "./lib/site";

const nextConfig: NextConfig = {
  basePath: SITE_BASE_PATH,
};

export default nextConfig;
