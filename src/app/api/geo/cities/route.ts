import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { country } = await req.json();
    if (!country) {
      return NextResponse.json({ error: "Country parameter missing" }, { status: 400 });
    }

    const res = await fetch("https://countriesnow.space/api/v0.1/countries/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      return NextResponse.json({ cities: [] });
    }

    const data = await res.json();
    const cities = data?.data || [];
    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }
}
