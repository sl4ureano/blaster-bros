# Platform Engine Architecture

This project is now organized as a reusable web platform-game engine.

## Runtime layers

```text
server.js
public/
  index.html                 TV / host screen
  controller.html            mobile controller
  viewer.html                friend/spectator screen
  editor.html                level editor
  assets/
    css/
    js/
      engine/                shared rendering/runtime helpers
      game/                  bundled run-and-gun implementation
      controller/            controller client
      editor/                drag-and-drop level editor
      viewer/                remote viewer/play client
      config/                documented extension/tuning points
    sprites/
    audio/
```

## Design rules

- The engine supports at most 4 players.
- Player identity/color is session-driven and must stay stable on refresh.
- Game screens must not rely on streaming; remote play renders from state.
- The editor must expose every enemy, boss, pickup, weapon, hazard and decor item available in the game.
- Enemy damage and player damage must remain separated; enemy explosions should not friendly-fire other enemies unless explicitly designed.

## Next recommended modularization

The current game is intentionally kept working while the filesystem is organized. The next safe step is to split `assets/js/game/game.js` into:

```text
game/
  bootstrap.js
  state.js
  levels.js
  entities/
    player.js
    enemy.js
    hazards.js
    weapons.js
  systems/
    physics.js
    combat.js
    camera.js
    audio.js
    networking.js
  render/
    world.js
    hud.js
```

Do this gradually with tests after each extraction.
