import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stats - AuroraChess" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
