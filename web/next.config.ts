import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB is far below a phone camera photo -- checklist photo
      // uploads (uploadChecklistPhotoAction) go through a Server Action as
      // multipart FormData, so this cap has to cover a real photo, not
      // just form fields.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
