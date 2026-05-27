"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
];

export default function SubmitSamplePage() {
  const router = useRouter();

  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmitSample = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!sampleFile) {
      setErrorMsg("Please choose an audio file first.");
      return;
    }

    if (!ACCEPTED_AUDIO_TYPES.includes(sampleFile.type)) {
      setErrorMsg("Please upload an MP3, WAV, AIFF, FLAC, or M4A file.");
      return;
    }

    const maxFileSize = 50 * 1024 * 1024; // 50 MB

    if (sampleFile.size > maxFileSize) {
      setErrorMsg("Please keep sample files under 50 MB.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("You must be logged in to submit a sample.");
        setUploading(false);
        return;
      }

      const safeFileName = sampleFile.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-");

      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("sample-submissions")
        .upload(filePath, sampleFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: sampleFile.type,
        });

      if (uploadError) {
        console.error("Sample upload error:", uploadError);
        setErrorMsg(uploadError.message || "Failed to upload sample.");
        setUploading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("sample_submissions")
        .insert({
          user_id: user.id,
          file_path: filePath,
          original_filename: sampleFile.name,
          status: "pending",
          notes: notes.trim() || null,
        });

      if (insertError) {
        console.error("Sample metadata insert error:", insertError);
        setErrorMsg(insertError.message || "Failed to save sample submission.");
        setUploading(false);
        return;
      }

      setSampleFile(null);
      setNotes("");
      setSuccessMsg("Sample submitted. It is now pending review.");
    } catch (err: any) {
      console.error("Unexpected sample submission error:", err);
      setErrorMsg(err.message || "Something went wrong submitting the sample.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="page-inner" style={{ paddingTop: 72, paddingBottom: 96 }}>
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        Community samples · review queue
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: "clamp(3.5rem, 8vw, 7rem)",
          lineHeight: 0.86,
          letterSpacing: "-0.075em",
          fontWeight: 800,
          color: "var(--text)",
        }}
      >
        Submit a
        <br />
        Sample
      </h1>

      <p
        className="page-description"
        style={{
          maxWidth: 680,
          marginTop: 24,
          color: "var(--muted)",
          fontSize: "1rem",
          lineHeight: 1.75,
        }}
      >
        Upload a short audio sample for review. If approved, it may be used in
        future FL Battles.
      </p>

      <div
        className="card"
        style={{
          maxWidth: 760,
          marginTop: 34,
          padding: 26,
          overflow: "hidden",
        }}
      >
        <span className="card-number">01</span>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <p className="panel-label" style={{ margin: 0 }}>
            Upload sample
          </p>

          <span className="sample-badge">Pending Review</span>
        </div>

        <form
          onSubmit={handleSubmitSample}
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gap: 16,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 8,
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            <span
              style={{
                color: "var(--muted)",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Audio file
            </span>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
              style={{
                width: "100%",
                padding: "13px 12px",
                border: "1px solid var(--line-bright)",
                background: "rgba(5, 5, 5, 0.85)",
                color: "var(--text)",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 8,
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            <span
              style={{
                color: "var(--muted)",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Notes, optional
            </span>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add tempo, key, vibe, or anything you want the reviewer to know."
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "13px 12px",
                border: "1px solid var(--line-bright)",
                background: "rgba(5, 5, 5, 0.85)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </label>

          {errorMsg && (
            <p
              style={{
                margin: 0,
                color: "#ffd4ca",
                border: "1px solid rgba(255, 77, 28, 0.45)",
                background: "rgba(255, 77, 28, 0.075)",
                fontSize: "0.9rem",
                fontWeight: 700,
                lineHeight: 1.45,
                padding: "10px 12px",
              }}
            >
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p
              style={{
                margin: 0,
                color: "#d8ffd1",
                border: "1px solid rgba(119, 255, 102, 0.35)",
                background: "rgba(119, 255, 102, 0.07)",
                fontSize: "0.9rem",
                fontWeight: 700,
                lineHeight: 1.45,
                padding: "10px 12px",
              }}
            >
              {successMsg}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? "Submitting..." : "Submit Sample"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/battles")}
              disabled={uploading}
            >
              Back to Battles
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}