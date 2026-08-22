import {defineConfig} from "astro/config";
import react from "@astrojs/react";
import {fileURLToPath} from "node:url";
export default defineConfig({
  site:"https://camprocka.online",
  output:"static",
  integrations:[react()],
  vite:{resolve:{alias:{"next/link":fileURLToPath(new URL("./src/shims/Link.tsx",import.meta.url)),"next/image":fileURLToPath(new URL("./src/shims/Image.tsx",import.meta.url))}}}
});
