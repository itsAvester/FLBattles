"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type ReportType = "bug" | "player";

type BugCategory =
  | "upload"
  | "lobby"
  | "voting"
  | "audio"
  | "login"
  | "profile"
  | "results"
  | "mobile"
  | "other";

type PlayerReason =
  | "harassment"
  | "inappropriate_content"
  | "cheating"
  | "spam"
  | "offensive_name"
  | "suspicious_voting"
  | "other";

type PlayerOption = {
  userId: string;
  displayName: string;
};

const BUG_CATEGORIES: { value: BugCategory; label: string }[] = [
  { value: "upload", label: "Upload" },
  { value: "lobby", label: "Lobby" },
  { value: "voting", label: "Voting" },
  { value: "audio", label: "Audio" },
  { value: "login", label: "Login" },
  { value: "profile", label: "Profile" },
  { value: "results", label: "Results" },
  { value: "mobile", label: "Mobile" },
  { value: "other", label: "Other" },
];

const PLAYER_REASONS: { value: PlayerReason; label: string }[] = [
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "cheating", label: "Cheating" },
  { value: "spam", label: "Spam" },
  { value: "offensive_name", label: "Offensive name" },
  { value: "suspicious_voting", label: "Suspicious voting" },
  { value: "other", label: "Other" },
];

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function getSafeBugCategory(value: string | null): BugCategory {
  const match = BUG_CATEGORIES.find((category) => category.value === value);
  return match?.value ?? "other";
}

function getSafeReportType(value: string | null): ReportType {
  return value === "player" ? "player" : "bug";
}

function getBrowserInfo() {
  if (typeof window === "undefined") return {};

  return {
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    platform: window.navigator.platform,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>("bug");
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [battleId, setBattleId] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [bugCategory, setBugCategory] = useState<BugCategory>("other");
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");

  const [playerReason, setPlayerReason] = useState<PlayerReason>("other");
  const [reportedUserId, setReportedUserId] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");

  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const queryBattleId = params.get("battleId");
    const queryReportedUserId = params.get("userId") ?? params.get("reportedUserId");

    setReportType(getSafeReportType(params.get("type")));
    setBugCategory(getSafeBugCategory(params.get("category")));

    if (isUuid(queryBattleId)) {
      setBattleId(queryBattleId!.trim());
    }

    if (isUuid(queryReportedUserId)) {
      setReportedUserId(queryReportedUserId!.trim());
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);
      setContactEmail(user?.email ?? "");
      setAuthLoaded(true);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    const loadBattlePlayers = async () => {
      if (!isUuid(battleId)) {
        setPlayerOptions([]);
        return;
      }

      setPlayersLoading(true);

      const { data: lobbyRows, error: lobbyError } = await supabase
        .from("battle_lobby_players")
        .select("user_id")
        .eq("lobby_id", battleId);

      if (lobbyError) {
        console.error("Failed to load report player options:", lobbyError);
        setPlayerOptions([]);
        setPlayersLoading(false);
        return;
      }

      const userIds = Array.from(
        new Set((lobbyRows ?? []).map((row: any) => row.user_id).filter(Boolean))
      );

      if (userIds.length === 0) {
        setPlayerOptions([]);
        setPlayersLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Failed to load report profiles:", profilesError);
        setPlayerOptions([]);
        setPlayersLoading(false);
        return;
      }

      const nextOptions = (profiles ?? [])
        .map((profile: any) => ({
          userId: profile.id as string,
          displayName: (profile.display_name as string | null)?.trim() || "Producer",
        }))
        .filter((option) => option.userId !== user?.id)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setPlayerOptions(nextOptions);

      if (!reportedUserId && nextOptions.length === 1) {
        setReportedUserId(nextOptions[0].userId);
      }

      setPlayersLoading(false);
    };

    loadBattlePlayers();
  }, [battleId, reportedUserId, user?.id]);

  const selectedReportedPlayer = useMemo(
    () => playerOptions.find((option) => option.userId === reportedUserId) ?? null,
    [playerOptions, reportedUserId]
  );

  const canSubmitPlayerReport = authLoaded && !!user;

  const resetMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmitBug = async () => {
    const description = bugDescription.trim();

    if (description.length < 8) {
      setError("Please describe the issue in at least 8 characters.");
      return;
    }

    const { error } = await supabase.from("bug_reports").insert({
      reporter_user_id: user?.id ?? null,
      reporter_email: contactEmail.trim() || user?.email || null,
      category: bugCategory,
      title: bugTitle.trim() || null,
      description,
      expected_behavior: expectedBehavior.trim() || null,
      page_url: pageUrl.trim() || null,
      battle_id: isUuid(battleId) ? battleId.trim() : null,
      browser_info: getBrowserInfo(),
    });

    if (error) {
      setError(error.message || "Could not submit bug report.");
      return;
    }

    setMessage("Report submitted. Thanks for helping improve FLBattles.");
    setBugTitle("");
    setBugDescription("");
    setExpectedBehavior("");
  };

  const handleSubmitPlayer = async () => {
    if (!user) {
      setError("Please log in before reporting a player.");
      return;
    }

    if (!isUuid(reportedUserId)) {
      setError("Please select or enter the player you want to report.");
      return;
    }

    if (reportedUserId === user.id) {
      setError("You cannot report yourself.");
      return;
    }

    const description = playerDescription.trim();

    if (description.length < 8) {
      setError("Please describe what happened in at least 8 characters.");
      return;
    }

    const reporterName = user.email?.split("@")[0] ?? null;

    const { error } = await supabase.from("player_reports").insert({
      reporter_user_id: user.id,
      reported_user_id: reportedUserId.trim(),
      reporter_display_name_snapshot: reporterName,
      reported_display_name_snapshot: selectedReportedPlayer?.displayName ?? null,
      battle_id: isUuid(battleId) ? battleId.trim() : null,
      reason: playerReason,
      description,
      page_url: pageUrl.trim() || null,
      browser_info: getBrowserInfo(),
    });

    if (error) {
      if (error.code === "23505") {
        setError("You already submitted this same player report for this battle.");
        return;
      }

      setError(error.message || "Could not submit player report.");
      return;
    }

    setMessage("Player report submitted. It will be reviewed from the backend.");
    setPlayerDescription("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      if (reportType === "bug") {
        await handleSubmitBug();
      } else {
        await handleSubmitPlayer();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-inner report-page-shell">
      <div className="report-page-grid">
        <aside className="report-copy-card card">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Support
          </span>
          <h1>Report an issue</h1>
          <p>
            Send bug details or player reports without interrupting the battle flow.
            Battle and page context are attached when available.
          </p>

          <div className="report-context-list">
            <div>
              <span>Current type</span>
              <strong>{reportType === "bug" ? "Bug report" : "Player report"}</strong>
            </div>
            <div>
              <span>Battle ID</span>
              <strong>{battleId || "Not attached"}</strong>
            </div>
          </div>
        </aside>

        <div className="report-form-card card">
          <div className="report-type-toggle" role="tablist" aria-label="Report type">
            <button
              type="button"
              className={reportType === "bug" ? "report-type-button active" : "report-type-button"}
              onClick={() => {
                setReportType("bug");
                resetMessages();
              }}
            >
              Bug Report
            </button>
            <button
              type="button"
              className={reportType === "player" ? "report-type-button active" : "report-type-button"}
              onClick={() => {
                setReportType("player");
                resetMessages();
              }}
            >
              Player Report
            </button>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            {reportType === "bug" ? (
              <>
                <div className="report-form-row report-form-row-two">
                  <label>
                    Category
                    <select
                      value={bugCategory}
                      onChange={(event) => setBugCategory(event.target.value as BugCategory)}
                    >
                      {BUG_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Contact email <span>optional</span>
                    <input
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="you@email.com"
                      type="email"
                    />
                  </label>
                </div>

                <label>
                  Title <span>optional</span>
                  <input
                    value={bugTitle}
                    onChange={(event) => setBugTitle(event.target.value)}
                    maxLength={160}
                    placeholder="Example: upload fails the first time"
                  />
                </label>

                <label>
                  What happened?
                  <textarea
                    value={bugDescription}
                    onChange={(event) => setBugDescription(event.target.value)}
                    maxLength={3000}
                    rows={4}
                    placeholder="Describe the bug, what you clicked, and what you saw."
                    required
                  />
                </label>

                <label>
                  What did you expect? <span>optional</span>
                  <textarea
                    value={expectedBehavior}
                    onChange={(event) => setExpectedBehavior(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Example: the upload should complete and show submitted."
                  />
                </label>
              </>
            ) : (
              <>
                {!canSubmitPlayerReport && (
                  <div className="report-auth-warning">
                    Player reports require a logged-in account.
                  </div>
                )}

                <div className="report-form-row report-form-row-two">
                  <label>
                    Reason
                    <select
                      value={playerReason}
                      onChange={(event) => setPlayerReason(event.target.value as PlayerReason)}
                    >
                      {PLAYER_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Player
                    {playerOptions.length > 0 ? (
                      <select
                        value={reportedUserId}
                        onChange={(event) => setReportedUserId(event.target.value)}
                      >
                        <option value="">
                          {playersLoading ? "Loading players..." : "Select player"}
                        </option>
                        {playerOptions.map((option) => (
                          <option key={option.userId} value={option.userId}>
                            {option.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={reportedUserId}
                        onChange={(event) => setReportedUserId(event.target.value)}
                        placeholder="Player user ID"
                      />
                    )}
                  </label>
                </div>

                <label>
                  What happened?
                  <textarea
                    value={playerDescription}
                    onChange={(event) => setPlayerDescription(event.target.value)}
                    maxLength={3000}
                    rows={5}
                    placeholder="Describe what happened. Include relevant details, but avoid retaliation or insults."
                    required
                  />
                </label>
              </>
            )}

            <div className="report-form-row report-form-row-two report-context-inputs">
              <label>
                Battle ID <span>optional</span>
                <input
                  value={battleId}
                  onChange={(event) => setBattleId(event.target.value)}
                  placeholder="Auto-filled from battles when available"
                />
              </label>

              <label>
                Page URL <span>auto-filled</span>
                <input
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  placeholder="Current page"
                />
              </label>
            </div>

            {message && <p className="report-success-message">{message}</p>}
            {error && <p className="report-error-message">{error}</p>}

            <div className="report-submit-row">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || (reportType === "player" && !canSubmitPlayerReport)}
              >
                {submitting ? "Submitting" : "Submit Report"}
              </button>
              <span>
                Reports are private and only visible from the backend.
              </span>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
