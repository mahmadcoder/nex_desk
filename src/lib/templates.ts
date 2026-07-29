import type { AgencyTemplate } from "@/types/templates";
export type { AgencyTemplate };

export const AGENCY_TEMPLATES: AgencyTemplate[] = [
  {
    id: "master_agreement",
    title: "Master Software Services Agreement",
    category: "Agreements",
    badge: "Legal Contract",
    iconName: "FileText",
    description:
      "Comprehensive master service contract covering project scope, deliverables, payment terms, revision caps, IP transfer, and termination terms.",
    textContent: `============================================================
NEX DESK — MASTER SOFTWARE SERVICES AGREEMENT
============================================================

Date: {{DATE}}
Agreement No: ND-MSA-{{YEAR}}-001

PARTIES:
1. Nex Desk ("Agency"), a software agency registered in Pakistan.
2. {{CLIENT_NAME}} / {{CLIENT_COMPANY}} ("Client"), located at {{CLIENT_ADDRESS}}.

1. SERVICES & SCOPE
The Agency shall provide custom software development, design, and technical services ("Services") as specified in the agreed project scope.

2. PAYMENT & SCHEDULE
- Work commences upon receipt of the agreed advance payment (typically 50%).
- Final deliverables, source code, and production credentials shall be transferred upon settlement of final invoice.
- Invoices are payable in {{CURRENCY}} via Bank Transfer, Wise, Stripe, or agreed gateway.

3. REVISIONS & CHANGE ORDERS
- Includes two (2) full rounds of revisions per deliverable within original scope.
- Additional scope items or extra rounds of revisions will be billed separately as a Change Order.

4. INTELLECTUAL PROPERTY
Full ownership of custom source code, design assets, and database schemas transfers to the Client upon 100% full payment. The Agency retains rights to pre-existing libraries and frameworks.

5. CONFIDENTIALITY
Both parties agree to protect proprietary code, trade secrets, business strategies, and credentials.

6. CANCELLATION & TERMINATION
Either party may terminate with 7 days written notice. Work completed up to the date of cancellation is payable.

SIGNATURES:

_______________________                   _______________________
For Nex Desk (Agency)                     For {{CLIENT_NAME}} (Client)
Date: {{DATE}}                            Date: {{DATE}}
`,
  },
  {
    id: "nda",
    title: "Non-Disclosure Agreement (NDA)",
    category: "Agreements",
    badge: "Confidentiality",
    iconName: "Shield",
    description:
      "Mutual Non-Disclosure Agreement protecting proprietary code, database architectures, client data, and agency trade secrets.",
    textContent: `============================================================
MUTUAL NON-DISCLOSURE AGREEMENT (NDA)
============================================================

Effective Date: {{DATE}}

PARTIES:
- Nex Desk ("Disclosing / Receiving Party")
- {{CLIENT_NAME}} / {{CLIENT_COMPANY}} ("Disclosing / Receiving Party")

1. PURPOSE
The parties wish to explore a business relationship regarding software development and technology solutions ("Project"). In connection with this, proprietary information may be shared.

2. CONFIDENTIAL INFORMATION
Includes all source code, software designs, business plans, financial information, client data, credentials, and technical documentation.

3. OBLIGATIONS
The Receiving Party agrees to:
a) Hold Confidential Information in strict confidence.
b) Use it solely for evaluating or completing the Project.
c) Restrict disclosure to employees and contractors with a need-to-know.

4. TERM & DURATION
This agreement remains in effect for two (2) years from the Effective Date.

SIGNATURES:

_______________________                   _______________________
Nex Desk Authorized Representative        {{CLIENT_NAME}} Authorized Representative
`,
  },
  {
    id: "sow",
    title: "Statement of Work (SOW)",
    category: "Contracts",
    badge: "Scope & Milestones",
    iconName: "Layers",
    description:
      "Detailed breakdown of technical deliverables, milestone timelines, acceptance criteria, and tech stack specification.",
    textContent: `============================================================
NEX DESK — STATEMENT OF WORK (SOW)
============================================================

Project Title: {{PROJECT_NAME}}
Client: {{CLIENT_NAME}} ({{CLIENT_COMPANY}})
Date: {{DATE}}

1. PROJECT OVERVIEW
Full-stack custom software build according to agreed architecture and design system.

2. TECHNICAL DELIVERABLES
- Responsive Web Application (Next.js / React / TypeScript)
- Custom Database & Backend API Integration (Supabase / Node.js)
- Responsive Design System (Mobile + Desktop)
- Admin Management Dashboard
- Automated Deployment & CI/CD Pipeline

3. MILESTONE SCHEDULE
Milestone 1: Architecture & UI/UX Design Approval — 25% Payment
Milestone 2: Core Feature Build & Database Integration — 50% Payment
Milestone 3: QA Testing, Staging Review & Launch — 25% Final Payment

4. CLIENT ACCEPTANCE
Client gets 5 working days following milestone submission to provide feedback or approve deliverables.

SIGNATURES:

_______________________                   _______________________
Nex Desk Lead                             Client Approval
`,
  },
  {
    id: "handover_letter",
    title: "Project Handover & Sign-Off Letter",
    category: "Letters",
    badge: "Deliverable Transfer",
    iconName: "CheckCircle",
    description:
      "Formal project handover letter confirming code repository transfer, live server credentials, domain handover, and client acceptance.",
    textContent: `============================================================
NEX DESK — PROJECT HANDOVER & SIGN-OFF LETTER
============================================================

Date: {{DATE}}
Project: {{PROJECT_NAME}}
Client: {{CLIENT_NAME}} / {{CLIENT_COMPANY}}

Dear {{CLIENT_NAME}},

We are pleased to confirm the successful completion and official handover of {{PROJECT_NAME}}.

HANDOVER CHECKLIST:
[✓] Production Source Code (GitHub Repository Transfer)
[✓] Live Server & Hosting Setup (Vercel / AWS / DigitalOcean)
[✓] Database Credentials & Environment Keys
[✓] Administrative Access & Credentials Transfer
[✓] User Documentation & Handoff Briefing

SUPPORT PERIOD:
As part of our commitment to quality, {{PROJECT_NAME}} includes 30 days of complimentary bug-fix support effective from today's date.

ACCEPTANCE CONFIRMATION:
By signing below, the Client confirms full receipt of deliverables and authorizes final project closure.

_______________________                   _______________________
Nex Desk Lead                             Client Sign-Off
Date: {{DATE}}                            Date: {{DATE}}
`,
  },
  {
    id: "completion_cert",
    title: "Certificate of Project Completion",
    category: "Letters",
    badge: "Official Certificate",
    iconName: "Award",
    description:
      "Official agency certificate presented to clients celebrating the successful launch of their project.",
    textContent: `============================================================
CERTIFICATE OF PROJECT COMPLETION
Presented by Nex Desk Software Agency
============================================================

THIS IS TO CERTIFY THAT THE PROJECT:

" {{PROJECT_NAME}} "

DEVELOPED FOR:
{{CLIENT_NAME}} — {{CLIENT_COMPANY}}

HAS BEEN SUCCESSFULLY DESIGNED, BUILT, TESTED, AND LAUNCHED TO PRODUCTION SPECIFICATIONS.

Date of Issue: {{DATE}}
Certificate ID: ND-CERT-{{YEAR}}-{{CLIENT_NAME_SHORT}}

Certified By:
Ahmad Sadiq — Founder & Lead Engineer
Nex Desk Software Agency (nexdesk.agency)
`,
  },
  {
    id: "change_order",
    title: "Scope Change Order Form",
    category: "Contracts",
    badge: "Feature Addition",
    iconName: "PlusCircle",
    description:
      "Formal change order form for adding new features, extra revisions, or scope expansions outside original contract.",
    textContent: `============================================================
NEX DESK — SCOPE CHANGE ORDER FORM
============================================================

Change Order No: ND-CO-{{YEAR}}-01
Project: {{PROJECT_NAME}}
Client: {{CLIENT_NAME}} ({{CLIENT_COMPANY}})
Date: {{DATE}}

1. DESCRIPTION OF CHANGE
Additional feature requests submitted outside the original agreed contract scope:
- [Item 1]: Detailed description & acceptance criteria
- [Item 2]: Detailed description & acceptance criteria

2. FINANCIAL & TIMELINE IMPACT
- Additional Cost: {{CURRENCY}} {{ADDITIONAL_AMOUNT}}
- Additional Timeline: +{{EXTRA_DAYS}} working days added to target deadline.

3. PAYMENT TERMS
50% advance upon Change Order signature, 50% upon delivery of extra features.

SIGNATURES:

_______________________                   _______________________
Nex Desk Representative                   Client Approval
`,
  },
  {
    id: "proposal",
    title: "Standard Agency Quotation / Proposal",
    category: "Proposals",
    badge: "Sales Proposal",
    iconName: "Send",
    description:
      "Clean, high-converting agency proposal template detailing solution approach, tech stack, deliverables, pricing, and project timeline.",
    textContent: `============================================================
NEX DESK — PROJECT PROPOSAL & QUOTATION
============================================================

Prepared For: {{CLIENT_NAME}} / {{CLIENT_COMPANY}}
Project: {{PROJECT_NAME}}
Valid Until: {{DATE_VALID}}

1. EXECUTIVE SUMMARY
Nex Desk proposes a custom, high-performance software solution tailored to {{CLIENT_COMPANY}}'s business objectives.

2. PROPOSED SOLUTION & TECH STACK
- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Backend & DB: Supabase PostgreSQL, Node.js
- Deployment: Vercel Production Infrastructure

3. INVESTMENT & PRICING
Total Fixed Price: {{CURRENCY}} {{AMOUNT}}
Payment Schedule: 50% Advance to start, 50% upon final sign-off.

4. TIMELINE
Estimated Duration: 3–6 weeks from deposit date.

Nex Desk (hello@nexdesk.com) · nexdesk.agency
`,
  },
  {
    id: "client_intake",
    title: "Client Intake Questionnaire",
    category: "Onboarding",
    badge: "Intake Form",
    iconName: "ClipboardList",
    description:
      "Pre-project questionnaire sent to new clients to gather essential project details, brand assets, references, and technical requirements before work begins.",
    textContent: `============================================================
NEX DESK — CLIENT INTAKE QUESTIONNAIRE
============================================================

Date: {{DATE}}
Client: {{CLIENT_NAME}} / {{CLIENT_COMPANY}}
Project: {{PROJECT_NAME}}

Thank you for choosing Nex Desk. Please complete this short questionnaire so we can hit the ground running. It should take about 5 minutes.

------------------------------------------------------------
SECTION 1: PROJECT OVERVIEW
------------------------------------------------------------

1.1 Describe your project in 2-3 sentences:
[Your answer here]

1.2 What is the primary goal of this project?
(e.g., generate leads, sell products, replace existing system, build internal tool)
[Your answer here]

1.3 Who is the target audience / end user?
[Your answer here]

1.4 Do you have a deadline or launch date in mind?
[Your answer here]

------------------------------------------------------------
SECTION 2: BRAND & DESIGN
------------------------------------------------------------

2.1 Do you have existing brand guidelines? (logo files, colour palette, fonts)
[ ] Yes — I will share them   [ ] No — I need help with branding

2.2 Share 2-3 websites or apps whose design you admire:
1. [URL]
2. [URL]
3. [URL]

2.3 Any design styles or elements you specifically want to avoid?
[Your answer here]

------------------------------------------------------------
SECTION 3: CONTENT & ASSETS
------------------------------------------------------------

3.1 Do you have the content ready? (text, images, product data)
[ ] Yes, fully ready   [ ] Partially ready   [ ] Not yet — I need help

3.2 Will you need copywriting or content creation services?
[ ] Yes   [ ] No

3.3 Do you have professional photographs or product images?
[ ] Yes   [ ] No — I'll need stock or custom images

------------------------------------------------------------
SECTION 4: TECHNICAL REQUIREMENTS
------------------------------------------------------------

4.1 Do you have an existing website or app?
[ ] Yes — URL: [           ]   [ ] No — this is new

4.2 Do you already own a domain name?
[ ] Yes — Domain: [           ]   [ ] No — I need one

4.3 Do you have existing hosting?
[ ] Yes — Provider: [           ]   [ ] No

4.4 Any third-party integrations required?
(e.g., payment gateway, CRM, email marketing, booking system)
[Your answer here]

------------------------------------------------------------
SECTION 5: COMMUNICATION & APPROVALS
------------------------------------------------------------

5.1 Who is the primary point of contact for approvals?
Name: [           ]
Email: [           ]
Phone/WhatsApp: [           ]

5.2 Preferred communication channel:
[ ] Email   [ ] WhatsApp   [ ] Both

5.3 Any additional notes or special requirements:
[Your answer here]

------------------------------------------------------------

Please return this completed form to hello@nexdesk.com or share it via your Client Portal.

Nex Desk Software Agency
nexdesk.agency
`,
  },
  {
    id: "welcome_pack",
    title: "Client Welcome Pack",
    category: "Onboarding",
    badge: "Welcome Document",
    iconName: "Heart",
    description:
      "Professional welcome document sent to new clients outlining working relationship, communication guidelines, what to expect, and key policies.",
    textContent: `============================================================
NEX DESK — CLIENT WELCOME PACK
============================================================

Prepared for: {{CLIENT_NAME}} / {{CLIENT_COMPANY}}
Date: {{DATE}}

Welcome to Nex Desk. This document outlines everything you need to know about working with us. Keep it handy — it answers most questions before they come up.

------------------------------------------------------------
1. YOUR DEDICATED TEAM
------------------------------------------------------------

Your project is managed by a dedicated team at Nex Desk. You will have a single point of contact for all communication. You'll meet your assigned team in your Client Portal.

------------------------------------------------------------
2. COMMUNICATION
------------------------------------------------------------

Primary Channel: Email (hello@nexdesk.com)
Quick Questions: WhatsApp
Working Hours: Monday – Saturday, 10am – 7pm PKT
Response Time: All messages receive a reply within 1 working day

We are available across timezones for international clients. For urgent matters outside working hours, WhatsApp is the fastest way to reach us.

------------------------------------------------------------
3. WHAT HAPPENS NEXT
------------------------------------------------------------

Step 1: Complete your Client Intake Questionnaire (attached separately)
Step 2: We review your responses and prepare a detailed project outline
Step 3: You receive a staging link within the first week of development
Step 4: Weekly progress updates via email + live portal tracking
Step 5: Final delivery, handover documentation, and sign-off

------------------------------------------------------------
4. REVISIONS & FEEDBACK
------------------------------------------------------------

Your agreement includes 2 full rounds of revisions per deliverable.
Additional revision rounds are billed at the hourly rate specified in your contract.

Feedback Process:
- We send deliverables for your review via the Client Portal
- You provide consolidated feedback within 5 working days
- We implement revisions and re-submit for approval

Tip: Collecting all feedback into one round (rather than multiple small requests) keeps the project on track and within scope.

------------------------------------------------------------
5. PAYMENTS
------------------------------------------------------------

Standard Schedule: 50% deposit before work begins, 50% on final delivery.
Milestone Splits: Available for larger projects (specified in your agreement).
Payment Methods: Bank Transfer, Wise, Stripe, or agreed gateway.
Invoice Format: You will receive professional PDF invoices via email.

Late Payment: Invoices are due within the timeframe stated. A late payment fee may apply as outlined in your agreement. We believe transparency prevents issues — please communicate early if there's a delay.

------------------------------------------------------------
6. YOUR CLIENT PORTAL
------------------------------------------------------------

Your Client Portal (portal link provided separately) gives you:
- Real-time project progress and milestone tracking
- Invoice history and payment status
- Document library (agreements, receipts, reports)
- Assigned team members and contact information
- File upload for sharing brand assets and signed documents

We update the portal every 2-3 business days during active development.

------------------------------------------------------------
7. OWNERSHIP & CONFIDENTIALITY
------------------------------------------------------------

Code Ownership: Full ownership of all custom source code, design files, and assets transfers to you upon 100% payment completion.

Confidentiality: All project details, business information, and credentials are treated as strictly confidential under our mutual NDA.

------------------------------------------------------------

Questions? Reply to this email or message us on WhatsApp.
We're genuinely glad to have you as a client.

Ahmad Sadiq
Founder & Lead Engineer
Nex Desk Software Agency
nexdesk.agency
`,
  },
];

