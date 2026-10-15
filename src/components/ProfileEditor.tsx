"use client";

import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import {
  saveBusinessProfile,
  type DestinationFieldErrors,
  type SaveProfileState,
} from "@/app/dashboard/edit/actions";
import { reviewDestinationError } from "@/lib/review-destination-validation";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";

type BusinessDetails = {
  name: string;
  slug: string;
  logoText: string;
  message: string;
  invitationMessage: string;
};

type SavedDestination = { id: string; platform: string; url: string };
type EditableDestination = {
  clientKey: string;
  id?: string;
  platform: string;
  url: string;
};
type InputName = "platform" | "url";

const MAX_DESTINATIONS = 10;
const inputClass = "mt-2 w-full rounded-xl border p-3 text-sm outline-none focus:border-blue-500";

function initialRows(destinations: SavedDestination[]): EditableDestination[] {
  return destinations.map((row) => ({
    clientKey: `saved-${row.id}`,
    id: row.id,
    platform: row.platform,
    url: row.url,
  }));
}

function validateRow(
  row: EditableDestination,
  rows: EditableDestination[],
): DestinationFieldErrors {
  const errors: DestinationFieldErrors = {};
  const name = row.platform.trim();
  const url = row.url.trim();

  if (!name || name.length > 40) {
    errors.platform = "Enter a destination name (1–40 characters).";
  } else if (
    rows.some(
      (other) =>
        other.clientKey !== row.clientKey &&
        other.platform.trim().toLocaleLowerCase("en") === name.toLocaleLowerCase("en"),
    )
  ) {
    // The original unique-platform index remains until the next cutover.
    errors.platform = "Use a different name for each destination, such as Google — Birmingham.";
  }

  if (!url) {
    errors.url = "Enter a review URL or remove this destination.";
  } else {
    const error = reviewDestinationError(name, url);
    if (error) errors.url = error;
  }

  return errors;
}

export default function ProfileEditor({
  businessId,
  business,
  destinations,
}: {
  businessId: string;
  business: BusinessDetails;
  destinations: SavedDestination[];
}) {
  const [rows, setRows] = useState<EditableDestination[]>(() => initialRows(destinations));
  const [invitationMessage, setInvitationMessage] = useState(business.invitationMessage);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [response, setResponse] = useState<SaveProfileState>({ error: "", success: "" });
  const [pending, startTransition] = useTransition();

  const shareUrl = useReviewPageUrl(business.slug);
  const fullMessage = [
    invitationMessage.trim(),
    ...(shareUrl ? [`You can leave your feedback here: ${shareUrl}`] : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  function currentPayload() {
    return JSON.stringify(
      rows.map(({ clientKey, id, platform, url }) => ({
        clientKey,
        ...(id ? { id } : {}),
        platform,
        url,
      })),
    );
  }

  function errorFor(row: EditableDestination, field: InputName): string | undefined {
    const localErrors = validateRow(row, rows);
    const shouldShow = attemptedSave || touched[`${row.clientKey}-${field}`];
    const localError = shouldShow ? localErrors[field] : undefined;
    // Ignore returned validation errors when the form has since been edited.
    const serverError = response.submittedPayload === currentPayload()
      ? response.fieldErrors?.[row.clientKey]?.[field]
      : undefined;
    return localError || serverError;
  }

  const anyVisibleErrors = rows.some(
    (row) => Boolean(errorFor(row, "platform") || errorFor(row, "url")),
  );

  function addDestination() {
    if (rows.length >= MAX_DESTINATIONS || pending) return;
    const key = `new-${crypto.randomUUID()}`;
    setRows((previous) => [...previous, { clientKey: key, platform: "", url: "" }]);
    setResponse({ error: "", success: "" });
  }

  function removeDestination(clientKey: string) {
    if (pending) return;
    setRows((previous) => previous.filter((row) => row.clientKey !== clientKey));
    setResponse({ error: "", success: "" });
  }

  function updateDestination(clientKey: string, field: InputName, value: string) {
    setRows((previous) =>
      previous.map((row) => row.clientKey === clientKey ? { ...row, [field]: value } : row),
    );
    setResponse({ error: "", success: "" });
  }

  function markTouched(clientKey: string, field: InputName) {
    setTouched((previous) => ({ ...previous, [`${clientKey}-${field}`]: true }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setAttemptedSave(true);
    setResponse({ error: "", success: "" });

    const invalidRow = rows.find((row) => {
      const validation = validateRow(row, rows);
      return Boolean(validation.platform || validation.url);
    });

    if (invalidRow) {
      const invalidField: InputName = validateRow(invalidRow, rows).platform ? "platform" : "url";
      document.getElementById(`${invalidRow.clientKey}-${invalidField}`)?.focus();
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("destinations", currentPayload());

    startTransition(async () => {
      try {
        const result = await saveBusinessProfile(businessId, formData);
        setResponse(result);
        if (result.success && result.savedDestinations) {
          // Store new database-assigned IDs immediately, including for newly
          // created links, so a second save updates rather than recreates them.
          setRows(initialRows(result.savedDestinations));
          setTouched({});
          setAttemptedSave(false);
        }
      } catch (error) {
        console.error("Profile save request failed:", error);
        setResponse({ error: "Your changes couldn't be confirmed. Check the connection, then reload before retrying.", success: "" });
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Edit Business Profile</h1>
        <p className="mt-2 text-slate-600">Manage your business details and review destinations.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Business Details</h2>
            <div className="mt-6">
              <label htmlFor="business-name" className="text-sm font-medium">Business name</label>
              <input id="business-name" name="name" type="text" required maxLength={120}
                defaultValue={business.name} className={`${inputClass} border-slate-200 bg-white`} />
            </div>
            <div className="mt-5">
              <label htmlFor="logo-text" className="text-sm font-medium">Logo text</label>
              <input id="logo-text" name="logoText" type="text" maxLength={12}
                defaultValue={business.logoText} className={`${inputClass} border-slate-200 bg-white`} />
              <p className="mt-2 text-xs text-slate-600">We&apos;ll add image uploads later.</p>
            </div>
            <div className="mt-5">
              <label htmlFor="welcome-message" className="text-sm font-medium">Welcome message</label>
              <textarea id="welcome-message" name="message" rows={4} maxLength={500}
                defaultValue={business.message} className={`${inputClass} border-slate-200 bg-white`} />
            </div>
            <div className="mt-5">
              <p className="text-sm font-medium">Your public review address</p>
              <p className="mt-2 break-all rounded-xl bg-slate-50 p-3 text-sm text-blue-700">
                {shareUrl || `/r/${business.slug}`}
              </p>
              <p className="mt-2 text-xs text-slate-600">Your address stays the same when you update your business name.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Destinations</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add whichever review websites your business uses. Up to {MAX_DESTINATIONS} destinations.
              Changes take effect when you save.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Suggestions: Google, Trustpilot, Facebook, Checkatrade, Tripadvisor, Feefo, Reviews.io.
              You can type another platform name instead.
            </p>
            <datalist id="reviewlinks-platform-suggestions">
              {['Google', 'Trustpilot', 'Facebook', 'Checkatrade', 'Tripadvisor', 'Feefo', 'Reviews.io', 'Yelp']
                .map((name) => <option key={name} value={name} />)}
            </datalist>

            {anyVisibleErrors && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                Correct the highlighted destinations before saving.
              </p>
            )}

            <div className="mt-5 space-y-4">
              {rows.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">
                  No review destinations yet. Add one to get started.
                </p>
              )}

              {rows.map((row, index) => {
                const platformError = errorFor(row, "platform");
                const urlError = errorFor(row, "url");
                return (
                  <div key={row.clientKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-sm">Destination {index + 1}</h3>
                      <button type="button" disabled={pending} onClick={() => removeDestination(row.clientKey)}
                        aria-label={`Remove destination ${index + 1}${row.platform ? `: ${row.platform}` : ''}`}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50">
                        Remove
                      </button>
                    </div>

                    <div className="mt-4">
                      <label htmlFor={`${row.clientKey}-platform`} className="text-sm font-medium">Platform name</label>
                      <input id={`${row.clientKey}-platform`} type="text" list="reviewlinks-platform-suggestions"
                        maxLength={40} value={row.platform}
                        onChange={(event) => updateDestination(row.clientKey, "platform", event.target.value)}
                        onBlur={() => markTouched(row.clientKey, "platform")}
                        placeholder="e.g. Checkatrade" aria-invalid={Boolean(platformError)}
                        aria-describedby={platformError ? `${row.clientKey}-platform-error` : undefined}
                        className={`${inputClass} ${platformError ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white'}`} />
                      {platformError && <p role="alert" id={`${row.clientKey}-platform-error`} className="mt-2 text-sm text-red-700">{platformError}</p>}
                    </div>

                    <div className="mt-4">
                      <label htmlFor={`${row.clientKey}-url`} className="text-sm font-medium">Review URL</label>
                      <input id={`${row.clientKey}-url`} type="text" inputMode="url" maxLength={2048}
                        spellCheck={false} autoCapitalize="none" autoComplete="url" value={row.url}
                        onChange={(event) => updateDestination(row.clientKey, "url", event.target.value)}
                        onBlur={() => markTouched(row.clientKey, "url")}
                        placeholder="https://..." aria-invalid={Boolean(urlError)}
                        aria-describedby={urlError ? `${row.clientKey}-url-error` : undefined}
                        className={`${inputClass} ${urlError ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white'}`} />
                      {urlError && <p role="alert" id={`${row.clientKey}-url-error`} className="mt-2 text-sm text-red-700">{urlError}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addDestination}
              disabled={pending || rows.length >= MAX_DESTINATIONS}
              className="mt-5 w-full rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
              + Add Review Destination
            </button>
            <p className="mt-2 text-xs text-slate-600">{rows.length} of {MAX_DESTINATIONS} destinations. Each name must currently be distinct.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Invitation</h2>
            <p className="mt-2 text-sm text-slate-600">Your review page URL is always added automatically.</p>
            <div className="mt-6">
              <label htmlFor="invitation-message" className="text-sm font-medium">Your invitation message</label>
              <textarea id="invitation-message" name="invitationMessage" rows={4} maxLength={500}
                value={invitationMessage} onChange={(e) => setInvitationMessage(e.target.value)}
                className={`${inputClass} border-slate-200 bg-white`} />
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">AUTOMATIC REVIEW LINK — NOT EDITABLE</p>
              <p className="mt-3 text-sm text-slate-700">You can leave your feedback here:</p>
              <p className="mt-1 break-all text-sm text-blue-700">{shareUrl || `/r/${business.slug}`}</p>
            </div>
            <p className="mt-6 text-sm font-semibold">Full message preview</p>
            <div className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6">
              {fullMessage}
            </div>
          </section>

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {pending ? "Saving..." : "Save Changes"}
          </button>

          {response.error && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">{response.error}</p>
          )}
          {response.success && (
            <p role="status" className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">{response.success}</p>
          )}
        </form>
      </div>
    </main>
  );
}
