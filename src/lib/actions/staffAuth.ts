"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface StaffLoginGreeting {
  found: boolean;
  name?: string;
  firstName?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string | null;
  email?: string;
  isActive?: boolean;
}

/**
 * Safely looks up a staff member's public presentation details (name, job title, avatar)
 * for the login greeting card.
 *
 * Designed to work across any browser, incognito session, or mobile device when a staff
 * member clicks their personalized link or types their email.
 *
 * Never returns passwords, salaries, bank details, or internal admin data.
 */
export async function getStaffLoginGreeting(emailOrQuery: string): Promise<StaffLoginGreeting> {
  if (!emailOrQuery || typeof emailOrQuery !== "string") {
    return { found: false };
  }

  const clean = emailOrQuery.trim().toLowerCase();
  if (!clean || !clean.includes("@")) {
    return { found: false };
  }

  try {
    const db = createAdminClient();

    // 1. Look up in employees table
    const { data: employee } = await db
      .from("employees")
      .select("id, full_name, email, job_title, department, avatar_url, status, user_id")
      .ilike("email", clean)
      .maybeSingle();

    if (employee) {
      const fullName = employee.full_name?.trim() || "Team Member";
      const firstName = fullName.split(/\s+/)[0] || fullName;

      return {
        found: true,
        name: fullName,
        firstName,
        jobTitle: employee.job_title || "Staff Specialist",
        department: employee.department || undefined,
        avatarUrl: employee.avatar_url || null,
        email: employee.email || clean,
        isActive: employee.status !== "terminated" && employee.status !== "inactive",
      };
    }

    // 2. Fallback: Look up in profiles where role is staff
    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name, email, role, is_active, avatar_url")
      .ilike("email", clean)
      .maybeSingle();

    if (profile && profile.role === "staff") {
      const fullName = profile.full_name?.trim() || "Team Member";
      const firstName = fullName.split(/\s+/)[0] || fullName;

      return {
        found: true,
        name: fullName,
        firstName,
        jobTitle: "Staff Member",
        avatarUrl: profile.avatar_url || null,
        email: profile.email || clean,
        isActive: profile.is_active !== false,
      };
    }

    return { found: false };
  } catch (err) {
    console.error("Error retrieving staff login greeting:", err);
    return { found: false };
  }
}
