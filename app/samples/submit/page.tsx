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

const SAMPLE_RIGHTS_AGREEMENT =
  "I confirm that I created this sample, own or control all necessary rights to it, and have the legal authority to submit it to FL Battles. I also grant FL Battles permission to review, store, stream, display, and, if approved, make this sample available for use in FL Battles competitions. I understand that I am responsible for the content I upload and that samples containing uncleared third-party material may be rejected or removed.";

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";

  const megabytes = bytes / (1024 * 1024);

  if (megabytes < 1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export default function SubmitSamplePage() {
  const router = useRouter();

  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
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

    if (!rightsConfirmed) {
      setErrorMsg(
        "Please confirm that you own or control the rights to this sample before submitting."
      );
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

          // Rights confirmation record
          rights_confirmed: true,
          rights_confirmed_at: new Date().toISOString(),
          rights_agreement_text: SAMPLE_RIGHTS_AGREEMENT,
        });

      if (insertError) {
        console.error("Sample metadata insert error:", insertError);
        setErrorMsg(insertError.message || "Failed to save sample submission.");
        setUploading(false);
        return;
      }

      setSampleFile(null);
      setNotes("");
      setRightsConfirmed(false);
      setSuccessMsg("Sample submitted. It is now pending review.");
    } catch (err: any) {
      console.error("Unexpected sample submission error:", err);
      setErrorMsg(err.message || "Something went wrong submitting the sample.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="sample-submit-shell">
      <section className="page-inner sample-submit-page">
        <header className="sample-submit-hero">
          <div className="sample-submit-hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Community samples · review queue
            </div>

            <h1 className="sample-submit-title">Submit a sample.</h1>

            <p className="sample-submit-description">
              Upload a short, original audio sample for review. Approved samples
              may appear in future FL Battles.
            </p>
          </div>

          <div className="sample-submit-hero-actions">
            <button
              type="button"
              className="btn-secondary sample-submit-secondary-action"
              onClick={() => router.push("/battles")}
              disabled={uploading}
            >
              Back to Battles
            </button>
          </div>
        </header>

        <div className="sample-submit-grid">
          <form className="sample-submit-card" onSubmit={handleSubmitSample}>
            <div className="sample-submit-card-head">
              <div>
                <p className="sample-submit-kicker">Upload queue</p>
                <h2>Send your sample in for review</h2>
              </div>

              <span className="sample-submit-status-pill">Pending Review</span>
            </div>

            <div className="sample-submit-dropzone-wrap">
              <input
                id="sample-file-input"
                className="sample-submit-file-input"
                type="file"
                accept="audio/*,.mp3,.wav,.aiff,.aif,.flac,.m4a"
                onChange={(event) => {
                  setSampleFile(event.target.files?.[0] ?? null);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                disabled={uploading}
              />

              <label
                htmlFor="sample-file-input"
                className={
                  sampleFile
                    ? "sample-submit-dropzone sample-submit-dropzone-selected"
                    : "sample-submit-dropzone"
                }
              >
                <span className="sample-submit-dropzone-icon">+</span>

                <span className="sample-submit-dropzone-copy">
                  <strong>{sampleFile ? sampleFile.name : "Choose audio file"}</strong>
                  <small>
                    {sampleFile
                      ? `${formatFileSize(sampleFile.size)} · ${sampleFile.type || "audio file"}`
                      : "MP3, WAV, AIFF, FLAC, or M4A · max 50 MB"}
                  </small>
                </span>

                <span className="sample-submit-dropzone-action">
                  {sampleFile ? "Change file" : "Browse"}
                </span>
              </label>

              {sampleFile && (
                <button
                  type="button"
                  className="sample-submit-clear-file"
                  onClick={() => setSampleFile(null)}
                  disabled={uploading}
                >
                  Remove selected file
                </button>
              )}
            </div>

            <label className="sample-submit-field">
              <span>Notes, optional</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add tempo, key, vibe, or anything you want the reviewer to know."
                rows={4}
                disabled={uploading}
              />
            </label>

            <section className="sample-rights-card">
              <div className="sample-rights-row">
                <input
                  id="rights-confirmation"
                  type="checkbox"
                  checked={rightsConfirmed}
                  onChange={(event) => setRightsConfirmed(event.target.checked)}
                  disabled={uploading}
                />

                <label htmlFor="rights-confirmation">
                  <strong>I own or control the rights to this sample.</strong>
                  <span>
                    I created this audio or have permission to submit it for FL
                    Battles review and competition use.
                  </span>
                </label>
              </div>

              <details className="sample-rights-details">
                <summary>Read full submission agreement</summary>
                <p>{SAMPLE_RIGHTS_AGREEMENT}</p>
                <p>
                  Do not upload copyrighted loops, melodies, drums, vocals, or
                  other audio unless you created them yourself or have permission
                  to submit them for this use.
                </p>
              </details>
            </section>

            {errorMsg && <p className="sample-submit-alert sample-submit-alert-error">{errorMsg}</p>}
            {successMsg && <p className="sample-submit-alert sample-submit-alert-success">{successMsg}</p>}

            <div className="sample-submit-footer-actions">
              <button
                type="submit"
                className="btn-primary sample-submit-primary-action"
                disabled={uploading || !rightsConfirmed}
                title={
                  !rightsConfirmed
                    ? "Confirm that you own or control the rights before submitting."
                    : undefined
                }
              >
                {uploading ? "Submitting sample..." : "Submit Sample"}
              </button>
            </div>
          </form>

          <aside className="sample-submit-side-panel" aria-label="Sample submission guidelines">
            <div className="sample-submit-side-head">
              <p className="sample-submit-kicker">Before you submit</p>
              <h2>Make it battle-ready.</h2>
              <p>
                Short, clean, original samples are easiest to approve and use in
                ranked battles.
              </p>
            </div>

            <div className="sample-submit-rule-list">
              <div className="sample-submit-rule">
                <span>01</span>
                <div>
                  <strong>Original audio only</strong>
                  <p>No uncleared loops, vocals, melodies, or ripped content.</p>
                </div>
              </div>

              <div className="sample-submit-rule">
                <span>02</span>
                <div>
                  <strong>Keep it usable</strong>
                  <p>Submit something producers can flip quickly in a timed battle.</p>
                </div>
              </div>

              <div className="sample-submit-rule">
                <span>03</span>
                <div>
                  <strong>Review first</strong>
                  <p>Approved samples can enter the future battle pool.</p>
                </div>
              </div>
            </div>

            <div className="sample-submit-format-card">
              <span>Accepted formats</span>
              <strong>MP3 · WAV · AIFF · FLAC · M4A</strong>
              <small>Maximum file size: 50 MB</small>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
