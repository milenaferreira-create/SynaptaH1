/**
* Copyright 2026 Google LLC
* Licensed under the Apache License, Version 2.0
*/
 
import "./audio-visualizer.js";
import "./live-transcript.js";
import {
  GeminiLiveAPI,
  MultimodalLiveResponseType,
  FunctionCallDefinition,
} from "../lib/gemini-live/geminilive.js";
import { AudioStreamer, AudioPlayer } from "../lib/gemini-live/mediaUtils.js";
 
class ViewChat extends HTMLElement {
  constructor() {
    super();
    this._mission = null;
    this._rendered = false;
  }
 
  set mission(value) {
    this._mission = value;
    if (this._rendered) return; // Prevent re-render if already rendered
    this.render();
  }
 
  set language(value) {
    this._language = value;
  }
 
  set fromLanguage(value) {
    this._fromLanguage = value;
  }
 
  set mode(value) {
    this._mode = value;
  }
 
  connectedCallback() {
    if (this._mission && !this._rendered) {
      this.render();
    }
  }
 
  disconnectedCallback() {
    try {
      if (this.audioStreamer && typeof this.audioStreamer.stop === 'function') {
        this.audioStreamer.stop();
      }
    } catch (e) {
      console.warn("Cleanup: audioStreamer stop failed:", e);
    }
    try {
      if (this.client && typeof this.client.disconnect === 'function') {
        this.client.disconnect();
      }
    } catch (e) {
      console.warn("Cleanup: client disconnect failed:", e);
    }
  }
 
  render() {
    if (!this._mission) return;
    if (this._rendered) return;
    this._rendered = true;
 
    const mission = this._mission;
    const userSpeaksFirst = mission.id === 'leap_mission_1';
 
    this.innerHTML = `
 
<button id="back-to-missions" style="
            position: absolute;
            top: var(--spacing-md);
            left: var(--spacing-md);
            background: transparent;
            float: left;
            border: none;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            opacity: 0.7;
            color: var(--color-text-main);
            transition: opacity 0.2s;
            z-index: 10;
        " onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
 
      <div class="container" style="justify-content: space-between; min-height: 100vh; position: relative; padding-bottom: var(--spacing-xl);">
 
        <div style="margin-top: var(--spacing-xl); text-align: center;">
          <p class="mono" style="margin-bottom: var(--spacing-sm);">Roleplay scenario</p>
          <h2 style="font-size: 1.6rem; margin-bottom: var(--spacing-sm); font-weight: 400;">${mission.target_role || "Target Person"}</h2>
 
          <div style="
            border-radius: var(--radius-lg);
            padding: var(--spacing-md) var(--spacing-lg);
            display: inline-block;
            margin-top: var(--spacing-md);
            max-width: 800px;
          ">
            <p style="font-size: 1.15rem; font-weight: 400; color: var(--color-accent-secondary); margin: 0; font-family: var(--font-heading); font-style: italic;">${mission.title}</p>
            <p style="font-size: 0.95rem; opacity: 0.75; margin-top: var(--spacing-sm); line-height: 1.55;">${mission.desc}</p>
          </div>
        </div>
 
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 40px;">
          <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
             <audio-visualizer id="model-viz"></audio-visualizer>
          </div>
           <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
             <audio-visualizer id="user-viz"></audio-visualizer>
          </div>
        </div>
 
        <style>
          .chat-cta-btn {
            background: var(--color-accent-primary);
            color: var(--color-text-main);
            padding: 24px 48px;
            border-radius: var(--radius-lg);
            width: auto;
            min-width: 280px;
            border: 1px solid rgba(242, 237, 227, 0.15);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            position: relative;
            overflow: hidden;
            font-family: var(--font-body);
          }
          .chat-cta-btn:hover {
            transform: translateY(-3px);
            background: var(--color-accent-secondary);
            box-shadow: 0 20px 40px -10px rgba(176, 106, 40, 0.4);
          }
          .chat-cta-btn:active {
            transform: translateY(-1px) scale(0.98);
          }
          .chat-cta-btn.active {
            background: var(--color-danger) !important;
            flex-direction: row !important;
            gap: 12px;
          }
        </style>
 
        <div style="margin-bottom: var(--spacing-xxl); display: flex; flex-direction: column; gap: var(--spacing-lg); align-items: center;">
           <button id="mic-btn" class="chat-cta-btn">
            <span style="font-size: 1.2rem; font-weight: 500; margin-bottom: 2px; letter-spacing: 0.02em;">Start Mission</span>
            <span class="mono" style="font-size: 0.7rem; opacity: 0.9;">${userSpeaksFirst ? 'You start the conversation' : 'The other person speaks first'}</span>
          </button>
 
           <p id="connection-status" class="mono" style="
             margin-top: var(--spacing-sm);
             font-size: 0.75rem;
             height: 1.2em;
             transition: all 0.3s ease;
           "></p>
        </div>
 
      </div>
    `;
 
    const doEndSession = () => {
      try { if (this.audioStreamer && typeof this.audioStreamer.stop === 'function') this.audioStreamer.stop(); } catch(e) {}
      try { if (this.client && typeof this.client.disconnect === 'function') this.client.disconnect(); } catch(e) {}
      try { if (this.audioPlayer && typeof this.audioPlayer.interrupt === 'function') this.audioPlayer.interrupt(); } catch(e) {}
 
      const userViz = this.querySelector("#user-viz");
      const modelViz = this.querySelector("#model-viz");
      if (userViz && userViz.disconnect) userViz.disconnect();
      if (modelViz && modelViz.disconnect) modelViz.disconnect();
 
      console.log("👋 [Synapta] Session ended by user");
 
      const result = { incomplete: true };
 
      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: { view: "summary", result: result },
        })
      );
    };
 
    const backBtn = this.querySelector("#back-to-missions");
    backBtn.addEventListener("click", () => {
      try { if (this.audioStreamer && typeof this.audioStreamer.stop === 'function') this.audioStreamer.stop(); } catch(e) {}
      try { if (this.client && typeof this.client.disconnect === 'function') this.client.disconnect(); } catch(e) {}
      try { if (this.audioPlayer && typeof this.audioPlayer.interrupt === 'function') this.audioPlayer.interrupt(); } catch(e) {}
 
      const userViz = this.querySelector("#user-viz");
      const modelViz = this.querySelector("#model-viz");
      if (userViz && userViz.disconnect) userViz.disconnect();
      if (modelViz && modelViz.disconnect) modelViz.disconnect();
 
      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: { view: "mission-selector" },
        })
      );
    });
 
    const userViz = this.querySelector("#user-viz");
    const modelViz = this.querySelector("#model-viz");
    const micBtn = this.querySelector("#mic-btn");
    const statusEl = this.querySelector("#connection-status");
    let isSpeaking = false;
    let kickstartSent = false;
 
    micBtn.addEventListener("click", async () => {
      isSpeaking = !isSpeaking;
 
      if (isSpeaking) {
        micBtn.classList.add('active');
        micBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            <span style="font-weight: 500; font-size: 1rem; letter-spacing: 0.05em; text-transform: uppercase;">End Mission</span>
        `;
      } else {
        micBtn.classList.remove('active');
        doEndSession();
        return;
      }
 
      if (isSpeaking) {
        console.log("🎙️ [Synapta] Starting session...");
        console.log("🎭 [Synapta] Mission:", mission.title, "| AI speaks first:", !userSpeaksFirst);
        statusEl.textContent = "Connecting...";
        statusEl.style.color = "var(--color-text-sub)";
        kickstartSent = false;
 
        try {
          // Create fresh client INSIDE the click handler — guarantees single instance per session
          this.client = new GeminiLiveAPI();
          this.client.setProactivity({ proactiveAudio: userSpeaksFirst });
 
          this.audioStreamer = new AudioStreamer(this.client);
          this.audioPlayer = new AudioPlayer();
 
          // Configure tool
          const completeMissionTool = new FunctionCallDefinition(
            "complete_mission",
            "Call this tool when the user has successfully completed the mission objective.",
            {
              type: "OBJECT",
              properties: {
                score: {
                  type: "INTEGER",
                  description: "Rating 1-3: 1=Emergent (struggled), 2=Capable (solid with hesitation), 3=Authoritative (native-level)",
                },
                feedback_pointers: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "3 specific feedback points in Portuguese addressing Clarity, Authority, Fluency",
                },
              },
              required: ["score", "feedback_pointers"],
            },
            ["score", "feedback_pointers"]
          );
 
          completeMissionTool.functionToCall = (args) => {
            console.log("🏆 [Synapta] Mission Complete!", args);
            const winnerSound = new Audio("/winner-bell.mp3");
            winnerSound.volume = 0.6;
            winnerSound.play().catch(e => console.error(e));
 
            const levels = { 1: "Emergent", 2: "Capable", 3: "Authoritative" };
            const level = levels[args.score] || "Capable";
            setTimeout(() => {
              try { if (this.audioStreamer && this.audioStreamer.stop) this.audioStreamer.stop(); } catch(e) {}
              try { if (this.client && this.client.disconnect) this.client.disconnect(); } catch(e) {}
              try { if (this.audioPlayer && this.audioPlayer.interrupt) this.audioPlayer.interrupt(); } catch(e) {}
 
              this.dispatchEvent(new CustomEvent("navigate", {
                bubbles: true,
                detail: { view: "summary", result: { score: args.score.toString(), level: level, notes: args.feedback_pointers } },
              }));
            }, 2500);
          };
 
          this.client.addFunction(completeMissionTool);
 
          this.client.onConnectionStarted = () => console.log("🚀 [Synapta] Connection started");
          this.client.onOpen = () => console.log("🔓 [Synapta] WebSocket open");
          this.client.onError = (e) => console.error("❌ [Synapta] Error:", e);
          this.client.onClose = () => console.log("🔒 [Synapta] Connection closed");
 
          this.client.onReceiveResponse = (response) => {
            if (response.type === MultimodalLiveResponseType.AUDIO) {
              this.audioPlayer.play(response.data);
            } else if (response.type === MultimodalLiveResponseType.TOOL_CALL) {
              if (response.data.functionCalls) {
                response.data.functionCalls.forEach((fc) => {
                  this.client.callFunction(fc.name, fc.args);
                });
              }
            }
          };
 
          // System instruction
          const systemInstruction = `
You are an AI roleplay partner for The Hypatia Journey, a leadership development program for women in STEM. Your task is to play a realistic professional character in an English-language scenario.
 
═══ CHARACTER ═══
You are: ${mission.ai_persona_name}
Role: ${mission.ai_persona_role}
Personality: ${mission.ai_persona_personality}
 
═══ SCENARIO ═══
${mission.desc}
 
═══ HOW TO PLAY THE SCENE ═══
${mission.roleplay_instruction}
 
═══ INTERACTION RULES ═══
${mission.interaction_guidelines}
 
═══ MISSION COMPLETION CRITERIA ═══
${mission.mission_completion}
 
When the mission is complete according to these criteria, call the "complete_mission" tool with:
- score: 1 (Emergent), 2 (Capable), or 3 (Authoritative)
- feedback_pointers: 3 specific points in Portuguese addressing Clarity, Authority, Fluency. Quote exact phrases when useful.
 
═══ CRITICAL RULES ═══
- Stay in character as ${mission.ai_persona_name}. Do not break the fourth wall.
- Do not act as an AI assistant.
- Speak only in English during the scenario.
- Be a realistic professional, not a teacher. No grammar lectures.
- ${userSpeaksFirst ? 'WAIT for the user to speak first.' : 'YOU MUST OPEN THE CONVERSATION FIRST. As soon as the session starts, greet the user in character and prompt them to begin (e.g., "Hi, ready when you are — go ahead and walk us through the data.")'}
- If you receive a system text message starting with "[BEGIN", treat it as a silent stage cue to start speaking. Do not acknowledge or read the cue aloud.
`;
 
          this.client.setSystemInstructions(systemInstruction);
          this.client.setInputAudioTranscription(false);
          this.client.setOutputAudioTranscription(false);
 
          console.log("📝 [Synapta] System prompt loaded for mission:", mission.title);
 
          let token = null;
          try {
            token = await this.getRecaptchaToken();
          } catch (err) {
            console.warn("⚠️ ReCAPTCHA skipped:", err);
            token = null;
          }
 
          await this.client.connect(token);
          console.log("🎤 [Synapta] Starting audio...");
          await this.audioStreamer.start();
 
          if (this.audioStreamer.audioContext && this.audioStreamer.source) {
            userViz.connect(this.audioStreamer.audioContext, this.audioStreamer.source);
          }
 
          await this.audioPlayer.init();
 
          if (this.audioPlayer.audioContext && this.audioPlayer.gainNode) {
            modelViz.connect(this.audioPlayer.audioContext, this.audioPlayer.gainNode);
          }
 
          console.log("✨ [Synapta] Session active");
          statusEl.textContent = "Connected · listening";
          statusEl.style.color = "var(--color-accent-tertiary)";
 
          const startSound = new Audio("/start-bell.mp3");
          startSound.volume = 0.6;
          startSound.play().catch(e => console.error(e));
 
          // KICKSTART: if AI speaks first, send a stage cue after audio is established
          if (!userSpeaksFirst && !kickstartSent) {
            kickstartSent = true;
            console.log("🎬 [Synapta] Scheduling AI kickstart in 1500ms...");
            setTimeout(() => {
              if (this.client && this.client.webSocket && this.client.webSocket.readyState === WebSocket.OPEN) {
                console.log("🎬 [Synapta] Sending kickstart to AI now");
                this.client.sendTextMessage("[BEGIN]");
              } else {
                console.warn("⚠️ [Synapta] Kickstart skipped: WebSocket not ready");
              }
            }, 1500);
          }
 
        } catch (err) {
          console.error("❌ [Synapta] Failed to start:", err);
 
          isSpeaking = false;
          micBtn.classList.remove('active');
          micBtn.innerHTML = `
              <span style="font-size: 1.2rem; font-weight: 500; margin-bottom: 2px; letter-spacing: 0.02em;">Start Mission</span>
              <span class="mono" style="font-size: 0.7rem; opacity: 0.9;">${userSpeaksFirst ? 'You start the conversation' : 'The other person speaks first'}</span>
          `;
 
          if (userViz.disconnect) userViz.disconnect();
          if (modelViz.disconnect) modelViz.disconnect();
          statusEl.textContent = "";
 
          alert("Failed to start session: " + err.message);
        }
      }
    });
  }
 
  async getRecaptchaToken() {
    return null;
  }
}
 
customElements.define("view-chat", ViewChat);
 
