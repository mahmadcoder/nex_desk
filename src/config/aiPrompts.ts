/**
 * What the AI is asked to do, per field.
 *
 * The assist button is only as good as these. Three rules hold everywhere:
 *
 *  1. The output is the REPLACEMENT TEXT ONLY — no preamble, no "Here's a
 *     version:", no wrapping quotes. The route strips stragglers, but the
 *     prompt does the real work.
 *  2. Context from the form is interpolated so suggestions are grounded in the
 *     actual project, not generic agency filler.
 *  3. Nothing is invented. Especially testimonials: polishing a client's words
 *     into praise they never gave is the fastest way to lose the trust the
 *     testimonial exists to build.
 */

export type AIFieldId =
  | "deal_summary"
  | "deal_scope"
  | "deal_exclusions"
  | "faq_answer"
  | "testimonial"
  | "service_desc"
  | "work_log"
  | "client_email"
  | "blog_excerpt"
  | "meeting_summary"
  | "task_breakdown"
  | "bug_summary";

export type AIMode = "improve" | "suggest";

type PromptBuilder = (args: {
  text: string;
  context: Record<string, string>;
  mode: AIMode;
}) => string;

const VOICE =
  "Write in plain, confident English for a software agency called Nex Desk. " +
  "Short sentences. No buzzwords, no exclamation marks, no emoji. " +
  "British spelling is fine. Output ONLY the final text — no preamble, no quotes, no markdown.";

const ctxLines = (context: Record<string, string>) =>
  Object.entries(context)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

export const AI_PROMPTS: Record<AIFieldId, PromptBuilder> = {
  deal_summary: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the one-line summary of a project agreement. It appears at the top of the signed PDF the client keeps, so it must say plainly what is being built and for whom. One sentence, maximum 20 words.\n\nProject details:\n${ctxLines(context)}\n\n${
      mode === "improve"
        ? `Rewrite this draft, fixing grammar and making it read professionally while keeping its meaning:\n${text}`
        : `Write the summary from the project details above.`
    }`,

  deal_scope: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the "Scope of work" section of a fixed-price agreement. Be specific: this text is what the client can hold the agency to, and what protects the agency from scope creep. Use short plain sentences or a compact list. 60–140 words.\n\nProject details:\n${ctxLines(context)}\n\n${
      mode === "improve"
        ? `Rewrite this draft scope. Keep every commitment it makes — fix the language, do not add or remove obligations:\n${text}`
        : `Draft the scope from the project details above. Cover only what the deliverables imply; invent nothing.`
    }`,

  deal_exclusions: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the "Explicitly not included" section of a fixed-price agreement — the list that prevents arguments later. Plain, unapologetic, comma-separated or short lines. 15–60 words.\n\nProject details:\n${ctxLines(context)}\n\n${
      mode === "improve"
        ? `Rewrite this draft, keeping every exclusion it names:\n${text}`
        : `Suggest sensible exclusions for this kind of project (for example content writing, photography, ad spend, third-party licences, hosting fees — only where they fit).`
    }`,


  meeting_summary: ({ text, context, mode }) =>
    `${VOICE}

You are writing up what was DECIDED in a client call, for the client to read in their portal. Only decisions, owners and dates — not a transcript, not small talk. If the input does not say what was decided, say what was discussed and leave it at that; inventing an agreement the client never made is the worst possible failure here. 40–100 words.

Meeting:
${ctxLines(context)}

${
      mode === "improve"
        ? `Tidy these notes into something the client can read. Keep every commitment exactly as written — change no dates, names or numbers:
${text}`
        : `Draft the notes from the meeting details above. Where something is not stated, leave it out rather than guessing.`
    }`,

  task_breakdown: ({ text, context, mode }) =>
    `${VOICE}

You are breaking a project scope into the tasks a developer or designer would actually do. Rules:
- One task per line, no numbering, no bullets, no headings.
- Each line is a concrete piece of work someone can finish and tick off — "Build the checkout form validation", not "Frontend work".
- Order them the way the work would happen.
- Between 5 and 15 lines.
- Cover only what the scope implies. Invent nothing, and do not add generic filler like "kick-off meeting" or "final testing" unless the scope calls for it.

Project:
${ctxLines(context)}

${
      mode === "improve"
        ? `Rewrite this task list, keeping every task it contains:
${text}`
        : `Write the task list from the project details above.`
    }`,


  bug_summary: ({ text, context, mode }) =>
    `${VOICE}

You are turning a support ticket written by a non-technical client into something a developer can act on. Produce exactly three short labelled lines and nothing else:

Problem: what is actually broken, in one sentence.
Steps: what the client did, as far as the message says.
Needed: the specific information missing to reproduce it — or "nothing, this is reproducible" if the message is already complete.

Do NOT guess at a cause, and do NOT invent steps the client did not describe. A confident wrong diagnosis costs more time than no diagnosis.

Ticket:
${ctxLines(context)}

${
      mode === "improve" ? `Tighten this summary:
${text}` : `Summarise the ticket above.`
    }`,

  faq_answer: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are answering a question on a software agency's public FAQ page. Honest and direct; admit trade-offs rather than dodging. 40–90 words.\n\n${ctxLines(context)}\n\n${
      mode === "improve"
        ? `Rewrite this draft answer, keeping its substance:\n${text}`
        : `Write the answer to the question above.`
    }`,

  testimonial: ({ text, context }) =>
    `${VOICE}\n\nCorrect ONLY the grammar, spelling and punctuation of this client testimonial. Keep the client's own voice, word choice and level of enthusiasm exactly as it is. Do NOT strengthen the praise, do NOT add anything, do NOT make it more polished than the person actually wrote. If it is already correct, return it unchanged.\n\n${ctxLines(context)}\n\nTestimonial:\n${text}`,

  service_desc: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the one-to-two line description of a service on an agency website. Say what the client gets and why it matters — not what the agency does. Maximum 25 words.\n\n${ctxLines(context)}\n\n${
      mode === "improve" ? `Rewrite this draft:\n${text}` : `Write the description from the details above.`
    }`,

  work_log: ({ text, context }) =>
    `${VOICE}\n\nRewrite this daily work log entry so a non-technical client can read it on their project timeline. Keep every fact — what was done stays what was done. Translate jargon, fix grammar, keep it to the point. First person plural ("we") is fine.\n\n${ctxLines(context)}\n\nEntry:\n${text}`,

  client_email: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the body of an email from the agency to a client or prospective client. Warm but businesslike; no grovelling, no hard sell. Keep it under 150 words. Do not include a subject line. End with "Best regards" and no name (the signature is added separately).\n\n${ctxLines(context)}\n\n${
      mode === "improve"
        ? `Rewrite this draft, keeping its intent and any specifics it mentions:\n${text}`
        : `Draft the email from the details above.`
    }`,

  blog_excerpt: ({ text, context, mode }) =>
    `${VOICE}\n\nYou are writing the one-to-two sentence excerpt shown under a blog post title. It should make a busy founder want to read the post. Maximum 30 words, no clickbait.\n\n${ctxLines(context)}\n\n${
      mode === "improve" ? `Rewrite this draft:\n${text}` : `Write the excerpt for the post above.`
    }`,
};
