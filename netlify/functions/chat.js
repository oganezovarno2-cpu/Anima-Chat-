// netlify/functions/chat.js
exports.handler = async (event, context) => {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    if (!process.env.OPENAI_API_KEY) return { statusCode: 500, headers: CORS, body: "Missing OPENAI_API_KEY" };

    const body = (() => { try { return JSON.parse(event.body || "{}"); } catch { return {}; } })();
    const msg = String(body.message || "").slice(0, 4000);
    const past = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const history = past.map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content || "").slice(0,2000) }));

    const system = [
      "You are Anima — a warm, supportive friend and CBT-informed coach.",
      "Default language is English; switch only if the user explicitly asks (e.g., 'speak Russian').",
      "Keep replies short, kind, and practical (3–6 sentences)."
    ].join(" ");

    const messages = [{ role: "system", content: system }, ...history, { role: "user", content: msg }];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.7, max_tokens: 350, messages })
    });

    if (!r.ok) { const t = await r.text(); return { statusCode: 500, headers: CORS, body: "AI request failed: " + t }; }
    const data = await r.json();
    const reply = (data?.choices?.[0]?.message?.content || "").trim() || "…";
    return { statusCode: 200, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ reply }) };
  } catch {
    return { statusCode: 500, headers: CORS, body: "Server error" };
  }
};
