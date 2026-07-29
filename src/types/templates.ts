export type AgencyTemplate = {
  id: string;
  title: string;
  category: "Agreements" | "Contracts" | "Letters" | "Proposals" | "Onboarding";
  description: string;
  badge: string;
  iconName: string;
  textContent: string;
};
