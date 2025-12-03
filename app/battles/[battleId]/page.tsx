// app/battles/[battleId]/page.tsx

import BattleLobby from "../../components/BattleLobby";

type BattlePageProps = {
  // In Next 16, params is a Promise in server components
  params: Promise<{
    battleId: string;
  }>;
};

export default async function BattlePage({ params }: BattlePageProps) {
  // ✅ Unwrap the Promise
  const { battleId } = await params;

  // Optional: small guard in case the URL is malformed
  if (!battleId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Invalid battle</h2>
        <p>Missing battle id in the URL.</p>
      </div>
    );
  }

  // BattleLobby is a client component; it will receive a real battleId now
  return <BattleLobby battleId={battleId} />;
}
