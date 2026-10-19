import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Footer from "@/er/components/Footer";
import Header from "@/er/components/Header";
import Manage from "@/er/components/Manage";
import { avatarUrl, currentUser } from "@/er/server/auth";
import { loadView, members } from "@/er/server/tournament";

export const metadata: Metadata = { title: "운영자", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/er/t/${code.toUpperCase()}/manage`)}`);
  const view = loadView(code, user);
  if (!view) notFound();
  if (!view.role) redirect(`/er/t/${view.code}/a`);
  const data = members(view.code, user);
  return (
    <>
      <Header user={user} crumb="점수 계산" />
      <Manage
        view={view}
        me={user.id}
        initialMembers={data.members.map((m) => ({ ...m, avatar: m.avatar ? avatarUrl(m) : null }))}
        initialInvites={data.invites}
      />
      <Footer />
    </>
  );
}
