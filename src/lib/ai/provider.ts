/**
 * Model-provider abstraction. Nothing else in the app should import an SDK
 * or call a provider's HTTP API directly — go through `getAIProvider()` so
 * providers can be added or swapped without touching feature code.
 */

export interface AIProvider {
  readonly name: string;
  readonly configured: boolean;
  generateText(prompt: string, system?: string): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  get configured() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generateText(prompt: string, system?: string): Promise<string> {
    if (!this.configured) throw new Error("OPENAI_API_KEY is not configured");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  get configured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generateText(prompt: string, system?: string): Promise<string> {
    if (!this.configured) throw new Error("ANTHROPIC_API_KEY is not configured");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic request failed: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
}

class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly configured = true;

  async generateText(prompt: string): Promise<string> {
    return `[demo mode] ${prompt.slice(0, 160)}`;
  }
}

export function getAIProvider(): AIProvider {
  const preferred = process.env.AI_PROVIDER ?? "mock";
  const providers: Record<string, AIProvider> = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    mock: new MockProvider(),
  };
  const provider = providers[preferred] ?? providers.mock;
  return provider.configured ? provider : providers.mock;
}
