import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewBranch | Simple Review Sharing",
  description:
    "Make it easy for your customers to leave a review. Share all your business review links in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
