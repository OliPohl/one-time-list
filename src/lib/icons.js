// src/lib/icons.js
// Icons for game jam work, offered for folders and task labels. Material Symbols names, all in the bundled font
// (static/m3_icons, see its .codepoints file for every name).

export const GAME_JAM_ICONS = [
  // Art
  'deployed_code', 'view_in_ar', 'brush', 'draw', 'imagesmode', 'grid_on', 'animation', 'texture',
  // Audio
  'graphic_eq', 'headphones', 'mic', 'music_note', 'piano',
  // Shaders, effects, lighting
  'gradient', 'blur_on', 'auto_awesome', 'local_fire_department', 'light_mode', 'videocam',
  // Code
  'terminal', 'data_object',
  // Design, levels, UI
  'stadia_controller', 'joystick', 'extension', 'casino', 'map', 'landscape', 'layers', 'dashboard', 'touch_app',
  // Characters, story
  'face', 'skull', 'swords', 'history_edu', 'chat',
  // Testing, release, deadline
  'fact_check', 'publish', 'hourglass_top', 'emoji_events'
];

/** A list of icons with the game jam icons after it, without doubles. @param {string[]} icons */
export const withGameJamIcons = (icons) => [...icons, ...GAME_JAM_ICONS.filter((name) => !icons.includes(name))];
