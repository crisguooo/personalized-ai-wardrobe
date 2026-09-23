/** Provider boundary: keys stay in this server process. No clothing ownership decisions here. */
export async function summarize(evidence, env = process.env) {
  const fallback = {
    text: evidence.length
      ? `Your ratings lean toward ${evidence.join(", ")}. Keep exploring: these are early signals, not fixed labels.`
      : "Your taste is still taking shape. A few more ratings will help.",
    source: "deterministic",
  };
  if (
    env.AI_PROVIDER !== "anthropic" ||
    !env.ANTHROPIC_API_KEY ||
    !env.ANTHROPIC_MODEL
  )
    return fallback;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 180,
        system:
          "Write two short, tentative, friendly sentences about style preferences. Use only the supplied evidence. Do not invent items, traits, demographics or recommendations. Do not mention body shape.",
        messages: [{ role: "user", content: JSON.stringify({ evidence }) }],
      }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .slice(0, 800);
    return text ? { text, source: "anthropic" } : fallback;
  } catch {
    return fallback;
  }
}
