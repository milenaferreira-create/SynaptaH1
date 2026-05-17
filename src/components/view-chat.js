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
  }
 
  set mission(value) {
    this._mission = value;
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
    this.render();
  }
 
  disconnectedCallback() {
    if (this.audioStreamer) this.audioStreamer.stop();
    if (this.client) this.client.disconnect();
  }
 
  render() {
    if (!this._mission) return;
 
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
          <h2 style="font-size: 1.6rem; margin-bottom: var(--spacing-sm); font-weight: 400;">${this._mission.target_role || "Target Person"}</h2>
 
          <div style="
            border-radius: var(--radius-lg);
            padding: var(--spacing-md) var(--spacing-lg);
            display: inline-block;
            margin-top: var(--spacing-md);
            max-width: 800px;
          ">
            <p style="font-size: 1.15rem; font-weight: 400; color: var(--color-accent-secondary); margin: 0; font-family: var(--font-heading); font-style: italic;">${this._mission.title}</p>
            <p style="font-size: 0.95rem; opacity: 0.75; margin-top: var(--spacing-sm); line-height: 1.55;">${this._mission.desc}</p>
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
            <span class="mono" style="font-size: 0.7rem; opacity: 0.9;">The other person speaks first</span>
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
      if (this.audioStreamer) this.audioStreamer.stop();
      if (this.client) this.client.disconnect();
      if (this.audioPlayer) this.audioPlayer.interrupt();
 
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
      if (this.audioStreamer) this.audioStreamer.stop();
      if (this.client) this.client.disconnect();
      if (this.audioPlayer) this.audioPlayer.interrupt();
 
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
 
    this.client = new GeminiLiveAPI();
    this.audioStreamer = new AudioStreamer(this.client);
    this.audioPlayer = new AudioPlayer();
 
    const completeMissionTool = new FunctionCallDefinition(
      "complete_mission",
      "Call this tool when the user has successfully completed the mission objective. Provide a score and feedback.",
      {
        type: "OBJECT",
        properties: {
          score: {
            type: "INTEGER",
            description:
              "Rating from 1 to 3 based on performance on Clarity, Authority, and Fluency: 1 = Struggled with hedging, lack of authority, or frequent reliance on Portuguese. 2 = Capable, clear but with some hesitation or imperfect authority. 3 = Excellent, authoritative, fluent, native-like.",
          },
          feedback_pointers: {
            type: "ARRAY",
            items: { type: "STRING" },
            description:
              "List of 3 specific feedback points in Portuguese, addressing Clarity, Authority, and Fluency. Reference exact phrases the user said when relevant.",
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
      winnerSound.play().catch((e) => console.error("Failed to play winner sound:", e));
 
      const levels = { 1: "Emergent", 2: "Capable", 3: "Authoritative" };
      const level = levels[args.score] || "Capable";
 
      setTimeout(() => {
        if (this.audioStreamer) this.audioStreamer.stop();
        if (this.client) this.client.disconnect();
        if (this.audioPlayer) this.audioPlayer.interrupt();
 
        const result = {
          score: args.score.toString(),
          level: level,
          notes: args.feedback_pointers,
        };
 
        this.dispatchEvent(
          new CustomEvent("navigate", {
            bubbles: true,
            detail: { view: "summary", result: result },
          })
        );
      }, 2500);
    };
 
    this.client.addFunction(completeMissionTool);
 
    this.client.onConnectionStarted = () => console.log("🚀 [Synapta] Connection started");
    this.client.onOpen = () => console.log("🔓 [Synapta] WebSocket open");
 
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
 
    this.client.onError = (error) => console.error("❌ [Synapta] Error:", error);
    this.client.onClose = () => console.log("🔒 [Synapta] Connection closed");
 
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
        statusEl.textContent = "Connecting...";
        statusEl.style.color = "var(--color-text-sub)";
 
        try {
          const mission = this._mission;
                    // SYNAPTA SYSTEM PROMPT - uses authored mission content
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
- score: 1 (Emergent — struggled with authority, clarity, or fluency), 2 (Capable — solid but with some hesitation), or 3 (Authoritative — native-level command of the situation)
- feedback_pointers: 3 specific, actionable points in Portuguese addressing Clarity, Authority, and Fluency. When useful, quote exact phrases the user said and offer alternatives.
 
═══ CRITICAL RULES ═══
- Stay in character as ${mission.ai_persona_name}. Do not break the fourth wall.
- Do not act as an AI assistant. Do not say "as an AI" or similar.
- Speak only in English during the scenario. Switch to Portuguese only when calling complete_mission for feedback.
- Be a realistic professional, not a teacher. No grammar lectures.
- Respond at natural conversational length — not too short, not lecturing.
`;
 
          console.log("📝 [Synapta] System prompt loaded for mission:", mission.title);
          this.client.setSystemInstructions(systemInstruction);
 
          // No transcription in Immersive mode (saves tokens, faster response)
          this.client.setInputAudioTranscription(false);
          this.client.setOutputAudioTranscription(false);
 
          console.log("🔌 [Synapta] Connecting...");
 
          // Skip reCAPTCHA — graceful fallback to Simple Mode
          let token = null;
          try {
            token = await this.getRecaptchaToken();
          } catch (err) {
            console.warn("⚠️ ReCAPTCHA skipped (Simple Mode):", err);
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
          startSound.play().catch((e) => console.error("Failed to play start sound:", e));
        } catch (err) {
          console.error("❌ [Synapta] Failed to start:", err);
 
          isSpeaking = false;
          micBtn.classList.remove('active');
          micBtn.innerHTML = `
              <span style="font-size: 1.2rem; font-weight: 500; margin-bottom: 2px; letter-spacing: 0.02em;">Start Mission</span>
              <span class="mono" style="font-size: 0.7rem; opacity: 0.9;">The other person speaks first</span>
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
    // Synapta MVP runs in Simple Mode — reCAPTCHA disabled.
    // This prevents the "Invalid domain" error that appears with the inherited Immergo reCAPTCHA key.
    return null;
  }
}
 
customElements.define("view-chat", ViewChat);
      
