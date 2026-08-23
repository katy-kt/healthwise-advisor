export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askInsuranceLLM(question: string, history: ChatMessage[] = []) {
  const response = await fetch("/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
