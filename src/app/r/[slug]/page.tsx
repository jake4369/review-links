import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Read current data for public review pages.
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  // Only retrieve published profiles.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_text, welcome_message")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (businessError) {
    throw new Error("Unable to load review profile.");
  }

  if (!business) {
    notFound();
  }

  // Retrieve the business's review links.
  const { data: reviewLinks, error: linksError } = await supabase
    .from("review_links")
    .select("id, platform, url")
    .eq("business_id", business.id)
    .order("display_order", {
      ascending: true,
    });

  if (linksError) {
    throw new Error("Unable to load review destinations.");
  }

  // Don't show a review page with no destinations.
  if (!reviewLinks || reviewLinks.length === 0) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        {/* BUSINESS BRANDING */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 px-2 text-xl font-bold text-blue-600">
          {business.logo_text || business.name.slice(0, 3)}
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          {business.name}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {business.welcome_message}
        </p>

        {/* REVIEW DESTINATIONS */}
        <div className="mt-8 space-y-3">
          {reviewLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-medium transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              Review us on {link.platform}
            </a>
          ))}
        </div>

        {/* FOOTER */}
        <p className="mt-8 text-xs leading-5 text-slate-400">
          We welcome all genuine feedback. Reviews are submitted directly
          through your chosen platform.
        </p>
      </section>
    </main>
  );
}
