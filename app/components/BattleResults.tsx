"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ResultRow = {
  user_id: string;
  audio_url: string;
  votes: number;
  isSelf: boolean;
};

type BattleResultsProps = {
  battleId: string;
};

export default function BattleResults({ battleId }: BattleResultsProps) {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id ?? null;

      // 1) Get all submissions for this battle
      const { data: submissions, error: subErr } = await supabase
        .from("battle_submissions")
        .select("id, user_id, audio_path")
        .eq("battle_id", battleId);

      if (subErr || !submissions) {
        console.error("Error loading submissions:", subErr);
        setLoading(false);
        return;
      }

      // 2) Get all votes for this battle
      const { data: votes, error: voteErr } = await supabase
        .from("battle_votes")
        .select("submission_user_id")
        .eq("battle_id", battleId);

      if (voteErr || !votes) {
        console.error("Error loading votes:", voteErr);
        setLoading(false);
        return;
      }

      // 3) Count votes per producer
      const voteCounts = new Map<string, number>();
      for (const v of votes) {
        const key = v.submission_user_id;
        voteCounts.set(key, (voteCounts.get(key) ?? 0) + 1);
      }

      // 4) Build result rows and fetch public URLs
      const resultRows: ResultRow[] = submissions.map((s) => {
        const { data: urlData } = supabase.storage
          .from("battle-audio")
          .getPublicUrl(s.audio_path);

        return {
          user_id: s.user_id,
          audio_url: urlData.publicUrl,
          votes: voteCounts.get(s.user_id) ?? 0,
          isSelf: currentUserId === s.user_id,
        };
      });

      // highest votes first
      resultRows.sort((a, b) => b.votes - a.votes);

      setRows(resultRows);
      setLoading(false);
    };

    load();
  }, [battleId]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Battle results</h2>

      {rows.length === 0 ? (
        <p>No submissions for this battle.</p>
      ) : (
        <div className="results-list">
          {rows.map((r, index) => (
            <div
              key={r.user_id}
              className="sample-box"
              style={{ marginBottom: 12 }}
            >
              <h3>
                {index === 0 ? "🏆 " : ""}
                {r.isSelf ? "You" : `Producer ${index + 1}`} – {r.votes} vote
                {r.votes === 1 ? "" : "s"}
              </h3>
              <audio
                controls
                style={{ width: "100%", marginTop: 4 }}
              >
                <source src={r.audio_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
