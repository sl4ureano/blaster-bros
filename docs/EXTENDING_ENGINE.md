# Extending the Engine

## Creating a new platform game

1. Duplicate the bundled game folder:
   `public/assets/js/game/`
2. Create a new HTML entry point.
3. Keep the same network contract:
   - TV host owns authoritative state
   - controllers send input
   - viewer/play clients render from state
4. Register new entities in both runtime and editor.
5. Keep all assets under `public/assets`.

## Adding a new enemy

Update:

1. `assets/js/game/game.js`
   - enemy config
   - behavior in `updateEnemy`
   - rendering if unique
2. `assets/js/editor/editor.js`
   - add it to `components`

## Adding a new weapon

Update:

1. weapon catalog
2. shoot behavior if necessary
3. editor components
4. HUD label short name

## Adding a new hazard

Update:

1. hazard update logic
2. hazard collision/damage logic
3. hazard renderer
4. shared renderer
5. editor component list
