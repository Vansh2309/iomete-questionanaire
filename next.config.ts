import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // alasql's default entry pulls in Node and React Native file-system shims.
    // The browser build is self-contained, so use it everywhere.
    resolveAlias: {
      alasql: "./node_modules/alasql/dist/alasql.min.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
