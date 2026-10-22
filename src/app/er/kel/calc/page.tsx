import KelCalc from "@/er/components/kel/KelCalc";
import KelPage from "@/er/components/kel/KelPage";
import { kelCalcData, kelData, kelGate, kelMetadata } from "@/er/server/kel";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("calc");

export default async function Page() {
  const { user, owner } = await kelGate("calc");
  const data = kelData();
  return (
    <KelPage user={user} owner={owner} screen="calc" notes={["넣은 결과는 이 브라우저에만 저장됩니다.", "경기 기록은 님블뉴런 이스포츠 팀에게 받은 자료로 계산했습니다."]}>
      {data ? <KelCalc data={kelCalcData(data)} /> : <p className="panel p-5 text-fg-3">경기 기록 자료가 없어 계산할 수 없습니다.</p>}
    </KelPage>
  );
}
