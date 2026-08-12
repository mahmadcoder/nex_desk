import { createAdminClient } from "@/lib/supabase/server";

export type HolidayItem = {
  id?: string;
  holiday_on: string;
  name: string;
};

/**
 * Fetch upcoming holidays from the database for notice calculation.
 */
export async function getUpcomingHolidays(daysAhead = 30): Promise<HolidayItem[]> {
  try {
    const todayISO = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + daysAhead * 864e5).toISOString().split("T")[0];

    const { data, error } = await createAdminClient()
      .from("holidays")
      .select("id, holiday_on, name")
      .gte("holiday_on", todayISO)
      .lte("holiday_on", futureDate)
      .order("holiday_on", { ascending: true });

    if (error) {
      if (error.code !== "42P01") console.error("getUpcomingHolidays failed:", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("getUpcomingHolidays error:", e);
    return [];
  }
}
