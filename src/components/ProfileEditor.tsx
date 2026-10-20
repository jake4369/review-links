"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import {
  saveBusinessProfile,
  type DestinationFieldErrors,
  type SaveProfileState,
} from "@/app/(site)/dashboard/edit/actions";
import { reviewDestinationError } from "@/lib/review-destination-validation";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";
import { useNavigationGuard } from "@/components/NavigationGuardProvider";

type BusinessDetails = {
  name: string;
  slug: string;
  logoText: string;
  message: string;
  invitationMessage: string;
  isPublished: boolean;
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
const BUSINESS_NAME_ERROR = "Business name must be 1–120 characters.";
const inputClass =
  "mt-2 w-full rounded-xl border p-3 text-sm outline-none focus:border-blue-500";

function validateBusinessName(value: string): string {
  const name = value.trim();
  return !name || name.length > 120 ? BUSINESS_NAME_ERROR : "";
}

function initialRows(destinations: SavedDestination[]): EditableDestination[] {
  return destinations.map((row) => ({
    clientKey: `saved-${row.id}`,
    id: row.id,
    platform: row.platform,
    url: row.url,
  }));
}

function validateRow(row: EditableDestination): DestinationFieldErrors {
  const errors: DestinationFieldErrors = {};
  const name = row.platform.trim();
  const url = row.url.trim();

  if (!name || name.length > 40) {
    errors.platform = "Enter a destination name (1–40 characters).";
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
  const { registerGuard } = useNavigationGuard();
  const [rows, setRows] = useState<EditableDestination[]>(() =>
    initialRows(destinations),
  );
  const [invitationMessage, setInvitationMessage] = useState(
    business.invitationMessage,
  );
  const [businessNameError, setBusinessNameError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [response, setResponse] = useState<SaveProfileState>({
    error: "",
    success: "",
  });
  const [pending, startTransition] = useTransition();
  const [confirmationKey, setConfirmationKey] = useState<string | null>(null);
  const [removedSavedIds, setRemovedSavedIds] = useState<string[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [noticeVersion, setNoticeVersion] = useState(0);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [isPublished, setIsPublished] = useState(business.isPublished);
  // Confirmation covers only an explicit removal of the last row from a
  // published profile; adding a replacement row cancels the unpublish intent.
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [orderingAnnouncement, setOrderingAnnouncement] = useState("");

  const canLeaveEditor = useCallback(() => {
    if (pending) return false;
    return (
      !hasUnsavedChanges ||
      window.confirm(
        "You have unsaved changes. Leave this page without saving them?",
      )
    );
  }, [pending, hasUnsavedChanges]);

  // Keep the header guard aligned with committed edits before another click.
  // Cleanup also releases it when the editor is no longer active.
  useLayoutEffect(
    () => registerGuard(canLeaveEditor),
    [registerGuard, canLeaveEditor],
  );

  // Short confirmations disappear automatically; errors remain until
  // corrected or dismissed. Pending deletions and ordering stay visible in
  // the inline unsaved-changes notice until a successful save or reload.
  useEffect(() => {
    if (response.error || (!response.success && !infoMessage)) return;
    const timeout = window.setTimeout(() => setNoticeDismissed(true), 6000);
    return () => window.clearTimeout(timeout);
  }, [response.error, response.success, infoMessage, noticeVersion]);

  // Warn when closing or refreshing the tab while edits have not been saved.
  // Client-side navigation uses the shared editor guard separately.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function handleDashboardNavigation(event: { preventDefault: () => void }) {
    if (!canLeaveEditor()) event.preventDefault();
  }

  function revealNotice() {
    setNoticeDismissed(false);
    setNoticeVersion((previous) => previous + 1);
  }

  function markUnsaved() {
    setSaveConfirmed(false);
    setHasUnsavedChanges(true);
  }

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

  function errorFor(
    row: EditableDestination,
    field: InputName,
  ): string | undefined {
    const localErrors = validateRow(row);
    const shouldShow = attemptedSave || touched[`${row.clientKey}-${field}`];
    const localError = shouldShow ? localErrors[field] : undefined;
    // Ignore returned validation errors when the form has since been edited.
    const serverError =
      response.submittedPayload === currentPayload()
        ? response.fieldErrors?.[row.clientKey]?.[field]
        : undefined;
    return localError || serverError;
  }

  const anyVisibleErrors = rows.some((row) =>
    Boolean(errorFor(row, "platform") || errorFor(row, "url")),
  );

  function addDestination() {
    if (rows.length >= MAX_DESTINATIONS || pending || requiresReload) return;
    markUnsaved();
    // Adding a replacement destination means publication can continue.
    setConfirmUnpublish(false);
    const key = `new-${crypto.randomUUID()}`;
    setRows((previous) => [
      ...previous,
      { clientKey: key, platform: "", url: "" },
    ]);
    setResponse({ error: "", success: "" });
    setInfoMessage("");
    revealNotice();
    window.requestAnimationFrame(() => {
      document.getElementById(`${key}-platform`)?.focus();
    });
  }

  // Nothing is removed until the owner confirms. Confirmation changes only
  // the unsaved editor state; PostgreSQL is updated by Save Changes.
  function requestRemoval(row: EditableDestination) {
    if (pending || requiresReload) return;
    setConfirmationKey(row.clientKey);
    setInfoMessage("");
    revealNotice();
    window.requestAnimationFrame(() => {
      document.getElementById(`confirm-${row.clientKey}`)?.focus();
    });
  }

  function confirmRemoval(row: EditableDestination) {
    if (pending || requiresReload) return;
    const removesLastFromPublished = isPublished && rows.length === 1;
    markUnsaved();
    if (removesLastFromPublished) setConfirmUnpublish(true);
    const index = rows.findIndex((item) => item.clientKey === row.clientKey);
    const focusTarget = rows[index + 1] ?? rows[index - 1];
    setRows((previous) =>
      previous.filter((item) => item.clientKey !== row.clientKey),
    );
    const savedId = row.id;
    if (savedId) {
      setRemovedSavedIds((previous) =>
        previous.includes(savedId) ? previous : [...previous, savedId],
      );
      setInfoMessage(
        removesLastFromPublished
          ? `${row.platform || "Destination"} marked for removal. Saving will also unpublish your review page.`
          : `${row.platform || "Destination"} removed from the editor. Save Changes to apply this removal.`,
      );
    } else {
      setInfoMessage(
        "Unsaved destination discarded. No database record was removed.",
      );
    }
    setConfirmationKey(null);
    revealNotice();
    setResponse({ error: "", success: "" });
    setOrderingAnnouncement("");
    window.requestAnimationFrame(() => {
      document
        .getElementById(
          focusTarget
            ? `remove-${focusTarget.clientKey}`
            : "add-review-destination",
        )
        ?.focus();
    });
  }

  function cancelRemoval() {
    const clientKey = confirmationKey;
    setConfirmationKey(null);
    setInfoMessage("Removal cancelled. The destination has been kept.");
    revealNotice();
    window.requestAnimationFrame(() => {
      if (clientKey) document.getElementById(`remove-${clientKey}`)?.focus();
    });
  }

  // Arrow buttons work with mouse, touch, keyboard and assistive technology.
  // The order of this array is the order the v3 RPC saves to display_order.
  function moveDestination(clientKey: string, direction: -1 | 1) {
    if (pending || confirmationKey || requiresReload) return;
    markUnsaved();
    const index = rows.findIndex((row) => row.clientKey === clientKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;
    const row = rows[index];
    setRows((previous) => {
      const reordered = [...previous];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];
      return reordered;
    });
    setOrderChanged(true);
    setResponse({ error: "", success: "" });
    setInfoMessage(
      "Review destination order changed. Save Changes to apply it.",
    );
    revealNotice();
    setOrderingAnnouncement(
      `${row.platform || "Destination"} moved to position ${target + 1} of ${rows.length}.`,
    );

    // Don't leave keyboard focus on a now-disabled first/last arrow.
    const nextDirection =
      direction === -1 && target === 0
        ? "down"
        : direction === 1 && target === rows.length - 1
          ? "up"
          : direction === -1
            ? "up"
            : "down";
    window.requestAnimationFrame(() => {
      document.getElementById(`move-${nextDirection}-${clientKey}`)?.focus();
    });
  }

  function updateDestination(
    clientKey: string,
    field: InputName,
    value: string,
  ) {
    if (pending || requiresReload) return;
    markUnsaved();
    setRows((previous) =>
      previous.map((row) =>
        row.clientKey === clientKey ? { ...row, [field]: value } : row,
      ),
    );
    setResponse({ error: "", success: "" });
    setInfoMessage("");
    revealNotice();
  }

  function markTouched(clientKey: string, field: InputName) {
    setTouched((previous) => ({
      ...previous,
      [`${clientKey}-${field}`]: true,
    }));
  }

  function reportBusinessNameError() {
    setBusinessNameError(BUSINESS_NAME_ERROR);
    setSaveConfirmed(false);
    setResponse({ error: "", success: "" });
    setInfoMessage("");
    // Focus after the inline error renders, including on repeated attempts.
    window.requestAnimationFrame(() => {
      const input = document.getElementById("business-name");
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: "center" });
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || requiresReload) return;
    revealNotice();
    setInfoMessage("");
    if (confirmationKey) {
      setResponse({
        error: "Confirm or cancel the destination removal before saving.",
        success: "",
      });
      document.getElementById(`confirm-${confirmationKey}`)?.focus();
      return;
    }
    if (isPublished && rows.length === 0 && !confirmUnpublish) {
      setResponse({
        error:
          "Please confirm that removing your final destination will unpublish the review page.",
        success: "",
      });
      return;
    }
    const formData = new FormData(event.currentTarget);
    if (validateBusinessName(String(formData.get("name") ?? ""))) {
      reportBusinessNameError();
      return;
    }
    setBusinessNameError("");
    setAttemptedSave(true);
    setSaveConfirmed(false);
    setResponse({ error: "", success: "" });

    const invalidRow = rows.find((row) => {
      const validation = validateRow(row);
      return Boolean(validation.platform || validation.url);
    });

    if (invalidRow) {
      const invalidField: InputName = validateRow(invalidRow).platform
        ? "platform"
        : "url";
      setResponse({
        error: "Correct the highlighted review destinations before saving.",
        success: "",
      });
      document
        .getElementById(`${invalidRow.clientKey}-${invalidField}`)
        ?.focus();
      return;
    }

    formData.set("destinations", currentPayload());
    formData.set(
      "confirmUnpublish",
      isPublished && rows.length === 0 && confirmUnpublish ? "true" : "false",
    );

    startTransition(async () => {
      try {
        const removalCount = removedSavedIds.length;
        const result = await saveBusinessProfile(businessId, formData);
        if (result.success && result.savedDestinations) {
          // An actual server success plus refreshed DB rows confirms removal.
          // Do not claim an unsaved form edit is a completed deletion.
          setResponse({
            ...result,
            success: result.autoUnpublished
              ? `Profile saved. ${removalCount} review destination${removalCount === 1 ? "" : "s"} removed. Your review page is now unpublished.`
              : removalCount > 0
                ? `Profile saved. ${removalCount} review destination${removalCount === 1 ? "" : "s"} successfully removed.`
                : result.success,
          });
          setRows(initialRows(result.savedDestinations));
          if (typeof result.isPublished === "boolean")
            setIsPublished(result.isPublished);
          setConfirmUnpublish(false);
          setRemovedSavedIds([]);
          setSaveConfirmed(true);
          setHasUnsavedChanges(false);
          setOrderChanged(false);
          setTouched({});
          setAttemptedSave(false);
        } else {
          setSaveConfirmed(false);
          if (result.requiresReload) setRequiresReload(true);
          // In particular, an uncertain refresh must not be reported as a
          // confirmed deletion: follow the server's reload instruction.
          setResponse(result);
        }
      } catch (error) {
        console.error("Profile save request failed:", error);
        setSaveConfirmed(false);
        // A failed response does not tell us whether the save reached the server.
        setRequiresReload(true);
        setResponse({
          error:
            "Your changes couldn't be confirmed. Check the connection, then reload before retrying.",
          success: "",
        });
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        {/* Fixed feedback stays visible without scrolling. Successful and
            informational messages auto-dismiss; errors remain persistent. */}
        {!noticeDismissed &&
          (response.error || response.success || infoMessage) && (
            <div
              role={response.error ? "alert" : "status"}
              aria-atomic="true"
              className={`fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-xl border p-4 text-sm shadow-lg ${
                response.error
                  ? "border-red-300 bg-red-50 text-red-900"
                  : response.success
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-blue-300 bg-blue-50 text-blue-900"
              }`}
            >
              <p className="min-w-0 flex-1">
                {response.error || response.success || infoMessage}
              </p>
              {response.error && (
                <button
                  type="button"
                  onClick={() => setNoticeDismissed(true)}
                  aria-label="Dismiss error notification"
                  className="shrink-0 rounded-md px-2 py-1 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        <div role="status" aria-live="polite" className="sr-only">
          {orderingAnnouncement}
        </div>
        <Link
          href="/dashboard"
          onNavigate={handleDashboardNavigation}
          aria-disabled={pending}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Edit Business Profile</h1>
        <p className="mt-2 text-slate-600">
          Manage your business details and review destinations.
        </p>

        <form
          onSubmit={handleSubmit}
          aria-busy={pending}
          onChange={() => {
            setSaveConfirmed(false);
            setHasUnsavedChanges(true);
          }}
          className="mt-8 space-y-6"
        >
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
                disabled={pending || requiresReload}
                onInvalid={(event) => {
                  event.preventDefault();
                  reportBusinessNameError();
                }}
                onChange={(event) => {
                  if (businessNameError) {
                    setBusinessNameError(
                      validateBusinessName(event.currentTarget.value),
                    );
                  }
                }}
                aria-invalid={Boolean(businessNameError)}
                aria-describedby={
                  businessNameError ? "business-name-error" : undefined
                }
                className={`${inputClass} ${businessNameError ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100" : "border-slate-200 bg-white"}`}
              />
              {businessNameError && (
                <p
                  id="business-name-error"
                  role="alert"
                  className="mt-2 text-sm text-red-700"
                >
                  {businessNameError}
                </p>
              )}
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
                disabled={pending || requiresReload}
                className={`${inputClass} border-slate-200 bg-white`}
              />
              <p className="mt-2 text-xs text-slate-600">
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
                disabled={pending || requiresReload}
                className={`${inputClass} border-slate-200 bg-white`}
              />
            </div>
            <div className="mt-5">
              <p className="text-sm font-medium">Your public review address</p>
              <p className="mt-2 break-all rounded-xl bg-slate-50 p-3 text-sm text-blue-700">
                {shareUrl || `/r/${business.slug}`}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Your address stays the same when you update your business name.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Destinations</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add whichever review websites your business uses. Up to{" "}
              {MAX_DESTINATIONS} destinations. Changes take effect when you
              save.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Suggestions: Google, Trustpilot, Facebook, Checkatrade,
              Tripadvisor, Feefo, Reviews.io. You can type another platform name
              instead.
            </p>
            {(removedSavedIds.length > 0 ||
              orderChanged ||
              confirmUnpublish) && (
              <p
                role="status"
                className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                Unsaved changes:{" "}
                {removedSavedIds.length > 0
                  ? `${removedSavedIds.length} saved destination${removedSavedIds.length === 1 ? "" : "s"} marked for removal. `
                  : ""}
                {orderChanged ? "Destination order changed. " : ""}
                {confirmUnpublish && isPublished && rows.length === 0
                  ? "Saving with no review destinations will also UNPUBLISH your review page. "
                  : ""}
                {requiresReload
                  ? "Reload the page to check which changes were saved."
                  : "Select Save Changes to apply these updates."}
              </p>
            )}
            <datalist id="reviewlinks-platform-suggestions">
              {[
                "Google",
                "Trustpilot",
                "Facebook",
                "Checkatrade",
                "Tripadvisor",
                "Feefo",
                "Reviews.io",
                "Yelp",
              ].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {anyVisibleErrors && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
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
                  <div
                    key={row.clientKey}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-sm">
                        Destination {index + 1}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          id={`move-up-${row.clientKey}`}
                          type="button"
                          disabled={
                            pending ||
                            requiresReload ||
                            Boolean(confirmationKey) ||
                            index === 0
                          }
                          onClick={() => moveDestination(row.clientKey, -1)}
                          aria-label={`Move ${row.platform || `destination ${index + 1}`} up`}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
                        >
                          ↑ Up
                        </button>
                        <button
                          id={`move-down-${row.clientKey}`}
                          type="button"
                          disabled={
                            pending ||
                            requiresReload ||
                            Boolean(confirmationKey) ||
                            index === rows.length - 1
                          }
                          onClick={() => moveDestination(row.clientKey, 1)}
                          aria-label={`Move ${row.platform || `destination ${index + 1}`} down`}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
                        >
                          ↓ Down
                        </button>
                        <button
                          id={`remove-${row.clientKey}`}
                          type="button"
                          disabled={
                            pending ||
                            requiresReload ||
                            Boolean(confirmationKey)
                          }
                          onClick={() => requestRemoval(row)}
                          aria-label={`Remove destination ${index + 1}${row.platform ? `: ${row.platform}` : ""}`}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {confirmationKey === row.clientKey && (
                      <div
                        role="group"
                        aria-label={`Confirm removal of ${row.platform || `destination ${index + 1}`}`}
                        className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3"
                      >
                        <p className="font-semibold text-sm text-red-900">
                          Remove {row.platform || `destination ${index + 1}`}?
                        </p>
                        {isPublished && rows.length === 1 ? (
                          <p className="mt-1 text-sm text-red-800">
                            This is your final review destination. If you
                            confirm removal and then save with no destinations,
                            your public review page will automatically be{" "}
                            <strong>unpublished</strong>. Customers will no
                            longer be able to access it until you add a
                            destination and publish again. Nothing is changed in
                            the database until you save.
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-red-800">
                            This removes the destination from the editor. It
                            will not be deleted from your saved profile until
                            you select Save Changes.
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            id={`confirm-${row.clientKey}`}
                            type="button"
                            onClick={() => confirmRemoval(row)}
                            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            {isPublished && rows.length === 1
                              ? "Remove & unpublish on save"
                              : "Yes, remove"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelRemoval}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            Keep destination
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label
                        htmlFor={`${row.clientKey}-platform`}
                        className="text-sm font-medium"
                      >
                        Platform name
                      </label>
                      <input
                        id={`${row.clientKey}-platform`}
                        type="text"
                        list="reviewlinks-platform-suggestions"
                        maxLength={40}
                        value={row.platform}
                        disabled={pending || requiresReload}
                        onChange={(event) =>
                          updateDestination(
                            row.clientKey,
                            "platform",
                            event.target.value,
                          )
                        }
                        onBlur={() => markTouched(row.clientKey, "platform")}
                        placeholder="e.g. Checkatrade"
                        aria-invalid={Boolean(platformError)}
                        aria-describedby={
                          platformError
                            ? `${row.clientKey}-platform-error`
                            : undefined
                        }
                        className={`${inputClass} ${platformError ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100" : "border-slate-200 bg-white"}`}
                      />
                      {platformError && (
                        <p
                          role="alert"
                          id={`${row.clientKey}-platform-error`}
                          className="mt-2 text-sm text-red-700"
                        >
                          {platformError}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor={`${row.clientKey}-url`}
                        className="text-sm font-medium"
                      >
                        Review URL
                      </label>
                      <input
                        id={`${row.clientKey}-url`}
                        type="text"
                        inputMode="url"
                        maxLength={2048}
                        spellCheck={false}
                        autoCapitalize="none"
                        autoComplete="url"
                        value={row.url}
                        disabled={pending || requiresReload}
                        onChange={(event) =>
                          updateDestination(
                            row.clientKey,
                            "url",
                            event.target.value,
                          )
                        }
                        onBlur={() => markTouched(row.clientKey, "url")}
                        placeholder="https://..."
                        aria-invalid={Boolean(urlError)}
                        aria-describedby={
                          urlError ? `${row.clientKey}-url-error` : undefined
                        }
                        className={`${inputClass} ${urlError ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100" : "border-slate-200 bg-white"}`}
                      />
                      {urlError && (
                        <p
                          role="alert"
                          id={`${row.clientKey}-url-error`}
                          className="mt-2 text-sm text-red-700"
                        >
                          {urlError}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              id="add-review-destination"
              type="button"
              onClick={addDestination}
              disabled={
                pending || requiresReload || rows.length >= MAX_DESTINATIONS
              }
              className="mt-5 w-full rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              + Add Review Destination
            </button>
            <p className="mt-2 text-xs text-slate-600">
              {rows.length} of {MAX_DESTINATIONS} destinations. Repeated
              platform names are allowed. For multiple listings, use descriptive
              names such as Google — Birmingham.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Review Invitation</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your review page URL is always added automatically.
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
                disabled={pending || requiresReload}
                onChange={(e) => setInvitationMessage(e.target.value)}
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
              <p className="mt-1 break-all text-sm text-blue-700">
                {shareUrl || `/r/${business.slug}`}
              </p>
            </div>
            <p className="mt-6 text-sm font-semibold">Full message preview</p>
            <div className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6">
              {fullMessage}
            </div>
          </section>

          <div>
            {requiresReload && (
              <p
                role="alert"
                className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                We couldn&apos;t confirm the save. Check your connection, then
                reload the page before editing or saving again.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={pending || requiresReload}
                className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:flex-1"
              >
                {pending ? "Saving..." : "Save Changes"}
              </button>
              <Link
                href="/dashboard"
                onNavigate={handleDashboardNavigation}
                aria-disabled={pending}
                className={`inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-center font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-1 ${
                  pending
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-slate-100"
                }`}
              >
                ← Back to dashboard
              </Link>
            </div>
            {saveConfirmed && (
              <p
                className="mt-3 text-center text-sm font-medium text-green-800"
                role="status"
              >
                ✓ Saved to your profile
              </p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
