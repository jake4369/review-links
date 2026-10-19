import Link from "next/link";

type OnboardingChecklistProps = {
  completedSteps: 0 | 1 | 2;
  embedded?: boolean;
};

const steps = [
  {
    title: "Create your business profile",
    description:
      "Add your business name and choose your permanent review page address.",
    action: "Create business profile",
    href: "/dashboard/create",
  },
  {
    title: "Add your review destinations",
    description: "Add the platforms where customers can leave you a review.",
    action: "Add review destinations",
    href: "/dashboard/edit",
  },
  {
    title: "Publish your review page",
    description: "Make your page available for customers to visit.",
    action: "Publish your review page",
    href: "/dashboard#publish-profile",
  },
] as const;

export default function OnboardingChecklist({
  completedSteps,
  embedded = false,
}: OnboardingChecklistProps) {
  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper
      className={
        embedded
          ? "text-slate-900"
          : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
      }
    >
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Getting started
            </span>
            <span className="text-sm font-medium text-slate-600">
              {completedSteps} of 3 complete
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome to ReviewBranch!
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            You&apos;re just three steps away from making it easier for
            customers to leave reviews.
          </p>

          <div
            role="progressbar"
            aria-label="Business setup progress"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={completedSteps}
            aria-valuetext={`${completedSteps} of 3 steps complete`}
            className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${(completedSteps / 3) * 100}%` }}
            />
          </div>

          <ol className="mt-7 divide-y divide-slate-100">
            {steps.map((step, index) => {
              const isComplete = index < completedSteps;
              const isCurrent = index === completedSteps;

              return (
                <li
                  key={step.title}
                  aria-current={isCurrent ? "step" : undefined}
                  className="flex gap-4 py-5"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isComplete
                        ? "bg-green-100 text-green-700"
                        : isCurrent
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900">
                      {step.title}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>

                    {isComplete && (
                      <p className="mt-2 text-sm font-medium text-green-700">
                        Complete
                      </p>
                    )}

                    {isCurrent && (
                      <Link
                        href={step.href}
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        {step.action}
                        <span aria-hidden="true" className="ml-2">
                          →
                        </span>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Wrapper>
  );
}
