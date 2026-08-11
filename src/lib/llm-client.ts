export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askInsuranceLLM(question: string, history: ChatMessage[] = []) {
  const baseUrl = import.meta.env.VITE_LLM_API_BASE_URL || "/api";
  const apiKey = import.meta.env.VITE_LLM_API_KEY || import.meta.env.FAST_API_KEY || "";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: "insurance-qa-v1",
      messages: [...history, { role: "user", content: question }],
      stream: false,
      mode: "hybrid",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
