#!/usr/bin/env node
/**
 * DAPPSNAP webhook receiver.
 *
 * Listens for POST /record requests (from GitHub Actions or manual trigger),
 * runs a screencast recording, and logs the output path.
 *
 * Usage:
 *   node dist/webhook-server.js
 *
 * Endpoint:
 *   POST http://localhost:3333/record
 *   Body: { "pr_number": 123, "pr_title": "feat: new dashboard", "repo": "golemfoundation/octant" }
 *
 * The server runs on port 3333 (local only, not exposed to internet).
 */

import "dotenv/config";
import express from "express";
import { recordScreencast } from "./src/screencast.js";

const PORT = parseInt(process.env.WEBHOOK_PORT ?? "3333", 10);
const app = express();

app.use(express.json());

app.post("/record", async (req, res) => {
  const { pr_number, pr_title, repo, sha } = req.body ?? {};

  console.log(`[webhook] Recording triggered`);
  if (pr_number) console.log(`[webhook] PR #${pr_number}: ${pr_title}`);
  if (repo) console.log(`[webhook] Repo: ${repo}`);
  if (sha) console.log(`[webhook] SHA: ${sha}`);

  try {
    const result = await recordScreencast({
      outputDir: `./recordings/pr-${pr_number ?? "manual"}`,
    });

    console.log(`[webhook] Recording complete: ${result.filePath}`);
    res.json({
      status: "ok",
      filePath: result.filePath,
      durationMs: result.durationMs,
      url: result.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Recording failed: ${message}`);
    res.status(500).json({ status: "error", message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`[webhook] DAPPSNAP webhook server listening on port ${PORT}`);
  console.log(
    `[webhook] POST http://localhost:${PORT}/record to trigger recording`,
  );
  console.log(`[webhook] GET  http://localhost:${PORT}/health for status`);
});
