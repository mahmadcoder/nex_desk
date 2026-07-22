export type AgencyTemplate = {
  id: string;
  title: string;
  category: "Agreements" | "Contracts" | "Letters" | "Proposals";
  description: string;
  badge: string;
  iconName: string;
  textContent: string;
};

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
];
