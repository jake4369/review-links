"use client";

import { useActionState } from "react";
import { createBusiness } from "@/app/(site)/dashboard/create/actions";

const initialState = {
  error: "",
};

export default function CreateBusinessForm() {
  const [state, formAction, pending] = useActionState(
    createBusiness,
    initialState,
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Set up your business
          </h1>

          <p className="mt-3 text-slate-600">
            Let&apos;s create your review profile. It only takes a moment.
          </p>
        </header>

        <form
          action={formAction}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-semibold">
              Business name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. DevXDesign"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              This is the name customers will see.
            </p>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-semibold">
              Your review page address
            </label>

            <input
              id="slug"
              name="slug"
              type="text"
              required
              minLength={3}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="e.g. devxdesign"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Your link will look like:
            </p>

            <p className="mt-1 break-all text-sm font-medium text-blue-600">
              reviewlinks.com/r/your-business
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Use lowercase letters, numbers and hyphens. This address must be
              unique.
            </p>
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Creating business..." : "Create Business"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          You can customise your profile and review destinations afterwards.
        </p>
      </div>
    </main>
  );
}
