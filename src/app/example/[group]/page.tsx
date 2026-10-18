import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import TournamentApp from "@/components/t/TournamentApp";
import { exampleView } from "@/lib/example";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "예시 대회" };

export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const view = exampleView();
  const idx = group.toLowerCase().charCodeAt(0) - 97;
  if (group.length !== 1 || idx < 0 || idx >= view.groupCount) redirect("/example/a");
  const user = await currentUser();
  return (
    <>
      <Header user={user} crumb="점수 계산" wide />
      <TournamentApp initial={view} groupIdx={idx} basePath="/example" />
      <Footer wide />
    </>
  );
}
