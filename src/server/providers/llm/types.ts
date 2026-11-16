import { z } from "zod";

/**
 * AI is used ONLY for wording and preference interpretation. Schedules,
 * routes and money come from deterministic code. Every model response is
 * validated against these schemas; anything invalid is discarded.
 */

export const explanationSchema = z.object({
  summary: z.string().describe("Two or three sentences introducing the overall plan."),
  dayNotes: z.array(
    z.object({
      dayIndex: z.number().int(),
      title: z.string().describe("A short editorial title for the day, max 6 words."),
      note: z.string().describe("One or two sentences on the day's shape and why it flows."),
    }),
  ),
});
export type Explanation = z.infer<typeof explanationSchema>;

export const interpretedRequirementsSchema = z.object({
  avoidCategories: z.array(z.string()).describe("Interest slugs the traveller wants to avoid."),
  boostCategories: z.array(z.string()).describe("Interest slugs the traveller especially wants."),
  slowerPace: z.boolean().describe("True if they ask for a gentler pace, mobility needs, young children or elderly travellers."),
});
export type InterpretedRequirements = z.infer<typeof interpretedRequirementsSchema>;

export interface ExplainInput {
  destination: string;
  travelStyle: string | null;
  interests: string[];
  days: {
    dayIndex: number;
    date: string;
    stops: { name: string; kind: string; categories: string[]; arrival: string; durationMins: number }[];
    travelMins: number;
  }[];
}

export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmResult<T> {
  value: T;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  /** Returns null when the model declines or its output fails validation. */
  explainItinerary(input: ExplainInput): Promise<LlmResult<Explanation> | null>;
  interpretRequirements(
    text: string,
    knownCategories: string[],
  ): Promise<LlmResult<InterpretedRequirements> | null>;
}
