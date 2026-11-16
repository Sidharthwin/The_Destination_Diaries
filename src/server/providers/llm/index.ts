import { AnthropicLlmProvider } from "./anthropic";
import type { LlmProvider } from "./types";

export type { LlmProvider } from "./types";

let override: LlmProvider | null | undefined;

/** Test hook: inject a fake provider (or null to disable AI). */
export function setLlmProviderForTests(provider: LlmProvider | null | undefined) {
  override = provider;
}

/**
 * Returns the configured LLM provider, or null when AI is not configured.
 * The planner works fully without it — AI only adds wording and
 * interpretation of free-text requirements.
 */
export function getLlmProvider(): LlmProvider | null {
  if (override !== undefined) return override;
  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  if (provider === "anthropic" && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) {
    return new AnthropicLlmProvider();
  }
  return null;
}
