"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import type { Business } from "@/lib/businesses";
import {
  saveBusinessProfile,
  type SaveProfileState,
} from "@/app/dashboard/edit/actions";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";

type ProfileEditorProps = {
  businessId: string;
  business: Business;
};

const initialState: SaveProfileState = {
  error: "",
  success: "",
};

const platforms = [
  { name: "Google", field: "google" },
  { name: "Trustpilot", field: "trustpilot" },
  { name: "Facebook", field: "facebook" },
] as const;

export default function ProfileEditor({
  businessId,
  business,
}: ProfileEditorProps) {
  // Connect this form to our server action.
  const saveAction = saveBusinessProfile.bind(null, businessId);

  const [state, formAction, pending] = useActionState(saveAction, initialState);

  // Keep the invitation preview responsive.
  const [invitationMessage, setInvitationMessage] = useState(
    business.invitationMessage,
  );

  // Generate the permanent review page URL.
  const shareUrl = useReviewPageUrl(business.slug);

  const fullMessage = [
    invitationMessage.trim(),
    ...(shareUrl ? [`You can leave your feedback here: ${shareUrl}`] : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 " +
    "bg-white p-3 text-sm outline-none " +
    "focus:border-blue-500";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Edit Business Profile</h1>

        <p className="mt-2 text-slate-600">
          Manage your business details and review links.
        </p>

        <form action={formAction} className="mt-8 space-y-6">
          {/* BUSINESS DETAILS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Business Details</h2>

            <div className="mt-6">
              <label htmlFor="business-name" className="text-sm font-medium">
                Business name
              </label>

              <input
                id="business-name"
                name="name"
                type="text"
                required
                maxLength={120}
                defaultValue={business.name}
                className={inputClass}
              />
            </div>

            <div className="mt-5">
              <label htmlFor="logo-text" className="text-sm font-medium">
                Logo text
              </label>

              <input
                id="logo-text"
                name="logoText"
                type="text"
                maxLength={12}
                defaultValue={business.logoText}
                className={inputClass}
              />

              <p className="mt-2 text-xs text-slate-500">
                We&apos;ll add image uploads later.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="welcome-message" className="text-sm font-medium">
                Welcome message
              </label>

              <textarea
                id="welcome-message"
                name="message"
                rows={4}
                maxLength={500}
                defaultValue={business.message}
                className={inputClass}
              />

              <p className="mt-2 text-xs text-slate-500">
                Displayed on your public review page.
              </p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium">Your public review address</p>

              <p className="mt-2 break-all rounded-xl bg-slate-50 p-3 text-sm text-blue-600">
                {shareUrl || `/r/${business.slug}`}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Your address stays the same when you update your business name.
              </p>
            </div>
          </section>

          {/* REVIEW DESTINATIONS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Destinations</h2>

            <p className="mt-2 text-sm text-slate-500">
              Enter the links where customers can leave reviews. Leave a field
              empty to remove that destination.
            </p>

            <div className="mt-6 space-y-5">
              {platforms.map((platform) => {
                const savedLink = business.reviewLinks.find(
                  (link) => link.platform === platform.name,
                );

                return (
                  <div key={platform.name}>
                    <label
                      htmlFor={platform.field}
                      className="text-sm font-medium"
                    >
                      {platform.name}
                    </label>

                    <input
                      id={platform.field}
                      name={platform.field}
                      type="url"
                      maxLength={2048}
                      placeholder={`Paste your ${platform.name} review URL`}
                      defaultValue={savedLink?.url ?? ""}
                      className={inputClass}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* REVIEW INVITATION */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Invitation</h2>

            <p className="mt-2 text-sm text-slate-500">
              Customise the message used when sharing your review page with
              customers.
            </p>

            <div className="mt-6">
              <label
                htmlFor="invitation-message"
                className="text-sm font-medium"
              >
                Your invitation message
              </label>

              <textarea
                id="invitation-message"
                name="invitationMessage"
                rows={4}
                maxLength={500}
                value={invitationMessage}
                onChange={(event) => setInvitationMessage(event.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">
                AUTOMATIC REVIEW LINK — NOT EDITABLE
              </p>

              <p className="mt-3 text-sm text-slate-700">
                You can leave your feedback here:
              </p>

              <p className="mt-1 break-all text-sm text-blue-600">
                {shareUrl || `/r/${business.slug}`}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold">Full message preview</p>

              <div className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6">
                {fullMessage}
              </div>
            </div>
          </section>

          {/* SAVE CHANGES */}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>

          {state.error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700"
            >
              {state.error}
            </p>
          )}

          {state.success && (
            <p
              role="status"
              className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-800"
            >
              {state.success}
            </p>
          )}

          <p className="text-center text-xs text-slate-500">
            Changes are saved to your business account. Your public review page
            will be connected in the next stage.
          </p>
        </form>
      </div>
    </main>
  );
}
