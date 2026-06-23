// Gameplay defaults for the bundled run-and-gun game.
// The current game script still owns runtime logic; this file documents
// stable tuning points for the next modularization pass.
window.PlatformEngineConfig = window.PlatformEngineConfig || {};
window.PlatformEngineConfig.gameplay = {
  startLives: 3,
  startBombs: 5,
  maxBombs: 15,
  respawnHpRatio: 1,
  supportedGenres: ["run-and-gun", "metroidvania", "precision-platformer", "co-op-platformer"]
};
