"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

import type { Business } from "@/lib/businesses";
import {
  changePublication,
  type PublicationState,
} from "@/app/dashboard/actions";
import { useReviewPageUrl } from "@/hooks/useReviewProfile";

type BusinessDashboardProps = {
  businessId: string;
  business: Business;
  isPublished: boolean;
  canPublish: boolean;
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
}: BusinessDashboardProps) {
  // Public URL generated from the business slug.
  const shareUrl = useReviewPageUrl(business.slug);

  const [copyStatus, setCopyStatus] = useState("");

  const qrRef = useRef<HTMLCanvasElement>(null);

  // Publication form.
  const [publicationState, publicationAction, pending] = useActionState(
    changePublication,
    initialPublicationState,
  );

  // Business owner controls this text.
  // The review URL is added automatically.
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

    const imageUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");

    link.href = imageUrl;
    link.download = `${business.slug}-review-qr.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-xl">
        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Your Review Dashboard
          </h1>

          <p className="mt-2 text-slate-600">{business.name}</p>

          <Link
            href="/dashboard/edit"
            className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
          >
            Edit Business Profile →
          </Link>
        </header>

        {/* PUBLICATION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Profile Status</h2>

            <span
              className={
                isPublished
                  ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                  : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
              }
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {isPublished
              ? "Your review page is live and ready to share."
              : "Your review page is private until you publish it."}
          </p>

          <form action={publicationAction} className="mt-5">
            <input type="hidden" name="businessId" value={businessId} />

            <input type="hidden" name="publish" value={String(!isPublished)} />

            <button
              type="submit"
              disabled={pending || (!isPublished && !canPublish)}
              className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "Updating..."
                : isPublished
                  ? "Unpublish Profile"
                  : "Publish Profile"}
            </button>
          </form>

          {!isPublished && !canPublish && (
            <p className="mt-3 text-sm text-amber-700">
              Add at least one review destination in your profile editor before
              publishing.
            </p>
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

        {/* PUBLIC REVIEW URL */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        {/* QR CODE */}
        {isPublished && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold">Your QR Code</h2>

            <p className="mt-2 text-sm text-slate-500">
              Let customers scan this code to open your review page.
            </p>

            <div className="mt-6 flex justify-center">
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
              onClick={downloadQRCode}
              disabled={!shareUrl}
              className="mt-6 w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold transition hover:bg-slate-50 disabled:opacity-50"
            >
              Download QR Code
            </button>
          </section>
        )}

        {/* SHARING */}
        {isPublished && shareUrl && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Share With Customers</h2>

            <p className="mt-2 text-sm text-slate-500">
              Choose how you&apos;d like to send your review link.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
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

        <footer className="mt-10 text-center text-xs text-slate-400">
          ReviewLinks — Making reviews easier.
        </footer>
      </div>
    </main>
  );
}
