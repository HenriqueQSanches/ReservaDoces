import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Só páginas pré-renderizadas no build; nada de revalidação, então não precisa de R2 nem KV.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
