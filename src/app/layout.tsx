import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

// 明朝はロゴ・大見出しのポイント使いに限定する(CLAUDE.md デザイン原則)
const shippori = Shippori_Mincho({
  variable: "--font-shippori",
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Weft — 予定・記録・お金をひとつに",
  description:
    "予定・記録・お金をひとつのアプリで管理し、選んだものだけを共有できます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKaku.variable} ${shippori.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
