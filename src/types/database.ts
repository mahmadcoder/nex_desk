export type Database = any;

export type UserRole = "owner" | "admin" | "staff" | "client";
export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";
export type DealStatus = "draft" | "sent" | "locked" | "cancelled";
export type ProjectStatus =
  | "not_started" | "in_progress" | "review"
  | "on_hold" | "delivered" | "completed" | "cancelled";
export type InvoiceStatus =
  | "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
export type DocType =
  | "quotation" | "agreement" | "invoice" | "receipt"
  | "change_order" | "progress_report" | "handover";
