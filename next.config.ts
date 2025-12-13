import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const remotePatterns =
  supabaseUrl !== undefined
    ? (() => {
        try {
          const url = new URL(supabaseUrl);
          const protocol = url.protocol.replace(":", "") as "http" | "https";

          return [
            {
              protocol,
              hostname: url.hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ];
        } catch {
          return [];
        }
      })()
    : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  reactCompiler: true,
};

export default nextConfig;
