import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

type ReviewPageProps = {
  params: Promise<{ slug: string }>;
};

// Ensure new requests fetch the latest published profile details.
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, logo_text, welcome_message")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (businessError) {
    throw new Error("Unable to load the review profile.");
  }

  if (!business) notFound();

  const { data: reviewLinks, error: linksError } = await supabase
    .from("review_links")
    .select("id, platform, url")
    .eq("business_id", business.id)
    .order("display_order", { ascending: true });

  if (linksError) {
    throw new Error("Unable to load review destinations.");
  }

  if (!reviewLinks?.length) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 px-2 text-xl font-bold text-blue-600">
          {business.logo_text || business.name.slice(0, 3)}
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          {business.name}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {business.welcome_message}
        </p>

        <div className="mt-8 space-y-3">
          {reviewLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col min-h-14 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-medium transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <span className="font-medium">Review us on {link.platform}</span>

              <span className="mt-1 text-xs text-slate-500">
                {new URL(link.url).hostname}
              </span>
            </a>
          ))}
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-600">
          We welcome all genuine feedback. Reviews are submitted directly
          through your chosen platform.
        </p>
      </section>
    </main>
  );
}
