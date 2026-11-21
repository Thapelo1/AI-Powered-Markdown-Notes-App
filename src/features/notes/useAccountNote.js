import { useEffect, useRef, useState } from "react";
import { LEGACY_NOTE_KEY, logUserEvent, supabase } from "../../lib/supabase.js";

// Read the old browser-only draft so it can be imported deliberately, not silently moved.
function readLegacyNote() {
  try {
    return window.localStorage.getItem(LEGACY_NOTE_KEY) || "";
  } catch {
    return "";
  }
}

export function useAccountNote(session) {
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState("");
  const [noteStatus, setNoteStatus] = useState("loading");
  const [noteError, setNoteError] = useState("");
  const [legacyNote] = useState(readLegacyNote);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const lastSavedNote = useRef(null);

  // Load only the signed-in user's row; the database's RLS policy is the ownership boundary.
  useEffect(() => {
    if (!session) {
      setNote("");
      setSavedNote("");
      setNoteDirty(false);
      setLoadedUserId("");
      lastSavedNote.current = null;
      setNoteStatus("idle");
      setNoteError("");
      setShowImport(false);
      return undefined;
    }

    let cancelled = false;
    const userId = session.user.id;
    setNote("");
    setSavedNote("");
    setNoteDirty(false);
    setLoadedUserId("");
    lastSavedNote.current = null;
    setNoteStatus("loading");
    setNoteError("");

    async function loadNote() {
      const { data, error } = await supabase
        .from("notes")
        .select("content")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setNoteError("Could not load your note. Check your connection and database setup.");
        setNoteStatus("error");
        return;
      }

      setSavedNote(data?.content || "");
      lastSavedNote.current = data?.content ?? null;
      void logUserEvent("note.loaded", { has_note: Boolean(data) });
      // Do not replace an account's remote note with an unrelated browser draft.
      setShowImport(!data && Boolean(legacyNote));
      setLoadedUserId(userId);
      setNoteStatus("saved");
    }

    loadNote().catch((error) => {
      if (cancelled) return;
      console.error("Note load failed:", error);
      setNoteError("Could not load your note. Check your connection and database setup.");
      setNoteStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, legacyNote]);

  // Debounce keystrokes, then serialize writes so a slower older request cannot overwrite a newer draft.
  useEffect(() => {
    const userId = session?.user.id;
    if (
      !userId
      || loadedUserId !== userId
      || importing
      || !noteDirty
      || note === lastSavedNote.current
    ) return undefined;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setNoteStatus("saving");
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          const { error } = await supabase
            .from("notes")
            .upsert({ user_id: userId, content: note }, { onConflict: "user_id" });
          if (error) throw error;
          void logUserEvent("note.saved", { character_count: note.length });
          if (!cancelled) {
            lastSavedNote.current = note;
            setSavedNote(note);
            setNoteDirty(false);
            setNoteError("");
            setNoteStatus("saved");
          }
        } catch (error) {
          if (!cancelled) {
            setNoteError("Could not save your note. Check your connection and try again.");
            setNoteStatus("error");
          }
          console.error("Note save failed:", error);
        }
      });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [note, noteDirty, loadedUserId, session?.user.id, importing]);

  function updateNote(value) {
    setNote(value);
    setNoteDirty(true);
  }

  function restoreSavedNote() {
    setNote(savedNote);
    setNoteDirty(false);
  }

  async function importLegacyNote() {
    if (!session || !legacyNote) return;
    setImporting(true);
    setNoteError("");
    try {
      // Insert rather than upsert so a note created in another tab cannot be overwritten.
      const { error } = await supabase
        .from("notes")
        .insert({ user_id: session.user.id, content: legacyNote });
      if (error) throw error;
      setNote(legacyNote);
      setSavedNote(legacyNote);
      setNoteDirty(false);
      void logUserEvent("note.imported", { character_count: legacyNote.length });
      lastSavedNote.current = legacyNote;
      setShowImport(false);
      setNoteStatus("saved");
      try {
        window.localStorage.removeItem(LEGACY_NOTE_KEY);
      } catch {
        setNoteError("Your note was imported, but its old browser copy could not be removed.");
      }
    } catch (error) {
      console.error("Note import failed:", error);
      setNoteError("Could not import the saved browser note. Your original copy is still on this device.");
    }
    setImporting(false);
  }

  return {
    note,
    setNote: updateNote,
    savedNote,
    restoreSavedNote,
    noteReady: loadedUserId === session?.user.id,
    noteStatus,
    noteError,
    showImport,
    importing,
    importLegacyNote,
  };
}
