import KelCalc from "@/er/components/kel/KelCalc";
import KelPage, { NO_DATA } from "@/er/components/kel/KelPage";
import { kelCalcData, kelData, kelGate, kelMetadata } from "@/er/server/kel";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("calc");

export default async function Page() {
  const { user, owner } = await kelGate("calc");
  const data = kelData();
  return (
    <KelPage user={user} owner={owner} screen="calc" lead={data ? undefined : NO_DATA} notes={["넣은 결과는 이 브라우저에만 저장됩니다."]} source>
      {data && <KelCalc data={kelCalcData(data)} />}
    </KelPage>
  );
}
