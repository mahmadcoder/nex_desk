import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/admin/ui";
import DealForm from "@/components/admin/DealForm";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function NewDeal() {
  const db = createAdminClient();
  const [{ data: clients }, { data: services }, { data: settings }] = await Promise.all([
    db.from("clients").select("id,name,email,company").eq("is_active", true).order("name"),
    db.from("services").select("slug,title,starting_at").eq("is_active", true).order("sort_order"),
    db.from("settings").select("default_terms, tax_percent").eq("id", 1).single(),
  ]);

  if (!clients?.length) {
    return (
      <>
        <PageHead title="Lock a deal" />
        <div className="card p-16 text-center">
          <h2 className="text-xl">Add a client first</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-bone-400">
            A deal needs someone to belong to. Create the client record, then come back.
          </p>
          <Link href={`${BASE}/clients`} className="btn btn-primary mt-6">Go to clients</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Lock a deal"
        sub="Everything below goes into the agreement PDF the client receives."
      />
      <DealForm
        clients={clients}
        services={services ?? []}
        defaultTerms={settings?.default_terms ?? ""}
        taxDefault={Number(settings?.tax_percent ?? 0)}
      />
    </>
  );
}
