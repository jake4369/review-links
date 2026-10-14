const steps = [
  {
    number: "01",
    title: "Add your links",
    description: "Add the websites where customers can review your business.",
  },
  {
    number: "02",
    title: "Get your page",
    description: "Get a personalised review page, shareable link and QR code.",
  },
  {
    number: "03",
    title: "Share with customers",
    description:
      "Send your link by WhatsApp, text or email, or let customers scan your code.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6">
        {/* NAVIGATION */}
        <header className="flex items-centre justify-between py-6">
          <span className="text-xl font-bold tracking-tight">
            Review<span className="text-blue-600">Links</span>
          </span>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            How it works
          </a>
        </header>

        {/* HERO */}
        <section className="grid items-centre gap-12 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-5 text-sm font-semibold text-blue-600">
              SIMPLE REVIEW SHARING
            </p>

            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Make it easy for customers to leave a review.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-800">
              One personalised page for all your review links. Share it in
              seconds using a link or QR code. No complicated software required.
            </p>

            <a
              href="#how-it-works"
              className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              See how it works
            </a>
          </div>

          {/* Customer page preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10">
            <p className="mb-8 text-centre text-xs font-semibold tracking-widest text-slate-400">
              EXAMPLE REVIEW PAGE
            </p>

            <div className="mx-auto flex max-w-sm flex-col items-centre text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
                DevX
              </div>

              <h2 className="mt-5 text-xl font-bold">
                DevXDesign - Web Agency
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Thank you for choosing us! We&apos;d love to hear about your
                experience.
              </p>

              <div className="mt-8 w-full space-y-3">
                {["Google", "Trustpilot", "Facebook"].map((platform) => (
                  <div
                    key={platform}
                    className="rounded-xl border border-slate-200 p-4 font-medium"
                  >
                    Review us on {platform}
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-slate-400">
                Example only - links coming soon
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="border-t border-slate-200 py-20">
          <div className="mb-12 text-centre">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-slate-600">
              Three simple steps. That&apos;s all there is to it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-7"
              >
                <span className="text-sm font-bold text-blue-600">
                  {step.number}
                </span>

                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-centre text-sm text-slate-500">
          ReviewLinks - Making reviews easier.
        </footer>
      </div>
    </main>
  );
}
