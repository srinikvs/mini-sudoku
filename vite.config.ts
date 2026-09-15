import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";

function redirectRoot(): Plugin {
  const redirect = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url === "/" || req.url === "") {
      res.statusCode = 302;
      res.setHeader("Location", "/mini-sudoku/");
      res.end();
      return;
    }
    next();
  };
  return {
    name: "redirect-root",
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: "/mini-sudoku/",
  plugins: [redirectRoot(), react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
