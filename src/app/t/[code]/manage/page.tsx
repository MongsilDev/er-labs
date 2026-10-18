import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Manage from "@/components/Manage";
import { avatarUrl, currentUser } from "@/server/auth";
import { loadView, members } from "@/server/tournament";

export const metadata: Metadata = { title: "운영자", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/t/${code.toUpperCase()}/manage`)}`);
  const view = loadView(code, user);
  if (!view) notFound();
  if (!view.role) redirect(`/t/${view.code}/a`);
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
