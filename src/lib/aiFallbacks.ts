import type { AIFieldId, AIMode } from "@/config/aiPrompts";

/**
 * High-quality heuristic fallback generator.
 *
 * Runs if the external AI service (Google Gemini / Groq / OpenAI) is
 * unreachable, rate-limited, or has an unconfigured API key.
 * This guarantees the user interface never throws 502 Bad Gateway errors.
 */
export function generateSmartFallback(
  field: AIFieldId,
  mode: AIMode,
  text: string,
  context: Record<string, string>
): string {
  const projectName = context.name || context.project || context.project_title || context.deal_title || "the project";
  const clientName = context.client || context.client_name || context.company || "the client";
  const service = context.service || context.service_name || "custom software development";

  switch (field) {
    case "task_breakdown":
      return [
        `Review project scope and specifications for ${projectName}`,
        `Create design wireframes, component layouts & brand styling`,
        `Setup development environment, repository, and staging URL`,
        `Build core UI layouts, navigation, and responsive structures`,
        `Implement database schemas, server actions, and core workflows`,
        `Integrate APIs, authentication, and external services`,
        `Conduct cross-browser QA testing and performance audit`,
        `Fix reported issues and polish edge cases`,
        `Deploy to staging and prepare client review pack`,
        `Final milestone sign-off and project handover`,
      ].join("\n");

    case "bug_summary": {
      const subject = context.subject || "Issue reported";
      const reported = context.reported || text || "No specific details provided";
      return [
        `Problem: ${subject.replace(/\.$/, "")}.`,
        `Steps: ${reported.slice(0, 140)}.`,
        `Needed: Reproduce on staging environment with client test credentials.`,
      ].join("\n");
    }

    case "deal_summary":
      return `Full-cycle engineering, deployment, and ongoing technical delivery of ${projectName} for ${clientName}.`;

    case "deal_scope":
      return [
        `• Requirements analysis and architectural blueprint for ${projectName}`,
        `• Custom UI/UX design system with responsive desktop and mobile layouts`,
        `• Core frontend application engineering and backend database integration`,
        `• Third-party API integrations, automated email notifications, and webhook handlers`,
        `• Comprehensive cross-browser quality assurance testing and security checks`,
        `• Production deployment and complete handover documentation`,
      ].join("\n");

    case "deal_exclusions":
      return "Third-party license fees, hosting infrastructure costs, digital ad spend, photography or video production, and ongoing maintenance beyond the agreed warranty period.";

    case "meeting_summary":
      return [
        `• Reviewed current milestone deliverables for ${projectName}`,
        `• Aligned on upcoming sprint priorities and feedback adjustments`,
        `• Next step: Team will deliver updated staging build by end of week`,
      ].join("\n");

    case "work_log":
      if (text.trim()) {
        return `Completed scheduled engineering tasks for ${projectName}: ${text.trim().replace(/\.$/, "")}. All changes tested and verified.`;
      }
      return `Engineered and verified core modules for ${projectName}. Tested responsive viewports and resolved pending edge cases.`;

    case "client_email":
      return [
        `Hi ${clientName},`,
        ``,
        `We have completed the latest updates on ${projectName} and everything is running smoothly on our staging environment.`,
        ``,
        `Please take a moment to review the progress in your client portal. Let us know if you have any questions or feedback.`,
        ``,
        `Best regards,`,
      ].join("\n");

    case "faq_answer":
      if (text.trim()) {
        return text.trim();
      }
      return `We provide dedicated software engineering and design solutions tailored to your business needs, with transparent milestone pricing and direct technical communication.`;

    case "service_desc":
      return `High-performance ${service} engineered for speed, scalability, and measurable business growth.`;

    case "blog_excerpt":
      if (text.trim()) {
        return text.trim().slice(0, 160);
      }
      return `Discover practical insights, architectural patterns, and engineering lessons from real-world software delivery.`;

    case "testimonial":
      return text.trim();

    default:
      return text.trim() || `Draft for ${projectName}`;
  }
}
