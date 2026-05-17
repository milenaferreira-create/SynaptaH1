/**
* Copyright 2026 Google LLC
* Licensed under the Apache License, Version 2.0
*/
 
import './view-splash.js';
import './view-missions.js';
import './view-chat.js';
import './view-summary.js';
import './text-cycler.js';
 
class AppRoot extends HTMLElement {
  constructor() {
    super();
    this.state = {
      view: 'splash',
      selectedMission: null,
      selectedLanguage: null,
      sessionResult: null
    };
  }
 
  connectedCallback() {
    this.innerHTML = '';
 
    this.themes = ['dark', 'light', 'system'];
    this.currentTheme = localStorage.getItem('theme') || 'system';
 
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system');
      }
    });
 
    this.applyTheme(this.currentTheme);
 
    const header = document.createElement('header');
    header.style.cssText = `
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      gap: var(--spacing-md);
      width: 100%;
      pointer-events: none;
    `;
 
    header.innerHTML = `
      <button id="theme-toggle" aria-label="Toggle Theme" style="
        pointer-events: auto;
        background: var(--color-surface);
        color: var(--color-text-main);
        border: 1px solid var(--glass-border);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        font-size: 1.2rem;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      ">
        <span class="theme-icon"></span>
      </button>
    `;
 
    this.appendChild(header);
 
    const themeBtn = header.querySelector('#theme-toggle');
    themeBtn.onclick = () => this.cycleTheme();
    this.themeBtn = themeBtn;
    this.updateThemeBtnIcon();
 
    this.viewContainer = document.createElement('div');
    this.viewContainer.style.height = "100%";
    this.viewContainer.style.width = "100%";
    this.appendChild(this.viewContainer);
 
    this.render();
 
    this.checkConfigStatus();
 
    this.addEventListener('navigate', (e) => {
      this.state.view = e.detail.view;
      if (e.detail.mission) this.state.selectedMission = e.detail.mission;
      if (e.detail.language) this.state.selectedLanguage = e.detail.language;
      if (e.detail.fromLanguage) this.state.selectedFromLanguage = e.detail.fromLanguage;
      if (e.detail.mode) this.state.selectedMode = e.detail.mode;
      if (e.detail.result) this.state.sessionResult = e.detail.result;
      this.render();
    });
  }
 
  applyTheme(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setLightMode(!prefersDark);
    } else {
      this.setLightMode(theme === 'light');
    }
  }
 
  setLightMode(isLight) {
    if (isLight) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }
 
  cycleTheme() {
    const modes = ['dark', 'light', 'system'];
    const currentIdx = modes.indexOf(this.currentTheme);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % modes.length;
 
    this.currentTheme = modes[nextIdx];
    localStorage.setItem('theme', this.currentTheme);
    this.applyTheme(this.currentTheme);
    this.updateThemeBtnIcon();
  }
 
  updateThemeBtnIcon() {
    if (!this.themeBtn) return;
 
    let icon = '';
    let title = '';
 
    switch (this.currentTheme) {
      case 'light':
        icon = '☀️';
        title = 'Light Mode';
        break;
      case 'dark':
        icon = '🌙';
        title = 'Dark Mode';
        break;
      case 'system':
        icon = '💻';
        title = 'System Default';
        break;
    }
 
    const iconSpan = this.themeBtn.querySelector('.theme-icon');
    if (iconSpan) iconSpan.textContent = icon;
    this.themeBtn.title = title;
  }
 
  async checkConfigStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
 
      if (data.mode === 'simple') {
        this.showSimpleModeWarning(data.missing);
      }
    } catch (e) {
      console.warn("Failed to check config status:", e);
    }
  }
 
  showSimpleModeWarning(missing) {
    // Synapta runs in Simple Mode by design — no warning banner needed.
    return;
  }
 
  render() {
    if (!this.viewContainer) return;
 
    this.viewContainer.innerHTML = '';
    let currentView;
 
    switch (this.state.view) {
      case 'splash':
        currentView = document.createElement('view-splash');
        break;
      case 'missions':
        currentView = document.createElement('view-missions');
        break;
      case 'chat':
        currentView = document.createElement('view-chat');
        currentView.mission = this.state.selectedMission;
        currentView.language = this.state.selectedLanguage;
        currentView.fromLanguage = this.state.selectedFromLanguage;
        currentView.mode = this.state.selectedMode;
        break;
      case 'summary':
        currentView = document.createElement('view-summary');
        currentView.result = this.state.sessionResult;
        break;
      default:
        currentView = document.createElement('view-splash');
    }
 
    currentView.classList.add('fade-in');
    this.viewContainer.appendChild(currentView);
  }
}
 
customElements.define('app-root', AppRoot);
