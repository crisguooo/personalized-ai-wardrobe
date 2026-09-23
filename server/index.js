import http from "node:http";
import { summarize } from "./provider.js";
import { LABELS } from "../src/engine/wardrobe.js";
const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  if (req.url !== "/api/style-summary" || req.method !== "POST")
    return send(404, { error: "Not found" });
  if (req.headers["sec-fetch-site"] === "cross-site")
    return send(403, { error: "Cross-site request denied" });
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 16000) return send(413, { error: "Request too large" });
    }
    const data = JSON.parse(body);
    const weights = data.profile?.weights;
    if (!weights || typeof weights !== "object")
      return send(400, { error: "Invalid preference profile" });
    const evidence = Object.entries(weights)
      .filter(
        ([k, v]) =>
          LABELS[k] &&
          typeof v === "number" &&
          Number.isFinite(v) &&
          v > 0.1 &&
          v <= 1,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => LABELS[k]);
    return send(200, await summarize(evidence));
  } catch {
    return send(503, {
      error:
        "Summary unavailable; deterministic recommendations remain available",
    });
  }
});
const port = Number(process.env.API_PORT) || 3001;
server.listen(port, "127.0.0.1", () =>
  console.log(`Optional style API listening on http://127.0.0.1:${port}`),
);
