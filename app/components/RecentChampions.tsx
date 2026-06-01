"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Champion = {
  battle_id: string;
  winner_name: string | null;
  finished_at: string;
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function RecentChampions() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChampions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("live_activity_battle_winners")
        .select("battle_id, winner_name, finished_at")
        .order("finished_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error loading recent champions:", error);
        setLoading(false);
        return;
      }

      setChampions(data || []);
      setLoading(false);
    };

    loadChampions();
  }, []);

  return (
    <section className="recent-champions-card">
      <div className="recent-champions-header">
        <div>
          <span className="activity-dot" />
          Recent Champions
        </div>

        <span className="activity-header-tag">Ranked</span>
      </div>

      <div className="recent-champions-list">
        {loading ? (
          <div className="activity-empty">Loading recent champions...</div>
        ) : champions.length === 0 ? (
          <div className="activity-empty">
            Recent battle winners will appear here.
          </div>
        ) : (
          champions.map((champion, index) => (
            <div
              className="recent-champion-row"
              key={`${champion.battle_id}-${champion.winner_name}-${index}`}
            >
              <div className="recent-champion-icon">🏆</div>

              <div className="recent-champion-copy">
                <strong>{champion.winner_name || "A producer"}</strong>
                <span>Won a ranked battle</span>
              </div>

              <div className="recent-champion-time">
                {timeAgo(champion.finished_at)}
              </div>
            </div>
          ))
        )}
      </div>

      <a className="recent-champions-link" href="/leaderboard">
        View the leaderboard →
      </a>
    </section>
  );
}