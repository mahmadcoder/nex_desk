import { ogCard, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Nex Desk — software agency";

export default async function Image() {
  return ogCard({
    title: "Websites, apps and growth systems that ship.",
    eyebrow: "Nex Desk",
    footnote: "nexdesk",
  });
}
