// app/battles/[battleId]/results/page.tsx

import BattleResults from "../../../components/BattleResults";

type ResultsPageProps = {
  // Next 16: params is a Promise in server components
  params: Promise<{
    battleId: string;
  }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { battleId } = await params;

  if (!battleId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Invalid battle</h2>
        <p>Missing battle id in the URL.</p>
      </div>
    );
  }

  return <BattleResults battleId={battleId} />;
}
