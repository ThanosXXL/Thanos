import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Trash2, ChevronLeft, ChevronRight, Camera, Cloud, Shield, GraduationCap, BookOpen, Check, Star, Scissors, Video, VideoOff, Mic, MicOff, X, Users, FileUp, ToggleLeft, ToggleRight, Send, MessageSquare, ArrowLeft, UsersRound, Folder, CalendarDays, ClipboardCheck, Layers } from "lucide-react";

// --- Design tokens: warmer Sandton / Beige-Creme + weiches Dunkelrot ---
const SAND = "#EDE0C7";        // App-Hintergrund
const SAND_DEEP = "#E3D2AC";   // Sidebar / Panels
const SAND_LINE = "#C9B587";   // Trennlinien / Rahmen
const INK = "#332A1B";         // Fließtext auf Sand
const REDINK = "#A3453C";      // weiches Dunkelrot - Headlines & "wichtig"-Markierung
const SLIDE_BG = "#FFFFFF";    // Hintergrund der Folienfläche
const SLIDE_TEXT = "#111111";  // Schwarze Schrift auf der Folienfläche

const STORAGE_KEY = "lernapp-deck-v2";

function useDeck() {
  const [deck, setDeck] = useState({ title: "Grundlagen der Statik", slides: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (!cancelled && res && res.value) {
          setDeck(JSON.parse(res.value));
        }
      } catch (e) {
        // noch kein Deck gespeichert
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next) => {
    setDeck(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), true);
    } catch (e) {
      console.error("Speichern fehlgeschlagen", e);
    }
  }, []);

  return { deck, persist, loaded };
}

function useSharedState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(key, true);
        if (!cancelled && res && res.value) setValue(JSON.parse(res.value));
      } catch (e) {
        // noch nichts gespeichert
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const persist = async (next) => {
    setValue(next);
    try {
      await window.storage.set(key, JSON.stringify(next), true);
    } catch (e) {
      // Speichern fehlgeschlagen
    }
  };

  return { value, persist, loaded };
}

function Flash({ trigger }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 220);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!show) return null;
  return <div style={{ position: "absolute", inset: 0, background: "white", opacity: 0.85, pointerEvents: "none" }} />;
}

export default function LernApp() {
  const { deck, persist, loaded } = useDeck();
  const [role, setRole] = useState("lernender");
  const [index, setIndex] = useState(0);
  const [flashTick, setFlashTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const slideRef = useRef(null);
  const canvasRef = useRef(null);

  const isEditor = role === "admin" || role === "dozent";
  const current = deck.slides[index];

  const [activeSection, setActiveSection] = useState("folien"); // folien | hausaufgaben | kalender

  const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  // --- Ordner 1: Hausaufgaben ---
  const { value: homework, persist: persistHomework, loaded: hwLoaded } = useSharedState("lernapp-hausaufgaben-v1", []);
  const hwFileInputRef = useRef(null);
  const hwCorrectInputRef = useRef({});
  const [hwPendingCorrectId, setHwPendingCorrectId] = useState(null);
  const [hwFeedback, setHwFeedback] = useState("");

  const submitHomework = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = {
      id: `hw${Date.now()}`,
      participant: "Ich",
      fileName: file.name,
      submittedDate: new Date().toISOString().slice(0, 10),
      status: "eingereicht",
      feedback: "",
      correctedFileName: null,
    };
    persistHomework([entry, ...homework]);
    showToast("Hausaufgabe eingereicht");
    e.target.value = "";
  };

  const openCorrection = (id) => {
    setHwPendingCorrectId(id);
    setHwFeedback("");
  };

  const returnHomework = (id, correctedFile) => {
    const next = homework.map((h) => h.id === id ? { ...h, status: "korrigiert", feedback: hwFeedback, correctedFileName: correctedFile?.name || h.correctedFileName || null } : h);
    persistHomework(next);
    setHwPendingCorrectId(null);
    showToast("Hausaufgabe korrigiert und zurückgegeben");
  };

  // --- Ordner 2: Kalender für Tests/Prüfungen ---
  const { value: examEvents, persist: persistExams, loaded: examLoaded } = useSharedState("lernapp-kalender-v1", []);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");

  const addExam = () => {
    if (!examTitle.trim() || !examDate) return;
    const entry = { id: `ex${Date.now()}`, title: examTitle.trim(), date: examDate, time: examTime || "—" };
    persistExams([...examEvents, entry].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    setExamTitle(""); setExamDate(""); setExamTime("");
    showToast("Termin gespeichert");
  };

  const formatExamDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const removeExam = (id) => {
    persistExams(examEvents.filter((e) => e.id !== id));
  };

  useEffect(() => {
    if (index >= deck.slides.length) setIndex(Math.max(0, deck.slides.length - 1));
  }, [deck.slides.length]); // eslint-disable-line

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2400);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    const readAsDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    try {
      const newSlides = [];
      for (const f of files) {
        const dataUrl = await readAsDataUrl(f);
        newSlides.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          src: dataUrl,
          name: f.name,
          headline: f.name.replace(/\.[^.]+$/, ""),
          important: false,
        });
      }
      const next = { ...deck, slides: [...deck.slides, ...newSlides] };
      await persist(next);
      showToast(`${newSlides.length} Folie(n) hinzugefügt`);
    } finally {
      setUploading(false);
    }
  };

  const removeSlide = async (id) => {
    const next = { ...deck, slides: deck.slides.filter((s) => s.id !== id) };
    await persist(next);
  };

  const updateSlide = async (id, patch) => {
    const next = { ...deck, slides: deck.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    await persist(next);
  };

  const toggleImportant = (id, e) => {
    e.stopPropagation();
    const s = deck.slides.find((x) => x.id === id);
    if (s) updateSlide(id, { important: !s.important });
  };

  const renameDeck = async (title) => {
    await persist({ ...deck, title });
  };

  const takeScreenshot = () => {
    if (!current) return;
    const img = slideRef.current?.querySelector("img");
    if (!img) return;
    const canvas = canvasRef.current;
    const w = img.naturalWidth || 1280;
    const h = img.naturalHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    setFlashTick((t) => t + 1);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(current.name || "folie").replace(/\.[^.]+$/, "")}-screenshot.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Screenshot gespeichert (Download)");
    }, "image/png");
  };

  const takeSniping = () => {
    if (!current) return;
    setFlashTick((t) => t + 1);
    showToast("Bereich markieren — Sniping-Auswahl aktiv");
  };

  const saveToDrive = () => {
    if (!current) return;
    // Echte Google-Drive-Anbindung erfordert OAuth 2.0 + Google-Cloud-Projekt (siehe Konzeptdokument).
    // Dieser Prototyp lädt lokal herunter und öffnet Google Drive zum Hochladen.
    const a = document.createElement("a");
    a.href = current.src;
    a.download = current.name || "folie.png";
    a.click();
    window.open("https://drive.google.com/drive/my-drive", "_blank", "noopener,noreferrer");
    showToast("Datei heruntergeladen — Google Drive geöffnet zum Hochladen");
  };

  const [videoChatOpen, setVideoChatOpen] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [allMuted, setAllMuted] = useState(false);
  const [handsRaised, setHandsRaised] = useState({ Anna: true });
  const [individualUnmuted, setIndividualUnmuted] = useState({});

  const raiseHand = () => {
    setHandsRaised((prev) => ({ ...prev, Ich: true }));
    showToast("Du hast dich gemeldet");
  };

  const unlockToSpeak = (name) => {
    if (!isEditor) return;
    setHandsRaised((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setIndividualUnmuted((prev) => ({ ...prev, [name]: true }));
    showToast(`${name} freigeschaltet — kann jetzt für alle sprechen`);
  };

  const remuteIndividually = (name) => {
    if (!isEditor) return;
    setIndividualUnmuted((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };
  const myAudioOn = isEditor ? audioOn : audioOn && (!allMuted || !!individualUnmuted.Ich);

  const toggleAllMuted = () => {
    setAllMuted((v) => {
      const next = !v;
      showToast(next ? "Alle Teilnehmer wurden stummgeschaltet" : "Stummschaltung für alle aufgehoben");
      return next;
    });
  };
  const [shareEnabled, setShareEnabled] = useState(true);
  const [pendingShareFile, setPendingShareFile] = useState(null);
  const [shareTarget, setShareTarget] = useState("alle");
  const shareFileInputRef = useRef(null);

  const openShareFile = () => {
    if (!shareEnabled) return;
    shareFileInputRef.current?.click();
  };

  const handleShareFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (file) setPendingShareFile(file.name);
    e.target.value = "";
  };

  const confirmShare = () => {
    if (!pendingShareFile) return;
    showToast(`„${pendingShareFile}“ geteilt mit ${shareTarget === "alle" ? "allen Teilnehmern" : "Dozent"}`);
    setPendingShareFile(null);
  };

  const teilnehmerListe = ["Dozent", "Anna", "Max", "Lea"];
  const [chatPanel, setChatPanel] = useState(null); // null | "liste" | "chat"
  const [groupMode, setGroupMode] = useState(false);
  const [groupSelection, setGroupSelection] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { name } oder { group: [...] }
  const [chats, setChats] = useState({}); // key -> [{from, text}]
  const [draft, setDraft] = useState("");

  const chatKey = (chat) => chat ? (chat.group ? `Gruppe: ${chat.group.join(", ")}` : chat.name) : "";

  const openSingleChat = (name) => {
    setActiveChat({ name });
    setChatPanel("chat");
  };

  const toggleGroupPerson = (name) => {
    setGroupSelection((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const startGroupChat = () => {
    if (groupSelection.length === 0) return;
    setActiveChat({ group: groupSelection });
    setChatPanel("chat");
  };

  const sendMessage = () => {
    if (!draft.trim() || !activeChat) return;
    const key = chatKey(activeChat);
    setChats((prev) => ({ ...prev, [key]: [...(prev[key] || []), { from: "Ich", text: draft.trim() }] }));
    setDraft("");
  };

  const [hasJoined, setHasJoined] = useState(false);
  const [classMessages, setClassMessages] = useState([
    { from: "Anna", text: "Kann man das nochmal langsamer erklären?" },
    { from: "Dozent", text: "Klar, ich wiederhole den letzten Punkt." },
  ]);
  const [classDraft, setClassDraft] = useState("");

  const liveParticipants = [
    { name: "Dozent", video: true, audioOn: true },
    { name: "Anna", video: true, audioOn: !allMuted || !!individualUnmuted.Anna },
    { name: "Max", video: false, audioOn: !allMuted || !!individualUnmuted.Max },
    { name: "Lea", video: true, audioOn: !allMuted || !!individualUnmuted.Lea },
    ...(hasJoined ? [{ name: "Ich", video: videoOn, audioOn: myAudioOn }] : []),
  ];

  const joinClass = () => {
    setHasJoined(true);
    setVideoChatOpen(true);
    showToast("Am Videochat angemeldet — Unterricht wird beigetreten");
  };

  const sendClassMessage = () => {
    if (!classDraft.trim()) return;
    setClassMessages((prev) => [...prev, { from: "Ich", text: classDraft.trim() }]);
    setClassDraft("");
  };

  return (
    <div style={{ minHeight: "100vh", background: SAND, fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", color: INK, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        ::selection { background: ${REDINK}; color: #fff; }
        input::placeholder { color: ${INK}; opacity: 0.4; }
      `}</style>

      {/* Header */}
      <header style={{ padding: "18px 24px", borderBottom: `1px solid ${SAND_LINE}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: SAND_DEEP }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'IBM Plex Serif', serif", fontWeight: 700, fontSize: 22, letterSpacing: 0.2, color: REDINK }}>IT Schulungsmaßnahmen</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>Foliensätze zum Lernen</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["lernender", "dozent", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                border: `1px solid ${role === r ? REDINK : SAND_LINE}`,
                background: role === r ? "rgba(163,69,60,0.12)" : "transparent",
                color: role === r ? REDINK : INK,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {r === "admin" && <Shield size={13} />}
              {r === "dozent" && <BookOpen size={13} />}
              {r === "lernender" && <GraduationCap size={13} />}
              {r === "admin" ? "Admin" : r === "dozent" ? "Dozent" : "Lernender"}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "270px 1fr", gap: 0 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: `1px solid ${SAND_LINE}`, background: SAND_DEEP, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setActiveSection("folien")} style={{ display: "flex", alignItems: "center", gap: 8, background: activeSection === "folien" ? "rgba(163,69,60,0.14)" : "transparent", border: `1px solid ${activeSection === "folien" ? REDINK : SAND_LINE}`, color: activeSection === "folien" ? REDINK : INK, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 600 }}>
              <Layers size={14} /> Foliensatz
            </button>
            <button onClick={() => setActiveSection("hausaufgaben")} style={{ display: "flex", alignItems: "center", gap: 8, background: activeSection === "hausaufgaben" ? "rgba(163,69,60,0.14)" : "transparent", border: `1px solid ${activeSection === "hausaufgaben" ? REDINK : SAND_LINE}`, color: activeSection === "hausaufgaben" ? REDINK : INK, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 600 }}>
              <Folder size={14} /> Ordner: Hausaufgaben
            </button>
            <button onClick={() => setActiveSection("kalender")} style={{ display: "flex", alignItems: "center", gap: 8, background: activeSection === "kalender" ? "rgba(163,69,60,0.14)" : "transparent", border: `1px solid ${activeSection === "kalender" ? REDINK : SAND_LINE}`, color: activeSection === "kalender" ? REDINK : INK, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 600 }}>
              <Folder size={14} /> Ordner: Prüfungskalender
            </button>
          </div>
          <div style={{ borderTop: `1px solid ${SAND_LINE}`, paddingTop: 12 }} />

          {activeSection === "folien" && <>
          {isEditor ? (
            <input
              value={deck.title}
              onChange={(e) => renameDeck(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${SAND_LINE}`, color: REDINK, fontFamily: "'IBM Plex Serif', serif", fontWeight: 700, fontSize: 16, padding: "4px 0", outline: "none" }}
            />
          ) : (
            <h2 style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 16, margin: 0, color: REDINK }}>{deck.title}</h2>
          )}
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: -8 }}>
            {deck.slides.length} Folie{deck.slides.length === 1 ? "" : "n"} · {deck.slides.filter((s) => s.important).length} wichtig markiert
          </div>

          {isEditor && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: REDINK, color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, fontSize: 13, opacity: uploading ? 0.6 : 1 }}
              >
                <Upload size={15} /> {uploading ? "Lädt hoch…" : "Folien hochladen"}
              </button>
            </>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 460 }}>
            {deck.slides.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setIndex(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: 6,
                  border: `1px solid ${i === index ? REDINK : SAND_LINE}`,
                  borderRadius: 6, cursor: "pointer",
                  background: i === index ? "rgba(163,69,60,0.08)" : "#F7EFDC",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, width: 16, textAlign: "center", color: s.important ? REDINK : INK, opacity: s.important ? 1 : 0.5 }}>
                  {i + 1}
                </span>
                <img src={s.src} alt="" style={{ width: 40, height: 27, objectFit: "cover", borderRadius: 3, flexShrink: 0, border: `1px solid ${SAND_LINE}` }} />
                <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, opacity: 0.85 }}>{s.headline || s.name}</span>
                <button
                  onClick={(e) => toggleImportant(s.id, e)}
                  title="Für die Prüfung markieren"
                  style={{ background: "transparent", border: "none", color: s.important ? REDINK : INK, opacity: s.important ? 1 : 0.35, padding: 2 }}
                >
                  <Star size={13} fill={s.important ? REDINK : "none"} />
                </button>
                {isEditor && (
                  <button onClick={(e) => { e.stopPropagation(); removeSlide(s.id); }} style={{ background: "transparent", border: "none", color: INK, opacity: 0.4, padding: 2 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {deck.slides.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.5, padding: "20px 4px", textAlign: "center" }}>
                {isEditor ? "Noch keine Folien — lade den ersten Satz hoch." : "Der Dozent hat noch keine Folien bereitgestellt."}
              </div>
            )}
          </div>

          <div style={{ fontSize: 10.5, opacity: 0.55, lineHeight: 1.5, marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${SAND_LINE}` }}>
            <Star size={10} fill={REDINK} style={{ verticalAlign: -1, marginRight: 4 }} color={REDINK} />
            markiert = wichtig für die Prüfung
          </div>
          </>}
        </aside>

        {/* Main viewer */}
        <section style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, position: "relative" }}>
          {activeSection === "folien" && (!isEditor && !hasJoined ? (
            <div style={{ textAlign: "center", maxWidth: 340, background: "#fff", border: `1px solid ${SAND_LINE}`, borderRadius: 12, padding: 28 }}>
              <Video size={26} style={{ marginBottom: 10, color: REDINK }} />
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>Anmeldung erforderlich</div>
              <div style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 16 }}>
                Um am Unterricht teilzunehmen, meldest du dich zunächst mit Video-Chat an.
              </div>
              <button onClick={joinClass} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: REDINK, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 13 }}>
                <Users size={15} /> Mit Video-Chat anmelden
              </button>
            </div>
          ) : !loaded ? (
            <div style={{ opacity: 0.5, fontSize: 13 }}>Lade…</div>
          ) : current ? (
            <>
              <div style={{ width: "100%", maxWidth: 760, background: SLIDE_BG, borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 34px rgba(51,42,27,0.22)", border: `1px solid ${SAND_LINE}` }}>
                <div style={{ padding: "14px 20px 10px", borderBottom: `1px solid #EEE6D2` }}>
                  {isEditor ? (
                    <input
                      value={current.headline}
                      onChange={(e) => updateSlide(current.id, { headline: e.target.value })}
                      style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: REDINK, fontFamily: "'IBM Plex Serif', serif", fontWeight: 700, fontSize: 20 }}
                    />
                  ) : (
                    <div style={{ color: REDINK, fontFamily: "'IBM Plex Serif', serif", fontWeight: 700, fontSize: 20 }}>{current.headline}</div>
                  )}
                  <div style={{ color: SLIDE_TEXT, fontSize: 11.5, opacity: 0.55, marginTop: 2 }}>{current.name}</div>
                </div>
                <div ref={slideRef} style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: SLIDE_BG }}>
                  <img src={current.src} alt={current.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  <Flash trigger={flashTick} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} style={{ background: "transparent", border: `1px solid ${SAND_LINE}`, color: INK, borderRadius: 8, padding: 8, opacity: index === 0 ? 0.3 : 1 }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", minWidth: 70, textAlign: "center" }}>
                  <span style={{ color: current.important ? REDINK : INK, fontWeight: current.important ? 700 : 400 }}>{index + 1}</span>
                  <span style={{ opacity: 0.5 }}> / {deck.slides.length}</span>
                </span>
                <button onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))} disabled={index === deck.slides.length - 1} style={{ background: "transparent", border: `1px solid ${SAND_LINE}`, color: INK, borderRadius: 8, padding: 8, opacity: index === deck.slides.length - 1 ? 0.3 : 1 }}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={(e) => toggleImportant(current.id, e)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: current.important ? REDINK : "transparent", border: `1px solid ${REDINK}`, color: current.important ? "#fff" : REDINK, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}
                >
                  <Star size={15} fill={current.important ? "#fff" : "none"} /> {current.important ? "Für Prüfung markiert" : "Für Prüfung markieren"}
                </button>
                <button onClick={takeScreenshot} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: `1px solid ${SAND_LINE}`, color: INK, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}>
                  <Camera size={15} /> Screenshot
                </button>
                <button onClick={takeSniping} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: `1px solid ${SAND_LINE}`, color: INK, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}>
                  <Scissors size={15} /> Sniping
                </button>
                <button onClick={saveToDrive} style={{ display: "flex", alignItems: "center", gap: 8, background: INK, border: "none", color: SAND, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}>
                  <Cloud size={15} /> In Google Drive speichern
                </button>
                <button onClick={() => setVideoChatOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: `1px solid ${REDINK}`, color: REDINK, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}>
                  <Users size={15} /> Video-Chat öffnen
                </button>
                <button onClick={() => !allMuted || isEditor ? setAudioOn((v) => !v) : null} disabled={allMuted && !isEditor} style={{ display: "flex", alignItems: "center", gap: 8, background: myAudioOn ? "transparent" : REDINK, border: `1px solid ${REDINK}`, color: myAudioOn ? REDINK : "#fff", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, opacity: allMuted && !isEditor ? 0.55 : 1 }}>
                  {myAudioOn ? <Mic size={15} /> : <MicOff size={15} />} Audio {myAudioOn ? "an" : "aus"}{allMuted && !isEditor ? " (vom Dozent stumm geschaltet)" : ""}
                </button>
                <button onClick={() => setVideoOn((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: videoOn ? "transparent" : REDINK, border: `1px solid ${REDINK}`, color: videoOn ? REDINK : "#fff", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13 }}>
                  {videoOn ? <Video size={15} /> : <VideoOff size={15} />} Video {videoOn ? "an" : "aus"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", opacity: 0.6, maxWidth: 320 }}>
              <BookOpen size={28} style={{ marginBottom: 10, color: REDINK }} />
              <div style={{ fontSize: 13 }}>{isEditor ? "Lade Folien über den Button links hoch, um zu starten." : "Sobald der Dozent Folien hochlädt, erscheinen sie hier."}</div>
            </div>
          ))}

          {activeSection === "hausaufgaben" && (
            <div style={{ width: "100%", maxWidth: 560 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <ClipboardCheck size={18} color={REDINK} />
                <h2 style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 17, margin: 0, color: REDINK }}>Ordner: Hausaufgaben</h2>
              </div>

              {!isEditor && (
                <div style={{ marginBottom: 18 }}>
                  <input ref={hwFileInputRef} type="file" hidden onChange={submitHomework} />
                  <button onClick={() => hwFileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, background: REDINK, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
                    <Upload size={15} /> Hausaufgabe einreichen
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!hwLoaded && <div style={{ fontSize: 12.5, opacity: 0.5 }}>Lade…</div>}
                {hwLoaded && homework.length === 0 && (
                  <div style={{ fontSize: 12.5, opacity: 0.5, textAlign: "center", padding: 20 }}>Noch keine Hausaufgaben eingereicht.</div>
                )}
                {homework.map((h) => (
                  <div key={h.id} style={{ background: "#fff", border: `1px solid ${SAND_LINE}`, borderRadius: 10, padding: 14, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{h.fileName}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: "#fff", background: h.status === "korrigiert" ? "#4E8D5C" : REDINK }}>
                        {h.status === "korrigiert" ? "Korrigiert & zurückgegeben" : "Eingereicht"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.6 }}>Von {h.participant} · {h.submittedDate}</div>
                    {h.feedback && <div style={{ fontSize: 12, marginTop: 6, background: "#F7EFDC", borderRadius: 6, padding: "6px 8px" }}>„{h.feedback}“</div>}
                    {h.correctedFileName && <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.7 }}>Korrigierte Datei: {h.correctedFileName}</div>}

                    {isEditor && h.status !== "korrigiert" && (
                      hwPendingCorrectId === h.id ? (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          <textarea value={hwFeedback} onChange={(e) => setHwFeedback(e.target.value)} rows={2} placeholder="Rückmeldung zur Hausaufgabe…" style={{ border: `1px solid ${SAND_LINE}`, borderRadius: 6, padding: 8, fontSize: 12.5, outline: "none", resize: "vertical" }} />
                          <input type="file" ref={(el) => (hwCorrectInputRef.current[h.id] = el)} hidden onChange={(e) => returnHomework(h.id, e.target.files?.[0])} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => hwCorrectInputRef.current[h.id]?.click()} style={{ display: "flex", alignItems: "center", gap: 6, background: "#4E8D5C", color: "#fff", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700 }}>
                              <Upload size={13} /> Korrigierte Datei & zurückgeben
                            </button>
                            <button onClick={() => returnHomework(h.id, null)} style={{ background: "transparent", border: `1px solid ${SAND_LINE}`, borderRadius: 7, padding: "7px 12px", fontSize: 12 }}>
                              Nur Rückmeldung senden
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openCorrection(h.id)} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${REDINK}`, color: REDINK, borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
                          <ClipboardCheck size={13} /> Verbessern & zurückgeben
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "kalender" && (
            <div style={{ width: "100%", maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <CalendarDays size={18} color={REDINK} />
                <h2 style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 17, margin: 0, color: REDINK }}>Ordner: Prüfungskalender</h2>
              </div>

              {isEditor && (
                <div style={{ background: "#fff", border: `1px solid ${SAND_LINE}`, borderRadius: 10, padding: 14, marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Titel, z. B. Zwischentest Statik" style={{ border: `1px solid ${SAND_LINE}`, borderRadius: 6, padding: 8, fontSize: 12.5, outline: "none" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{ flex: 1, border: `1px solid ${SAND_LINE}`, borderRadius: 6, padding: 8, fontSize: 12.5, outline: "none" }} />
                    <input type="time" value={examTime} onChange={(e) => setExamTime(e.target.value)} style={{ flex: 1, border: `1px solid ${SAND_LINE}`, borderRadius: 6, padding: 8, fontSize: 12.5, outline: "none" }} />
                  </div>
                  <button onClick={addExam} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: REDINK, color: "#fff", border: "none", borderRadius: 7, padding: "9px 14px", fontSize: 12.5, fontWeight: 700 }}>
                    <CalendarDays size={14} /> Termin hinzufügen
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!examLoaded && <div style={{ fontSize: 12.5, opacity: 0.5 }}>Lade…</div>}
                {examLoaded && examEvents.length === 0 && (
                  <div style={{ fontSize: 12.5, opacity: 0.5, textAlign: "center", padding: 20 }}>Noch keine Termine eingetragen.</div>
                )}
                {examEvents.map((ev) => (
                  <div key={ev.id} style={{ background: "#fff", border: `1px solid ${SAND_LINE}`, borderRadius: 10, padding: 14, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: REDINK }}>{ev.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{formatExamDate(ev.date)} · {ev.time} Uhr</div>
                    </div>
                    {isEditor && (
                      <button onClick={() => removeExam(ev.id)} style={{ background: "transparent", border: "none", color: INK, opacity: 0.4 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </section>
      </main>

      {videoChatOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(51,42,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ width: "min(760px, 96vw)", background: "#1E1912", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid #3A3020` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: SAND, fontWeight: 700, fontSize: 14 }}>
                <Users size={16} color={REDINK} /> Live-Unterricht
              </div>
              <button onClick={() => setVideoChatOpen(false)} style={{ background: "transparent", border: "none", color: SAND, opacity: 0.7 }}>
                <X size={18} />
              </button>
            </div>

            {/* Teilnehmer-Streifen: kleine Live-Video-Kacheln mit Namen */}
            <div style={{ padding: "12px 18px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                {liveParticipants.map((p) => (
                  <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#2A2318", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", border: `1px solid #3A3020` }}>
                      {p.video ? (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: REDINK, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11 }}>
                          {p.name[0]}
                        </div>
                      ) : (
                        <VideoOff size={16} color={SAND} style={{ opacity: 0.4 }} />
                      )}
                      <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#4EAE6B", border: "1px solid #1E1912" }} />
                      {handsRaised[p.name] && (
                        <button
                          onClick={() => unlockToSpeak(p.name)}
                          title={isEditor ? "Freischalten zum Sprechen" : "Hat sich gemeldet"}
                          style={{ position: "absolute", top: -4, left: -4, width: 16, height: 16, borderRadius: "50%", background: "#D9A227", border: "1px solid #1E1912", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: isEditor ? "pointer" : "default" }}
                        >
                          <span style={{ fontSize: 9 }}>✋</span>
                        </button>
                      )}
                      {!handsRaised[p.name] && allMuted && individualUnmuted[p.name] && p.name !== "Dozent" && (
                        <button
                          onClick={() => remuteIndividually(p.name)}
                          title={isEditor ? "Freischaltung zurücknehmen" : "Darf gerade sprechen"}
                          style={{ position: "absolute", top: -4, left: -4, width: 16, height: 16, borderRadius: "50%", background: "#4E8D5C", border: "1px solid #1E1912", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: isEditor ? "pointer" : "default" }}
                        >
                          <Mic size={9} color="#fff" />
                        </button>
                      )}
                      {!p.audioOn && (
                        <span style={{ position: "absolute", bottom: -3, right: -3, width: 15, height: 15, borderRadius: "50%", background: REDINK, border: "1px solid #1E1912", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <MicOff size={9} color="#fff" />
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: SAND, opacity: 0.8, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: SAND, opacity: 0.55 }}>{liveParticipants.length} Teilnehmer live{allMuted ? " · alle stummgeschaltet" : ""}</span>
                {isEditor && (
                  <button onClick={toggleAllMuted} style={{ display: "flex", alignItems: "center", gap: 6, background: allMuted ? REDINK : "transparent", border: `1px solid ${REDINK}`, color: allMuted ? "#fff" : REDINK, borderRadius: 999, padding: "4px 10px", fontSize: 11 }}>
                    {allMuted ? <MicOff size={12} /> : <Mic size={12} />} {allMuted ? "Stummschaltung aufheben" : "Alle stumm schalten"}
                  </button>
                )}
              </div>
            </div>

            {/* Video links, Klassenchat rechts */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, padding: 18 }}>
              <div style={{ aspectRatio: "4/3", background: "#2A2318", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, position: "relative" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: REDINK, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>
                  D
                </div>
                <span style={{ color: SAND, fontSize: 12.5, opacity: 0.9 }}>Übertragung — Dozent</span>
              </div>

              <div style={{ background: "#2A2318", borderRadius: 10, display: "flex", flexDirection: "column", height: "100%", minHeight: 200 }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid #3A3020`, fontSize: 11.5, color: SAND, opacity: 0.75 }}>
                  Klassenchat — Fragen &amp; Hinweise (z. B. Pause)
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {classMessages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.from === "Ich" ? "flex-end" : "flex-start", background: m.from === "Ich" ? REDINK : "#3A3020", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 11.5, maxWidth: "85%" }}>
                      {m.from !== "Ich" && <div style={{ fontSize: 9.5, opacity: 0.7, marginBottom: 1 }}>{m.from}</div>}
                      {m.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
                  <input
                    value={classDraft}
                    onChange={(e) => setClassDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendClassMessage()}
                    placeholder="z. B. „Kurze Pause?“"
                    style={{ flex: 1, background: "#1E1912", border: `1px solid #3A3020`, borderRadius: 7, padding: "6px 8px", color: SAND, fontSize: 11.5, outline: "none" }}
                  />
                  <button onClick={sendClassMessage} style={{ background: REDINK, border: "none", borderRadius: 7, padding: "0 10px", color: "#fff" }}>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "4px 18px 20px" }}>
              <button onClick={() => !allMuted || isEditor ? setAudioOn((v) => !v) : null} disabled={allMuted && !isEditor} title={allMuted && !isEditor ? "Vom Dozent stummgeschaltet" : ""} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: myAudioOn ? "#3A3020" : REDINK, color: "#fff", opacity: allMuted && !isEditor ? 0.55 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {myAudioOn ? <Mic size={17} /> : <MicOff size={17} />}
              </button>
              <button onClick={() => setVideoOn((v) => !v)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: videoOn ? "#3A3020" : REDINK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {videoOn ? <Video size={17} /> : <VideoOff size={17} />}
              </button>
              {!isEditor && (
                <button onClick={raiseHand} disabled={!!handsRaised.Ich} title="Melden — z. B. für eine Frage" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: handsRaised.Ich ? "#D9A227" : "#3A3020", color: "#fff", opacity: handsRaised.Ich ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  ✋
                </button>
              )}
              <button onClick={openShareFile} disabled={!shareEnabled} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "#3A3020", color: "#fff", opacity: shareEnabled ? 1 : 0.35, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileUp size={17} />
              </button>
              <button onClick={() => { setChatPanel(chatPanel ? null : "liste"); setActiveChat(null); }} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: chatPanel ? REDINK : "#3A3020", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={17} />
              </button>
              <button onClick={() => setVideoChatOpen(false)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: REDINK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={17} />
              </button>
            </div>

            <div style={{ borderTop: `1px solid #3A3020`, padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => setShareEnabled((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: SAND, fontSize: 12.5, opacity: 0.9, alignSelf: "flex-start" }}>
                {shareEnabled ? <ToggleRight size={22} color={REDINK} /> : <ToggleLeft size={22} color="#6B6047" />}
                Dateifreigabe {shareEnabled ? "eingeschaltet" : "ausgeschaltet"}
              </button>

              <input ref={shareFileInputRef} type="file" hidden onChange={handleShareFileChosen} />

              {shareEnabled && (
                <button onClick={openShareFile} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#2A2318", border: `1px solid #3A3020`, color: SAND, borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600 }}>
                  <FileUp size={14} /> Datei aus Ordner öffnen
                </button>
              )}

              {pendingShareFile && (
                <div style={{ background: "#2A2318", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: SAND, opacity: 0.85 }}>Datei: {pendingShareFile}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setShareTarget("dozent")} style={{ flex: 1, fontSize: 11.5, padding: "6px 8px", borderRadius: 6, border: `1px solid ${shareTarget === "dozent" ? REDINK : "#3A3020"}`, background: shareTarget === "dozent" ? "rgba(163,69,60,0.25)" : "transparent", color: SAND }}>
                      Nur Dozent
                    </button>
                    <button onClick={() => setShareTarget("alle")} style={{ flex: 1, fontSize: 11.5, padding: "6px 8px", borderRadius: 6, border: `1px solid ${shareTarget === "alle" ? REDINK : "#3A3020"}`, background: shareTarget === "alle" ? "rgba(163,69,60,0.25)" : "transparent", color: SAND }}>
                      Alle Teilnehmer
                    </button>
                  </div>
                  <button onClick={confirmShare} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: REDINK, border: "none", color: "#fff", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontWeight: 700 }}>
                    <Send size={13} /> Teilen
                  </button>
                </div>
              )}
            </div>

            {chatPanel === "liste" && (
              <div style={{ borderTop: `1px solid #3A3020`, padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: SAND, fontWeight: 700 }}>Privatchat</span>
                  <button onClick={() => { setGroupMode((v) => !v); setGroupSelection([]); }} style={{ display: "flex", alignItems: "center", gap: 6, background: groupMode ? REDINK : "transparent", border: `1px solid ${REDINK}`, color: groupMode ? "#fff" : REDINK, borderRadius: 999, padding: "4px 10px", fontSize: 11.5 }}>
                    <UsersRound size={12} /> Gruppe erstellen
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {teilnehmerListe.map((name) => (
                    <button
                      key={name}
                      onClick={() => groupMode ? toggleGroupPerson(name) : openSingleChat(name)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, background: groupMode && groupSelection.includes(name) ? "rgba(163,69,60,0.25)" : "#2A2318",
                        border: `1px solid ${groupMode && groupSelection.includes(name) ? REDINK : "#3A3020"}`, borderRadius: 8, padding: "8px 10px", color: SAND, fontSize: 12.5,
                      }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: REDINK, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11 }}>
                        {name[0]}
                      </div>
                      {name}
                      {groupMode && groupSelection.includes(name) && <Check size={13} color={REDINK} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>

                {groupMode && (
                  <button onClick={startGroupChat} disabled={groupSelection.length === 0} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: REDINK, border: "none", color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, opacity: groupSelection.length === 0 ? 0.4 : 1 }}>
                    <UsersRound size={14} /> Gruppenchat starten ({groupSelection.length})
                  </button>
                )}
              </div>
            )}

            {chatPanel === "chat" && activeChat && (
              <div style={{ borderTop: `1px solid #3A3020`, display: "flex", flexDirection: "column", height: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderBottom: `1px solid #3A3020` }}>
                  <button onClick={() => setChatPanel("liste")} style={{ background: "transparent", border: "none", color: SAND, opacity: 0.7 }}>
                    <ArrowLeft size={15} />
                  </button>
                  <span style={{ fontSize: 12.5, color: SAND, fontWeight: 700 }}>
                    {activeChat.group ? `Gruppe: ${activeChat.group.join(", ")}` : activeChat.name}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(chats[chatKey(activeChat)] || []).length === 0 && (
                    <div style={{ fontSize: 11.5, color: SAND, opacity: 0.4, textAlign: "center", marginTop: 20 }}>Noch keine Nachrichten.</div>
                  )}
                  {(chats[chatKey(activeChat)] || []).map((m, i) => (
                    <div key={i} style={{ alignSelf: "flex-end", background: REDINK, color: "#fff", borderRadius: 10, padding: "6px 10px", fontSize: 12, maxWidth: "75%" }}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, padding: "10px 18px 16px" }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Nachricht schreiben…"
                    style={{ flex: 1, background: "#2A2318", border: `1px solid #3A3020`, borderRadius: 8, padding: "8px 10px", color: SAND, fontSize: 12.5, outline: "none" }}
                  />
                  <button onClick={sendMessage} style={{ background: REDINK, border: "none", borderRadius: 8, padding: "0 12px", color: "#fff" }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: INK, color: SAND, padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.3)" }}>
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}
