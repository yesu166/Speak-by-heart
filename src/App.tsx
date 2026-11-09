import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, CircleHelp, Clock3, Eye, Headphones, Mic, MicOff, MonitorPlay, Play, RotateCcw, Settings2, Sparkles, Users, Volume2, VolumeX, Waves, X } from "lucide-react";
import { Auditorium } from "./scene/Auditorium";
import type { SceneHandle } from "./scene/Auditorium";

type AudienceSize = "Small room" | "Seminar" | "Auditorium";
type Energy = "Supportive" | "Neutral" | "Distracted";
type SessionMode = "desktop" | "vr";

const audienceSizes: { label: AudienceSize; count: string; detail: string }[] = [
  { label: "Small room", count: "12 people", detail: "A relaxed warm-up" },
  { label: "Seminar", count: "48 people", detail: "A familiar classroom" },
  { label: "Auditorium", count: "120 people", detail: "A bigger stage" }
];

export default function App() {
  const sceneRef = useRef<SceneHandle>(null);
  const [audience, setAudience] = useState<AudienceSize>("Seminar");
  const [energy, setEnergy] = useState<Energy>("Supportive");
  const [mode, setMode] = useState<SessionMode>("desktop");
  const [title, setTitle] = useState("The ideas worth sharing");
  const [duration, setDuration] = useState(5);
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [micState, setMicState] = useState<"idle" | "ready" | "denied">("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [vrStatus, setVrStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const count = audienceSizes.find((item) => item.label === audience)?.count ?? "48 people";
  const clock = useMemo(() => {
    const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
    const ss = (remaining % 60).toString().padStart(2, "0");
    return mm + ":" + ss;
  }, [remaining]);

  useEffect(() => {
    const check = async () => {
      if (!("xr" in navigator) || !navigator.xr) {
        setVrStatus("unavailable");
        return;
      }
      try {
        const available = await navigator.xr.isSessionSupported("immersive-vr");
        setVrStatus(available ? "available" : "unavailable");
      } catch {
        setVrStatus("unavailable");
      }
    };
    void check();
  }, []);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    timerRef.current = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
      setElapsed((value) => value + 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running, remaining]);

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
      setSessionEnded(true);
    }
  }, [remaining, running]);

  useEffect(() => () => {
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    void audioContextRef.current?.close();
  }, []);

  async function enableMic() {
    if (micState === "ready") {
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      mediaRef.current = null;
      setMicState("idle");
      setMicLevel(0);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      mediaRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      setMicState("ready");
      const sample = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += (value - 128) ** 2;
        setMicLevel(Math.min(1, Math.sqrt(sum / data.length) / 32));
        rafRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      setMicState("denied");
    }
  }

  function startSession() {
    setRemaining(duration * 60);
    setElapsed(0);
    setSessionEnded(false);
    setRunning(true);
    sceneRef.current?.setAudienceMood(energy);
  }

  function endSession() {
    setRunning(false);
    setSessionEnded(true);
    setRemaining(Math.max(0, remaining));
  }

  async function enterVR() {
    if (vrStatus !== "available") return;
    try {
      await sceneRef.current?.enterVR();
    } catch (error) {
      console.error("Unable to enter VR:", error);
      setMode("desktop");
    }
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  const progress = duration * 60 ? elapsed / (duration * 60) : 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="StageRoom home">
          <span className="brand-mark"><Waves size={18} strokeWidth={2.3} /></span>
          <span>stage<span className="brand-light">room</span></span>
          <span className="brand-beta">STUDIO</span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> A QUIET PLACE TO GET BETTER AT SPEAKING</div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setShowGuide(true)} aria-label="Open quick guide"><CircleHelp size={17} /></button>
          <button className="icon-button" onClick={() => setShowSettings((v) => !v)} aria-label="Open settings"><Settings2 size={17} /></button>
          <div className="avatar">Y</div>
        </div>
      </header>

      <section className="workspace">
        <div className="intro-row">
          <div>
            <p className="eyebrow">YOUR PRACTICE STAGE <span> / </span> SESSION 01</p>
            <h1>Find your <em>voice.</em></h1>
            <p className="intro-copy">A room to rehearse, make mistakes, and find your rhythm before it matters.</p>
          </div>
          <div className="session-pill"><span className="status-dot" /> {running ? "SESSION IN PROGRESS" : "READY WHEN YOU ARE"}</div>
        </div>

        <div className="stage-grid">
          <section className="scene-panel">
            <div className="scene-topline">
              <div className="scene-location"><span className="scene-location-dot" /> MAIN HALL <span className="scene-divider">/</span> {count.toUpperCase()}</div>
              <div className="scene-top-actions">
                <button className="scene-action" onClick={toggleFullscreen}><MonitorPlay size={15} /> {fullscreen ? "EXIT FULL SCREEN" : "FULL SCREEN"}</button>
                <button className="scene-action" onClick={() => setShowGuide(true)}><Eye size={15} /> VIEW GUIDE</button>
              </div>
            </div>
            <div className="scene-viewport">
              <Auditorium ref={sceneRef} audience={audience} energy={energy} />
              <div className="scene-vignette" />
              <div className="scene-hud scene-hud-left"><span className="hud-kicker">YOUR STAGE</span><strong>{title || "Untitled talk"}</strong></div>
              <div className="scene-hud scene-hud-right"><span className="hud-rec" /> PRACTICE ENVIRONMENT</div>
              <div className="scene-bottom-hud">
                <span><Users size={13} /> {count}</span>
                <span className="hud-divider" />
                <span><Volume2 size={13} /> {energy.toUpperCase()} AUDIENCE</span>
              </div>
              {sessionEnded && (
                <div className="session-finish">
                  <div className="finish-card">
                    <span className="finish-icon"><Check size={18} /></span>
                    <p className="eyebrow">PRACTICE COMPLETE</p>
                    <h2>That was a good rep.</h2>
                    <p>You spent {Math.floor(elapsed / 60)}m {elapsed % 60}s on stage. Take a breath, then go again.</p>
                    <button className="primary-button" onClick={startSession}>PRACTISE AGAIN <ArrowRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
            <div className="scene-footer">
              <div className="voice-status">
                <span className={micState === "ready" ? "voice-led voice-on" : "voice-led"} />
                <span>{micState === "ready" ? "MICROPHONE CONNECTED" : micState === "denied" ? "MICROPHONE PERMISSION NEEDED" : "MICROPHONE OFF"}</span>
                {micState === "ready" && <span className="mic-meter"><i style={{ width: micLevel * 100 + "%" }} /></span>}
              </div>
              <div className="scene-footer-right">
                <button className="scene-action" onClick={enableMic}>{micState === "ready" ? <MicOff size={15} /> : <Mic size={15} />} {micState === "ready" ? "DISCONNECT MIC" : "CONNECT MIC"}</button>
                <button className="scene-action" onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />} {muted ? "UNMUTE" : "MUTE AMBIENCE"}</button>
              </div>
            </div>
          </section>

          <aside className="control-panel">
            <div className="panel-heading"><div><p className="eyebrow">SESSION SETUP</p><h2>Make it yours.</h2></div><span className="panel-index">01 / 03</span></div>
            <label className="field-label" htmlFor="talk-title">WHAT ARE YOU SPEAKING ABOUT?</label>
            <input id="talk-title" className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Give your talk a title" />
            <div className="field-block">
              <div className="field-label-row"><label className="field-label">ROOM SIZE</label><span className="field-hint">START SMALL</span></div>
              <div className="choice-grid three">
                {audienceSizes.map((item) => (
                  <button key={item.label} className={audience === item.label ? "choice active" : "choice"} onClick={() => setAudience(item.label)}>
                    <span className="choice-count">{item.count.split(" ")[0]}</span>
                    <span className="choice-name">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field-block">
              <div className="field-label-row"><span className="field-label">AUDIENCE ENERGY</span><span className="field-hint">SET THE ROOM</span></div>
              <div className="segmented">
                {(["Supportive", "Neutral", "Distracted"] as Energy[]).map((item) => <button key={item} className={energy === item ? "selected" : ""} onClick={() => { setEnergy(item); sceneRef.current?.setAudienceMood(item); }}>{item}</button>)}
              </div>
            </div>
            <div className="field-block">
              <div className="field-label-row"><span className="field-label">TIME ON STAGE</span><span className="field-hint">MINUTES</span></div>
              <div className="duration-row">
                {[3, 5, 8, 10].map((value) => <button key={value} className={duration === value ? "duration active" : "duration"} onClick={() => { setDuration(value); setRemaining(value * 60); }}>{value}<small>m</small></button>)}
              </div>
            </div>
            <div className="panel-bottom">
              <div className="timer-preview"><Clock3 size={16} /><span>SESSION LENGTH</span><strong>{clock}</strong></div>
              <button className="primary-button start-button" onClick={running ? endSession : startSession}>{running ? "END SESSION" : "START PRACTISING"} {running ? <Check size={17} /> : <ArrowRight size={17} />}</button>
              <p className="privacy-note"><span className="privacy-lock">●</span> Your camera and microphone stay off until you choose to enable them.</p>
            </div>
          </aside>
        </div>

        <section className="below-grid">
          <div className="feature-card">
            <div className="feature-icon"><AudioLines size={17} /></div>
            <div><p className="eyebrow">VOICE CHECK</p><h3>Find a comfortable pace.</h3><p>Connect your mic to see a live input meter. Speech analysis comes in a later release.</p></div>
            <span className="feature-tag">BASIC</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Headphones size={17} /></div>
            <div><p className="eyebrow">IMMERSIVE MODE</p><h3>Step onto the stage.</h3><p>{vrStatus === "checking" ? "Checking this device for WebXR support…" : vrStatus === "available" ? "A VR headset is available. Enter the room in immersive mode." : "VR is available on supported WebXR headsets and browsers."}</p><button className="text-link" disabled={vrStatus !== "available"} onClick={enterVR}> {vrStatus === "available" ? "ENTER VR" : "VR NOT AVAILABLE HERE"} <ArrowDownRight size={14} /></button></div>
            <span className="feature-tag">WEBXR</span>
          </div>
        </section>
        {showSettings && <div className="settings-popover"><div className="settings-title">PRACTICE PREFERENCES <button onClick={() => setShowSettings(false)}><X size={14} /></button></div><p>Room ambience</p><button className={muted ? "" : "selected"} onClick={() => setMuted(false)}>Soft room tone</button><button className={muted ? "selected" : ""} onClick={() => setMuted(true)}>Silence</button><p>Session controls are saved locally for this visit.</p></div>}
      </section>

      {showGuide && <div className="modal-backdrop" onClick={() => setShowGuide(false)}><div className="guide-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowGuide(false)}><X size={18} /></button><p className="eyebrow">A QUICK NOTE BEFORE YOU BEGIN</p><h2>There is no perfect first take.</h2><p>Pick a room, connect your microphone if you want to, and start speaking. The audience is here to give you a place to practise, not to judge you.</p><div className="guide-steps"><div><span>01</span> Choose a room that feels manageable.</div><div><span>02</span> Take one breath before your first sentence.</div><div><span>03</span> Keep going when you stumble. That is the practice.</div></div><button className="primary-button" onClick={() => setShowGuide(false)}>GOT IT <ArrowRight size={16} /></button></div></div>}
    </main>
  );
}