"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import type { Business } from "@/lib/businesses";
import {
  changePublication,
  type PublicationState,
} from "@/app/(site)/dashboard/actions";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";
import OnboardingChecklist from "@/components/OnboardingChecklist";

type BusinessDashboardProps = {
  businessId: string;
  business: Business;
  isPublished: boolean;
  canPublish: boolean;
  onboardingSteps?: 1 | 2;
};

const initialPublicationState: PublicationState = {
  error: "",
  success: "",
};

export default function BusinessDashboard({
  businessId,
  business,
  isPublished,
  canPublish,
  onboardingSteps,
}: BusinessDashboardProps) {
  const shareUrl = useReviewPageUrl(business.slug);

  const [copyStatus, setCopyStatus] = useState("");

  const qrRef = useRef<HTMLCanvasElement>(null);
  const qrDialogRef = useRef<HTMLDialogElement>(null);

  const [publicationState, publicationAction, pending] = useActionState(
    changePublication,
    initialPublicationState,
  );

  const message = [
    business.invitationMessage.trim(),
    ...(shareUrl ? [`You can leave your feedback here: ${shareUrl}`] : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const smsUrl = `sms:?body=${encodeURIComponent(message)}`;

  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Review your experience with ${business.name}`,
  )}&body=${encodeURIComponent(message)}`;

  async function copyLink() {
    if (!shareUrl || !isPublished) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("Link copied!");
    } catch {
      setCopyStatus("Unable to copy automatically. Select the URL instead.");
    }
  }

  function downloadQRCode() {
    if (!shareUrl || !isPublished) return;

    const canvas = qrRef.current;
    if (!canvas) return;

    const link = document.createElement("a");

    link.href = canvas.toDataURL("image/png");
    link.download = `${business.slug}-review-qr.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const DashboardHeading = onboardingSteps !== undefined ? "h2" : "h1";

  const publicationSection = (
    <section
      id="publish-profile"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {isPublished ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
            <span className="text-base font-semibold">Manage review page</span>

            <span
              aria-hidden="true"
              className="text-xl text-slate-500 transition-transform group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-sm leading-6 text-slate-600">
              Your review page is currently live. Unpublishing will make it
              unavailable to customers until you publish it again. Your business
              details and review destinations will be saved.
            </p>

            <form action={publicationAction} className="mt-5">
              <input type="hidden" name="businessId" value={businessId} />

              <input type="hidden" name="publish" value="false" />

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Updating..." : "Unpublish Profile"}
              </button>
            </form>
          </div>
        </details>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Publish your review page</h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your review page is private until you publish it.
          </p>

          <form action={publicationAction} className="mt-5">
            <input type="hidden" name="businessId" value={businessId} />

            <input type="hidden" name="publish" value="true" />

            <button
              type="submit"
              disabled={pending || !canPublish}
              className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Updating..." : "Publish Profile"}
            </button>
          </form>

          {!canPublish && (
            <p className="mt-3 text-sm text-amber-700">
              Add at least one review destination in your profile editor before
              publishing.
            </p>
          )}
        </>
      )}

      {publicationState.error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {publicationState.error}
        </p>
      )}

      {publicationState.success && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {publicationState.success}
        </p>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div
        className={
          isPublished ? "mx-auto w-full max-w-5xl" : "mx-auto w-full max-w-xl"
        }
      >
        {/* First-time onboarding */}
        {onboardingSteps !== undefined && (
          <div className="mb-8">
            <OnboardingChecklist completedSteps={onboardingSteps} embedded />
          </div>
        )}

        {/* Dashboard header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DashboardHeading className="text-3xl font-bold tracking-tight">
                Your Review Dashboard
              </DashboardHeading>

              <p className="mt-2 text-slate-600">{business.name}</p>
            </div>

            <span
              className={
                isPublished
                  ? "mt-1 shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                  : "mt-1 shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
              }
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <Link
            href="/dashboard/edit"
            className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
          >
            Edit Business Profile →
          </Link>
        </header>

        {/* Publishing and management controls */}
        {!isPublished && publicationSection}

        {/* Responsive sharing dashboard */}
        <div
          className={
            isPublished ? "mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2" : "mt-5"
          }
        >
          {/* Review link */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:col-start-1 lg:row-start-1">
            <h2 className="text-lg font-semibold">Your Review Link</h2>

            <p className="mt-2 text-sm text-slate-500">
              {isPublished
                ? "Share this link with customers."
                : "Your link will be available for sharing once published."}
            </p>

            <input
              aria-label="Public review URL"
              type="text"
              readOnly
              value={shareUrl || "Preparing link..."}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            />

            {isPublished && (
              <>
                <button
                  type="button"
                  disabled={!shareUrl}
                  onClick={copyLink}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Copy Review Link
                </button>

                <p
                  role="status"
                  className="mt-2 min-h-5 text-center text-sm text-slate-500"
                >
                  {copyStatus}
                </p>

                <Link
                  href={`/r/${business.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-center text-sm font-medium text-blue-600 hover:underline"
                >
                  View Your Review Page ↗
                </Link>
              </>
            )}
          </section>

          {/* QR code */}
          {isPublished && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col">
              <h2 className="text-lg font-semibold">Your QR Code</h2>

              <p className="mt-2 text-sm text-slate-500">
                Let customers scan this code to open your review page.
              </p>

              <div className="mt-6 flex justify-center lg:flex-1 lg:items-center">
                {shareUrl ? (
                  <QRCodeCanvas
                    ref={qrRef}
                    value={shareUrl}
                    size={256}
                    level="M"
                    marginSize={4}
                    title={`Review ${business.name}`}
                  />
                ) : (
                  <p className="text-sm text-slate-400">Preparing QR code...</p>
                )}
              </div>

              <button
                type="button"
                disabled={!shareUrl}
                onClick={() => qrDialogRef.current?.showModal()}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Show QR Code Full Screen
              </button>

              <button
                type="button"
                disabled={!shareUrl}
                onClick={downloadQRCode}
                className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold transition hover:bg-slate-50 disabled:opacity-50"
              >
                Download QR Code
              </button>

              {/* Full-screen customer-facing QR display */}
              <dialog
                ref={qrDialogRef}
                aria-labelledby="customer-qr-title"
                aria-describedby="customer-qr-description"
                className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto border-0 bg-white p-0 text-slate-900 backdrop:bg-white"
              >
                <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 py-5 sm:px-8">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => qrDialogRef.current?.close()}
                      aria-label="Close QR code display"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-900 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <h2
                      id="customer-qr-title"
                      className="text-2xl font-bold tracking-tight sm:text-3xl"
                    >
                      Leave a review for {business.name}
                    </h2>

                    <p
                      id="customer-qr-description"
                      className="mt-4 max-w-md text-base leading-7 text-slate-600"
                    >
                      Scan the QR code with your phone to visit our review page.
                    </p>

                    {shareUrl && (
                      <div className="mt-8 w-full max-w-[320px] rounded-2xl bg-white p-2">
                        <QRCodeCanvas
                          value={shareUrl}
                          size={320}
                          level="M"
                          marginSize={4}
                          title={`Review ${business.name}`}
                          className="h-auto w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </dialog>
            </section>
          )}

          {/* Manual sharing with a pre-filled neutral invitation */}
          {isPublished && shareUrl && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-start-1 lg:row-start-2">
              <h2 className="text-lg font-semibold">Share With Customers</h2>

              <p className="mt-2 text-sm text-slate-500">
                Choose how you&apos;d like to send your review link.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-800"
                >
                  WhatsApp
                </a>

                <a
                  href={smsUrl}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-50"
                >
                  SMS
                </a>

                <a
                  href={emailUrl}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-50"
                >
                  Email
                </a>
              </div>
            </section>
          )}
        </div>

        {isPublished && <div className="mt-5">{publicationSection}</div>}

        {/* Dashboard footer */}
        <footer className="mt-10 text-center text-xs text-slate-600">
          ReviewBranch — Making reviews easier.
        </footer>
      </div>
    </main>
  );
}
