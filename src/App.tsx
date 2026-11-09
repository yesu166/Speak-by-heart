import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Expand,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Play,
  Settings2,
  Users,
  Volume2,
  VolumeX,
  Waves,
  X
} from "lucide-react";
import { Auditorium } from "./scene/Auditorium";
import type { SceneHandle, Venue } from "./scene/Auditorium";

type AudienceSize = "Small room" | "Seminar" | "Auditorium";
type Energy = "Supportive" | "Neutral" | "Distracted";

const venues: { label: Venue; subtitle: string; icon: string }[] = [
  { label: "Main auditorium", subtitle: "A warm, cinematic theatre", icon: "◉" },
  { label: "Classroom", subtitle: "A familiar learning space", icon: "▤" },
  { label: "Conference room", subtitle: "A modern boardroom", icon: "▦" },
  { label: "Outdoor amphitheatre", subtitle: "An open-air crowd", icon: "✳" }
];

const audienceSizes: { label: AudienceSize; count: number }[] = [
  { label: "Small room", count: 15 },
  { label: "Seminar", count: 60 },
  { label: "Auditorium", count: 120 }
];

const CROWD_AMBIENCE =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3KrUYE2WtgFOq6wOmniZwGJHvVm/f679bc48-edc8-497c-80ab-6af27b4bb4da.mp3";

export default function App() {
  const sceneRef = useRef<SceneHandle>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dockHoveredRef = useRef(false);

  const [venue, setVenue] = useState<Venue>("Main auditorium");
  const [audience, setAudience] = useState<AudienceSize>("Seminar");
  const [energy, setEnergy] = useState<Energy>("Supportive");
  const [title, setTitle] = useState("The ideas worth sharing");
  const [duration, setDuration] = useState(5);
  const [remaining, setRemaining] = useState(300);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [ambienceVolume, setAmbienceVolume] = useState(0.16);
  const [micState, setMicState] = useState<"idle" | "ready" | "denied">("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [vrStatus, setVrStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [fullscreen, setFullscreen] = useState(false);

  const selectedVenue = venues.find((item) => item.label === venue) ?? venues[0];
  const selectedAudience = audienceSizes.find((item) => item.label === audience) ?? audienceSizes[1];
  const clock = useMemo(() => {
    const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
    const ss = (remaining % 60).toString().padStart(2, "0");
    return mm + ":" + ss;
  }, [remaining]);

  function scheduleHide() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!dockHoveredRef.current && !showSettings && !showGuide) setControlsVisible(false);
    }, 2600);
  }

  function revealControls() {
    setControlsVisible(true);
    scheduleHide();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      revealControls();
      return;
    }
    const nearEdge =
      event.clientY < 118 ||
      event.clientY > window.innerHeight - 150 ||
      event.clientX < 64 ||
      event.clientX > window.innerWidth - 64;
    if (nearEdge) revealControls();
  }

  function handleDockEnter() {
    dockHoveredRef.current = true;
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
  }

  function handleDockLeave() {
    dockHoveredRef.current = false;
    scheduleHide();
  }

  useEffect(() => {
    const initialHide = window.setTimeout(() => setControlsVisible(false), 5200);
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      window.clearTimeout(initialHide);
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!navigator.xr) {
        setVrStatus("unavailable");
        return;
      }
      try {
        setVrStatus(await navigator.xr.isSessionSupported("immersive-vr") ? "available" : "unavailable");
      } catch {
        setVrStatus("unavailable");
      }
    };
    void check();
  }, []);

  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
      setElapsed((value) => value + 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
      setSessionEnded(true);
      audioRef.current?.pause();
    }
  }, [remaining, running]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = soundOn ? ambienceVolume : 0;
      audioRef.current.playbackRate =
        venue === "Classroom" ? 0.92 :
        venue === "Conference room" ? 0.96 :
        venue === "Outdoor amphitheatre" ? 1.04 : 1;
    }
  }, [soundOn, ambienceVolume, venue]);

  useEffect(() => () => {
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    void audioContextRef.current?.close();
    audioRef.current?.pause();
  }, []);

  async function toggleMic() {
    if (micState === "ready") {
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      mediaRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      await audioContextRef.current?.close();
      audioContextRef.current = null;
      setMicState("idle");
      setMicLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      mediaRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let frame = 0;
      setMicState("ready");

      const sample = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += (value - 128) ** 2;
        if (frame % 5 === 0) {
          setMicLevel(Math.min(1, Math.sqrt(sum / data.length) / 32));
        }
        frame += 1;
        rafRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      setMicState("denied");
    }
  }

  async function startSession() {
    setRemaining(duration * 60);
    setElapsed(0);
    setSessionEnded(false);
    setRunning(true);
    sceneRef.current?.setAudienceMood(energy);
    setControlsVisible(true);
    if (soundOn && audioRef.current) {
      audioRef.current.volume = ambienceVolume;
      try {
        await audioRef.current.play();
      } catch (error) {
        console.warn("Crowd ambience could not start:", error);
      }
    }
    scheduleHide();
  }

  function endSession() {
    setRunning(false);
    setSessionEnded(true);
    audioRef.current?.pause();
    setControlsVisible(true);
  }

  async function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (!audioRef.current) return;
    if (next) {
      audioRef.current.volume = ambienceVolume;
      try {
        await audioRef.current.play();
      } catch (error) {
        console.warn("Crowd ambience could not start:", error);
      }
    } else {
      audioRef.current.pause();
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.warn("Fullscreen is unavailable:", error);
    }
  }

  async function enterVR() {
    if (vrStatus !== "available") return;
    try {
      await sceneRef.current?.enterVR();
    } catch (error) {
      console.error("Unable to enter VR:", error);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (running) endSession();
        else void startSession();
      } else if (event.key.toLowerCase() === "m") {
        void toggleSound();
      } else if (event.key.toLowerCase() === "f") {
        void toggleFullscreen();
      } else if (event.key === "?") {
        setShowGuide((value) => !value);
        setControlsVisible(true);
      } else if (event.key === "Escape") {
        setShowGuide(false);
        setShowSettings(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main
      className="immersive-shell"
      onPointerMove={handlePointerMove}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") revealControls();
      }}
    >
      <Auditorium ref={sceneRef} audience={audience} energy={energy} venue={venue} />
      <div className="cinema-vignette" aria-hidden="true" />
      <audio ref={audioRef} src={CROWD_AMBIENCE} loop preload="none" />

      <div className={controlsVisible ? "controls-layer is-visible" : "controls-layer"} aria-hidden={!controlsVisible}>
        <header className="top-rail" onMouseEnter={handleDockEnter} onMouseLeave={handleDockLeave}>
          <a className="brand-lockup" href="#" aria-label="StageRoom">
            <span className="brand-symbol"><Waves size={17} /></span>
            <span>stage<span>room</span></span>
            <small>IMMERSIVE PRACTICE</small>
          </a>

          <div className="venue-pill">
            <MapPin size={14} />
            <span>{venue.toUpperCase()}</span>
            <ChevronDown size={13} />
          </div>

          <div className="rail-actions">
            <div className="session-clock">
              <span className={running ? "clock-live" : "clock-idle"} />
              <strong>{clock}</strong>
            </div>
            <button className="glass-icon" onClick={() => setShowGuide(true)} title="Quick guide (?)" aria-label="Quick guide">
              <CircleHelp size={17} />
            </button>
            <button className="glass-icon" onClick={enterVR} disabled={vrStatus !== "available"} title="Enter VR" aria-label="Enter VR">
              <Expand size={16} />
            </button>
            <button className="glass-icon" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label="Toggle fullscreen">
              <Expand size={16} />
            </button>
          </div>
        </header>

        <div className="edge-hint" aria-hidden={!controlsVisible}>
          <span className="edge-hint-line" />
          <span>{running ? "YOU'RE ON STAGE" : "MOVE TO AN EDGE TO OPEN CONTROLS"}</span>
          <span className="edge-hint-line" />
        </div>

        <section
          className="practice-dock"
          onMouseEnter={handleDockEnter}
          onMouseLeave={handleDockLeave}
          aria-label="Practice controls"
        >
          <div className="dock-selectors">
            <label className="dock-field venue-field">
              <span>VENUE</span>
              <select value={venue} onChange={(event) => setVenue(event.target.value as Venue)}>
                {venues.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
              </select>
            </label>
            <label className="dock-field audience-field">
              <span>AUDIENCE</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value as AudienceSize)}>
                {audienceSizes.map((item) => <option key={item.label} value={item.label}>{item.count} · {item.label}</option>)}
              </select>
            </label>
            <label className="dock-field duration-field">
              <span>TIME</span>
              <select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setRemaining(Number(event.target.value) * 60); }}>
                {[3, 5, 8, 10].map((value) => <option key={value} value={value}>{value} minutes</option>)}
              </select>
            </label>
          </div>

          <div className="dock-divider" />

          <div className="energy-control" role="group" aria-label="Audience mood">
            {(["Supportive", "Neutral", "Distracted"] as Energy[]).map((item) => (
              <button
                key={item}
                className={energy === item ? "energy-chip selected" : "energy-chip"}
                onClick={() => { setEnergy(item); sceneRef.current?.setAudienceMood(item); }}
                title={item + " audience"}
              >
                {item === "Supportive" ? "Warm" : item === "Neutral" ? "Neutral" : "Tough"}
              </button>
            ))}
          </div>

          <div className="dock-divider" />

          <div className="dock-actions">
            <button
              className={soundOn ? "dock-icon active" : "dock-icon"}
              onClick={() => void toggleSound()}
              title={soundOn ? "Mute crowd ambience (M)" : "Enable crowd ambience (M)"}
              aria-label={soundOn ? "Mute crowd ambience" : "Enable crowd ambience"}
            >
              {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              className={micState === "ready" ? "dock-icon active" : "dock-icon"}
              onClick={() => void toggleMic()}
              title={micState === "ready" ? "Disconnect microphone" : "Connect microphone"}
              aria-label={micState === "ready" ? "Disconnect microphone" : "Connect microphone"}
            >
              {micState === "ready" ? <Mic size={17} /> : <MicOff size={17} />}
            </button>
            <button className="dock-icon" onClick={() => setShowSettings((value) => !value)} title="Practice settings" aria-label="Practice settings">
              <Settings2 size={17} />
            </button>
            <button className="start-button" onClick={() => running ? endSession() : void startSession()}>
              {running ? <><Pause size={16} /> END SESSION</> : <><Play size={16} fill="currentColor" /> START PRACTICE</>}
            </button>
          </div>
        </section>

        {showSettings && (
          <div className="settings-card" onMouseEnter={handleDockEnter} onMouseLeave={handleDockLeave}>
            <div className="settings-card-heading">
              <span>PRACTICE DETAILS</span>
              <button onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={16} /></button>
            </div>
            <label className="settings-label" htmlFor="talk-title">YOUR TALK</label>
            <input
              id="talk-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="Give your talk a title"
            />
            <div className="settings-label-row"><span>AMBIENCE VOLUME</span><strong>{Math.round(ambienceVolume * 100)}%</strong></div>
            <input
              className="volume-slider"
              type="range"
              min="0"
              max="0.35"
              step="0.01"
              value={ambienceVolume}
              onChange={(event) => setAmbienceVolume(Number(event.target.value))}
            />
            <p>Microphone audio stays on this device. It is not recorded or uploaded.</p>
          </div>
        )}

        {sessionEnded && (
          <div className="finish-overlay">
            <div className="finish-card">
              <span className="finish-check"><Check size={18} /></span>
              <span className="finish-kicker">SESSION COMPLETE</span>
              <h1>Good work. Take a breath.</h1>
              <p>You spent {Math.floor(elapsed / 60)}m {elapsed % 60}s on stage. The room will be right here when you're ready for another rep.</p>
              <button className="start-button" onClick={() => void startSession()}><Play size={16} fill="currentColor" /> PRACTISE AGAIN</button>
              <button className="finish-close" onClick={() => setSessionEnded(false)}>BACK TO THE ROOM</button>
            </div>
          </div>
        )}
      </div>

      {micState === "denied" && controlsVisible && (
        <div className="mic-notice">Microphone access was not granted by the browser.</div>
      )}

      {showGuide && (
        <div className="guide-overlay" onClick={() => setShowGuide(false)}>
          <section className="guide-card" onClick={(event) => event.stopPropagation()}>
            <button className="guide-close" onClick={() => setShowGuide(false)} aria-label="Close guide"><X size={18} /></button>
            <span className="guide-kicker">STAGEROOM QUICK GUIDE</span>
            <h2>Find your rhythm.</h2>
            <p>Choose a venue and audience size, then step into the room. Start speaking when you're ready. The crowd ambience is there to make the room feel occupied, not to compete with your voice.</p>
            <div className="shortcut-list">
              <span><kbd>Space</kbd> Start or end practice</span>
              <span><kbd>M</kbd> Crowd sound on / off</span>
              <span><kbd>F</kbd> Fullscreen</span>
              <span><kbd>?</kbd> Toggle this guide</span>
            </div>
            <button className="start-button guide-done" onClick={() => setShowGuide(false)}>GOT IT</button>
          </section>
        </div>
      )}

      <div className="mic-level" aria-hidden="true">
        <span style={{ width: Math.round(micLevel * 100) + "%" }} />
      </div>
    </main>
  );
}
