"use client";

import { useActionState, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import type { Business } from "@/lib/businesses";
import {
  saveBusinessProfile,
  type SaveProfileState,
} from "@/app/dashboard/edit/actions";
import {
  REVIEW_DESTINATIONS,
  reviewDestinationError,
  type ReviewField,
} from "@/lib/review-destination-validation";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";

type ProfileEditorProps = {
  businessId: string;
  business: Business;
};

const initialState: SaveProfileState = { error: "", success: "" };

type ReviewInputs = Record<ReviewField, string>;
type TouchedFields = Record<ReviewField, boolean>;

export default function ProfileEditor({
  businessId,
  business,
}: ProfileEditorProps) {
  const saveAction = saveBusinessProfile.bind(null, businessId);
  const [state, formAction, pending] = useActionState(saveAction, initialState);
  const [invitationMessage, setInvitationMessage] = useState(
    business.invitationMessage,
  );

  const [reviewUrls, setReviewUrls] = useState<ReviewInputs>(() => ({
    google: business.reviewLinks.find((link) => link.platform === "Google")?.url ?? "",
    trustpilot: business.reviewLinks.find((link) => link.platform === "Trustpilot")?.url ?? "",
    facebook: business.reviewLinks.find((link) => link.platform === "Facebook")?.url ?? "",
  }));
  const [touched, setTouched] = useState<TouchedFields>({
    google: false,
    trustpilot: false,
    facebook: false,
  });
  const [attemptedSave, setAttemptedSave] = useState(false);

  const shareUrl = useReviewPageUrl(business.slug);
  const fullMessage = [
    invitationMessage.trim(),
    ...(shareUrl ? [`You can leave your feedback here: ${shareUrl}`] : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  const inputClass =
    "mt-2 w-full rounded-xl border p-3 text-sm outline-none focus:border-blue-500";

  function fieldError(field: ReviewField, platform: string): string | null {
    const input = reviewUrls[field];
    const localError =
      touched[field] || attemptedSave
        ? reviewDestinationError(platform, input)
        : null;

    // Do not keep showing an outdated server error after the user changes it.
    const serverError =
      state.submittedValues?.[field] === input.trim()
        ? state.fieldErrors?.[field]
        : undefined;

    return localError || serverError || null;
  }

  const hasInvalidLinks = REVIEW_DESTINATIONS.some(
    (destination) => Boolean(fieldError(destination.field, destination.name)),
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    setAttemptedSave(true);
    const firstInvalid = REVIEW_DESTINATIONS.find((destination) =>
      Boolean(reviewDestinationError(destination.name, reviewUrls[destination.field])),
    );

    if (firstInvalid) {
      event.preventDefault();
      event.currentTarget
        .querySelector<HTMLInputElement>(`input[name="${firstInvalid.field}"]`)
        ?.focus();
    }
  }

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

        <form action={formAction} onSubmit={handleSubmit} className="mt-8 space-y-6">
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
                className={`${inputClass} border-slate-200 bg-white`}
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
                className={`${inputClass} border-slate-200 bg-white`}
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
                className={`${inputClass} border-slate-200 bg-white`}
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

            {hasInvalidLinks && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                Please correct the highlighted review destinations before saving.
              </p>
            )}

            <div className="mt-6 space-y-5">
              {REVIEW_DESTINATIONS.map((destination) => {
                const error = fieldError(destination.field, destination.name);
                return (
                  <div key={destination.field}>
                    <label
                      htmlFor={destination.field}
                      className="text-sm font-medium"
                    >
                      {destination.name}
                    </label>
                    <input
                      id={destination.field}
                      name={destination.field}
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={2048}
                      placeholder={`Paste your ${destination.name} review URL`}
                      value={reviewUrls[destination.field]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setReviewUrls((previous) => ({
                          ...previous,
                          [destination.field]: value,
                        }));
                      }}
                      onBlur={() =>
                        setTouched((previous) => ({
                          ...previous,
                          [destination.field]: true,
                        }))
                      }
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${destination.field}-error` : undefined}
                      className={`${inputClass} ${
                        error
                          ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-100"
                          : "border-slate-200 bg-white"
                      }`}
                    />
                    {error && (
                      <p
                        id={`${destination.field}-error`}
                        role="alert"
                        className="mt-2 text-sm text-red-700"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* REVIEW INVITATION */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Invitation</h2>
            <p className="mt-2 text-sm text-slate-500">
              Customise the message used when sharing your review page with customers.
            </p>
            <div className="mt-6">
              <label htmlFor="invitation-message" className="text-sm font-medium">
                Your invitation message
              </label>
              <textarea
                id="invitation-message"
                name="invitationMessage"
                rows={4}
                maxLength={500}
                value={invitationMessage}
                onChange={(event) => setInvitationMessage(event.target.value)}
                className={`${inputClass} border-slate-200 bg-white`}
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

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>

          {state.error &&
            (!state.fieldErrors ||
              Object.keys(state.fieldErrors).some((field) =>
                state.submittedValues?.[field as ReviewField] === reviewUrls[field as ReviewField].trim(),
              )) && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                {state.error}
              </p>
            )}
          {state.success && (
            <p role="status" className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">
              {state.success}
            </p>
          )}
          <p className="text-center text-xs text-slate-500">
            Changes are saved to your business account. Published profiles
            reflect saved changes when visitors reload the public page.
          </p>
        </form>
      </div>
    </main>
  );
}
