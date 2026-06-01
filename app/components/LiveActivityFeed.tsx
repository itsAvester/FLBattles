"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ActivityType = "battle_win" | "battle_complete" | "submission" | "sample";

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  createdAt: string;
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

function iconFor(type: ActivityType) {
  if (type === "battle_win") return "🏆";
  if (type === "battle_complete") return "⚔";
  if (type === "submission") return "↑";
  return "♫";
}

export default function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      setLoading(true);

      const [winnersRes, submissionsRes, samplesRes] = await Promise.all([
        supabase
          .from("live_activity_battle_winners")
          .select("battle_id, finished_at, sample_name, winner_name, vote_count")
          .order("finished_at", { ascending: false })
          .limit(8),

        supabase
          .from("battle_submissions")
          .select("id, user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(6),

        supabase
          .from("sample_submissions")
          .select("id, user_id, status, created_at, reviewed_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const userIds = new Set<string>();

      submissionsRes.data?.forEach((submission) => {
        if (submission.user_id) userIds.add(submission.user_id);
      });

      samplesRes.data?.forEach((sample) => {
        if (sample.user_id) userIds.add(sample.user_id);
      });

      const profileMap = new Map<string, string>();

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", Array.from(userIds));

        profiles?.forEach((profile) => {
          profileMap.set(profile.id, profile.display_name || "A producer");
        });
      }

      const activity: ActivityItem[] = [];

      winnersRes.data?.forEach((winner) => {
        activity.push({
          id: `winner-${winner.battle_id}-${winner.winner_name}`,
          type: "battle_win",
          title: `${winner.winner_name || "A producer"} won a ranked battle`,
          subtitle: "",
          createdAt: winner.finished_at,
        });
      });

      submissionsRes.data?.forEach((submission) => {
        const name = profileMap.get(submission.user_id) || "A producer";

        activity.push({
          id: `submission-${submission.id}`,
          type: "submission",
          title: `${name} uploaded their beat`,
          subtitle: "Locked in for the current battle",
          createdAt: submission.created_at,
        });
      });

      samplesRes.data?.forEach((sample) => {
        const name = profileMap.get(sample.user_id) || "A producer";

        activity.push({
          id: `sample-${sample.id}`,
          type: "sample",
          title: `${name}'s sample was approved`,
          subtitle: "It is now in the sample rotation",
          createdAt: sample.reviewed_at || sample.created_at,
        });
      });

      setItems(
        activity
          .filter((item) => item.createdAt)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 6)
      );

      setLoading(false);
    };

    loadActivity();
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return <div className="activity-empty">Loading recent activity...</div>;
    }

    return items.map((item) => (
      <div className="activity-row" key={item.id}>
        <div className={`activity-icon activity-icon-${item.type}`}>
          {iconFor(item.type)}
        </div>

        <div className="activity-copy">
          <strong>{item.title}</strong>
          <span>{item.subtitle}</span>
        </div>

        <div className="activity-time">{timeAgo(item.createdAt)}</div>
      </div>
    ));
  }, [items, loading]);

  return (
    <aside className="live-activity-card">
      <div className="live-activity-header">
        <div>
          <span className="activity-dot" />
          Live Activity
        </div>

        <span className="activity-header-tag">Recent</span>
      </div>

      <div className="activity-list">{content}</div>

      <a className="activity-profile-link" href="/profile">
        See more activity on your profile →
      </a>
    </aside>
  );
}