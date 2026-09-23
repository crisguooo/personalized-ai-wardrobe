export async function summarizeStyle(profile, signal) {
  const response = await fetch("/api/style-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
    signal,
  });
  if (!response.ok)
    throw new Error(
      "Style notes are temporarily unavailable. Your learned preferences are saved.",
    );
  return response.json();
}
