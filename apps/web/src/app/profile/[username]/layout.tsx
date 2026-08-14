import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} - AuroraChess`,
    description: `View ${username}'s chess profile on AuroraChess`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
