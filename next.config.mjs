import { access, symlink } from "node:fs/promises";
import { join } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer, dev }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
      layers: true,
    };

    config.cache = false;

    // workaround for failure during build
    // eg ./node_modules/.pnpm/@noble+curves@1.6.0/node_modules/@noble/curves/esm/secp256k1.js + 6 modules Unexpected end of JSON input 
    if (!dev) {
      config.optimization.concatenateModules = false
    }

    // fix warnings for async functions in the browser (https://github.com/vercel/next.js/issues/64792)
    if (!isServer) {
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };
    }

    // Workaround for https://github.com/vercel/next.js/issues/25852
    config.plugins.push(
      new (class {
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise(
            "SymlinkWebpackPlugin",
            async (compiler) => {
              if (isServer) {
                const from = join(compiler.options.output.path, "../static");
                const to = join(compiler.options.output.path, "static");

                try {
                  await access(from);
                } catch (error) {
                  // Access check failed, need to create symlink
                  if (error.code === "ENOENT") {
                    await symlink(to, from, "junction");
                  } else {
                    console.log(
                      `SymlinkWebpackPlugin: Unexpected failure.  symlink ${from} -> ${to}`,
                    );
                    throw error;
                  }
                }
              }
            },
          );
        }
      })(),
    );

    return config;
  },
};

export default nextConfig;
