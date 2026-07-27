export type AgencyTemplate = {
  id: string;
  title: string;
  category: "Agreements" | "Contracts" | "Letters" | "Proposals";
  description: string;
  badge: string;
  iconName: string;
  textContent: string;
};
