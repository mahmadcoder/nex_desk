/**
 * Whether a staff member can sign in.
 *
 * Kept out of `actions/staff.ts` because that file is `"use server"` — every
 * export there must be an async function, so a const array cannot live in it.
 *
 * The stored strings are load-bearing: `employees_status_check` (2027-16)
 * constrains the column to exactly these, and `getCurrentStaff` refuses a
 * session whose employee row is `Terminated` by exact string match. The UI
 * labels them by what they do, but the values never change.
 */
export const EMPLOYEE_STATUSES = ["Active", "On Leave", "Terminated"] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const isEmployeeStatus = (v: unknown): v is EmployeeStatus =>
  (EMPLOYEE_STATUSES as readonly string[]).includes(String(v));
