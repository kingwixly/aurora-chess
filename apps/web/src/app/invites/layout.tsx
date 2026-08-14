import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invites - AuroraChess" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
