/**
 * The pre-launch checklist.
 *
 * The exit-intent popup has always offered this and it has never existed —
 * "Show me the checklist" linked to the contact form. This is the thing it was
 * describing.
 *
 * Written to be useful to someone who will never hire us. Several items name
 * the trap rather than the task, because "test your forms" is advice and
 * "submit every form and confirm the email actually arrives" is a checklist.
 */

export type ChecklistGroup = {
  id: string;
  title: string;
  /** Why this group exists, in one line. */
  intro: string;
  items: string[];
};

export const LAUNCH_CHECKLIST: ChecklistGroup[] = [
  {
    id: "content",
    title: "The content is actually finished",
    intro: "The most common reason a launch slips is not code. It is a page nobody wrote.",
    items: [
      "Every page proofread by someone who did not write it",
      "No Lorem Ipsum, no “coming soon”, no placeholder images left anywhere",
      "Real photographs or licensed stock — with the licence saved somewhere you can find it",
      "Favicon set, and it looks right on a dark browser tab as well as a light one",
      "Social preview image set, and tested by pasting the link into WhatsApp",
      "Contact details, opening hours and prices all say the same thing on every page",
    ],
  },
  {
    id: "works",
    title: "It works — everywhere, for everyone",
    intro: "It works on the machine it was built on. That tells you almost nothing.",
    items: [
      "Checked on Chrome, Safari and Firefox — Safari on a real iPhone, not a simulator",
      "Checked on a small phone, not just a large one",
      "Every form submitted for real, and the submission confirmed to arrive where a human will see it",
      "Form validation tested with bad input, not just correct input",
      "A real 404 page that offers a way back, not a server default",
      "Every link clicked, including the ones in the footer nobody ever clicks",
      "Tested on a slow connection, not only on office wifi",
    ],
  },
  {
    id: "fast",
    title: "It is fast",
    intro: "Half your visitors leave a page that takes more than three seconds. They do not tell you.",
    items: [
      "Lighthouse run on the live site, not locally — 90+ on performance",
      "Images compressed and served at the size they display at",
      "Modern image formats (WebP or AVIF) with a fallback",
      "Fonts subset and preloaded, so text does not flash or shift",
      "Nothing render-blocking above the fold",
      "Tested on 4G, not on wifi",
    ],
  },
  {
    id: "found",
    title: "It can be found",
    intro: "A site nobody can find is an expensive brochure.",
    items: [
      "Every page has its own title and meta description, written not generated",
      "sitemap.xml generated and submitted to Google Search Console",
      "robots.txt correct — and confirm it is not still blocking everything from staging",
      "301 redirects from every old URL if this replaces an existing site",
      "Structured data for your organisation, and for anything you sell",
      "Canonical URLs set, so the same page does not compete with itself",
      "Analytics installed and firing — verified with a real visit, not assumed",
    ],
  },
  {
    id: "safe",
    title: "It is safe",
    intro: "Most of this is invisible until the day it is not.",
    items: [
      "HTTPS everywhere, with HTTP redirecting to it",
      "No API keys, passwords or tokens in the browser bundle — search the built JavaScript for them",
      "Admin areas behind a login, and the login rate-limited",
      "Dependencies updated, with no known critical vulnerabilities",
      "Automated backups running BEFORE launch day, and a restore actually tested once",
      "Error tracking installed, so you hear about failures from software rather than from a customer",
    ],
  },
  {
    id: "legal",
    title: "It is legal",
    intro: "Cheap to do now. Expensive to be asked about later.",
    items: [
      "Privacy policy naming every company that touches your visitors’ data",
      "Terms of service, if you sell anything",
      "Cookie consent that genuinely controls what loads — not a banner that does nothing",
      "A real business address and contact route, not a form alone",
      "Any licence you rely on — fonts, images, plugins — documented",
    ],
  },
  {
    id: "usable",
    title: "Anyone can use it",
    intro: "One visitor in five has something that makes a careless site hard to use.",
    items: [
      "Text contrast passes WCAG AA — checked with a tool, not with your eyes",
      "Every image has alt text that says what the image means",
      "The whole site navigable by keyboard alone",
      "Focus outlines visible, not removed for looking untidy",
      "Video captioned, and nothing auto-plays with sound",
      "It still works at 200% browser zoom",
    ],
  },
  {
    id: "dns",
    title: "The switch does not break your email",
    intro:
      "The one that bites hardest and gets forgotten most. Pointing a domain at a new site can take mail down with it.",
    items: [
      "MX records written down BEFORE any DNS change, and left untouched by it",
      "SPF, DKIM and DMARC records preserved",
      "Send and receive a real email after the cutover — from an outside address",
      "TTL lowered a day ahead so a mistake can be undone in minutes, not days",
      "www and non-www both resolve, one redirecting to the other",
      "SSL certificate valid on both, and auto-renewing",
    ],
  },
  {
    id: "own",
    title: "You actually own it",
    intro:
      "Ask these before the final payment, not after. This is the single most common way a business ends up hostage to an agency.",
    items: [
      "The domain is registered in your name — check the registrar account, do not take anyone’s word",
      "You have the registrar login, not just the agency",
      "Hosting and database accounts are in your name, with your billing card",
      "Repository access transferred, with you as owner rather than collaborator",
      "Every credential handed over in writing",
      "Written confirmation that copyright in the code and designs is yours",
      "Documentation for anything you are expected to update yourself",
    ],
  },
  {
    id: "after",
    title: "Someone is watching after launch",
    intro: "Launch day is the start of the thing working, not the end of the project.",
    items: [
      "Uptime monitoring with alerts going to a person who will act on them",
      "It is clear who fixes a bug at 9pm, and whether that costs anything",
      "A support period agreed in writing, with an end date you both know",
      "Someone named as responsible for updates and security patches",
      "A plan for what happens when the person who built it is unavailable",
    ],
  },
];

export const CHECKLIST_COUNT = LAUNCH_CHECKLIST.reduce((n, g) => n + g.items.length, 0);
