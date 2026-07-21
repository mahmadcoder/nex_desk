import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="mono-tag">error 404</p>
        <h1 className="mt-4 text-[clamp(3rem,12vw,7rem)]">Nothing here</h1>
        <p className="mx-auto mt-4 max-w-sm text-bone-400">
          This page doesn&apos;t exist. Check the address, or head back.
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Back to home
        </Link>
      </div>
    </main>
  );
}
