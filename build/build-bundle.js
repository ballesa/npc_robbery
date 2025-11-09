require("dotenv").config();

const esbuild = require("esbuild");

const IS_WATCH_MODE = process.env.IS_WATCH_MODE === "true";

const TARGET_ENTRIES = [
  {
    target: "node16",
    entryPoints: ["server/server.ts"],
    platform: "node",
    outfile: "./dist/server/server.js",
  },
  {
    target: "es2020",
    entryPoints: ["client/client.ts"],
    outfile: "./dist/client/client.js",
  },
];

const buildBundle = async () => {
  try {
    const baseOptions = {
      logLevel: "info",
      bundle: true,
      charset: "utf8",
      minifyWhitespace: true,
      absWorkingDir: process.cwd(),
    };

    for (const targetOpts of TARGET_ENTRIES) {
      const mergedOpts = { ...baseOptions, ...targetOpts };

      const ctx = await esbuild.context(mergedOpts);

      if (IS_WATCH_MODE) {
        await ctx.watch();
        console.log(`[ESBuild Watch] Watching: ${targetOpts.entryPoints[0]}`);
      } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log(`[ESBuild] Built: ${targetOpts.entryPoints[0]}`);
      }
    }
  } catch (e) {
    console.error("[ESBuild] Build failed with error");
    console.error(e);
    process.exit(1);
  }
};

buildBundle().catch(() => process.exit(1));