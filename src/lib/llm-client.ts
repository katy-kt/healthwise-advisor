export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askInsuranceLLM(
  question: string,
  history: ChatMessage[] = [],
  options: { jsonMode?: boolean; mode?: "hybrid" | "fast"; maxTokens?: number } = {},
) {
  const response = await fetch("/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "insurance-qa-v1",
      messages: [...history, { role: "user", content: question }],
      stream: false,
      mode: options.mode ?? "hybrid",
      ...(options.jsonMode
        ? { max_tokens: options.maxTokens ?? 16000 }
        : {}),
      ...(options.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (data?.choices?.[0]?.finish_reason === "length") {
    throw new Error("LLM 回應被截斷，請再試一次");
  }
  return data?.choices?.[0]?.message?.content ?? "";
}
