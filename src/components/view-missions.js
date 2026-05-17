/**
* Copyright 2026 Google LLC
* Licensed under the Apache License, Version 2.0
*/
 
import missionsData from '../data/missions.json';
 
class ViewMissions extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="container" style="max-width: 1000px;">
 
        <div style="margin-bottom: var(--spacing-xl); text-align: center; padding-top: var(--spacing-xl);">
            <p class="mono" style="margin-bottom: var(--spacing-md);">Portuguese → English · Leadership scenarios</p>
            <h2 style="font-size: clamp(2rem, 4vw, 2.75rem); letter-spacing: -0.02em; margin-bottom: var(--spacing-sm); font-weight: 300;">Choose your <em>mission</em></h2>
            <p style="opacity: 0.65; font-size: 1rem; max-width: 460px; margin: 0 auto;">Real professional scenarios. Real pressure. Real fluency.</p>
        </div>
 
        <div class="missions-list mission-grid">
          <!-- Missions injected here -->
        </div>
 
      </div>
    `;
 
    this.renderMissions();
  }
 
  renderMissions() {
    const missions = missionsData;
    const listContainer = this.querySelector('.missions-list');
 
    const difficultyColors = {
      'Foundational': '#1e6b5e',
      'Intense': '#b06a28',
      'Strategic': '#c8843e'
    };
 
    missions.forEach(mission => {
      const card = document.createElement('div');
      card.className = 'card mission-card';
      card.style.cursor = 'pointer';
 
      const badgeColor = difficultyColors[mission.difficulty] || '#b06a28';
 
      card.innerHTML = `
        <div style="margin-bottom: var(--spacing-md); display: flex; justify-content: space-between; align-items: start;">
            <span class="mono" style="
                background: ${badgeColor}22;
                color: ${badgeColor};
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                font-size: 0.7rem;
                font-weight: 500;
                border: 1px solid ${badgeColor}44;
            ">${mission.difficulty}</span>
        </div>
        <h3 style="margin: 0 0 var(--spacing-sm) 0; font-size: 1.4rem; line-height: 1.25; font-weight: 400;">${mission.title}</h3>
        <p style="margin: 0; font-size: 0.95rem; opacity: 0.7; line-height: 1.55;">${mission.desc}</p>
        <div class="mono" style="margin-top: auto; padding-top: var(--spacing-lg); font-size: 0.7rem; opacity: 0.85;">
            Roleplay · ${mission.target_role}
        </div>
      `;
 
      card.addEventListener('click', () => {
        // Always Portuguese → English for House of Hypatia
        const selectedToLang = '🇬🇧 English';
        const selectedFromLang = '🇧🇷 Portuguese';
        // Always Immersive mode for House of Hypatia
        const selectedMode = 'immergo_immersive';
 
        this.dispatchEvent(new CustomEvent('navigate', {
          bubbles: true,
          detail: {
            view: 'chat',
            mission: mission,
            language: selectedToLang,
            fromLanguage: selectedFromLang,
            mode: selectedMode
          }
        }));
      });
 
      listContainer.appendChild(card);
    });
  }
}
 
customElements.define('view-missions', ViewMissions);
