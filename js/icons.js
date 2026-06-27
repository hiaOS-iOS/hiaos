/* hiaOS — central SVG line-icon set. HIA.icon(name) -> inline <svg> string.
   24x24, currentColor stroke, scales to 1em via the .ic rule in styles.css. */
window.HIA = window.HIA || {};
(function () {
  const P = {
    // brand orbital mark (NOT a sparkle): tilted ring + core + satellite
    orbit: '<g transform="rotate(-24 12 12)"><ellipse cx="12" cy="12" rx="9" ry="3.8"/><circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none"/></g><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.6-4.3A8.5 8.5 0 1 1 21 11.5Z"/>',
    note: '<path d="M5 3.5h9l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V9h5"/><path d="M8 13h7M8 16.5h7"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3Z"/><path d="M19 14l.7 1.9L21.5 16l-1.8.6L19 18.5l-.7-1.9L16.5 16l1.8-.6L19 14Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8.5 12h0M12 12h0M15.5 12h0M8.5 16h0M12 16h0M15.5 16h0" stroke-width="2.4" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    folder: '<path d="M3 6.5a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5Z"/>',
    brush: '<path d="M4 20s1-3 3-3 3 2 3 2-1 1-3 1-3 0-3 0Z"/><path d="M9 17l9-9a2 2 0 0 0-3-3l-9 9"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
    expand: '<path d="M9 6 5 12l4 6"/><path d="M14 6h6M14 12h6M14 18h6"/>',
    collapse: '<path d="M15 6l4 6-4 6"/><path d="M4 6h6M4 12h6M4 18h6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    maximize: '<path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3M16 20h3a1 1 0 0 0 1-1v-3"/>',
    split: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 12h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M5 12 19 5l-4 14-3.5-5.5L5 12Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M6.5 7l.8 12.5a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L18.5 7"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 16V5a1 1 0 0 1 1-1h9"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 3l3 3M14.5 5.5 17 8"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-3"/>'
  };
  HIA.icon = function (name, cls) {
    const body = P[name] || P.orbit;
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  // Animated orb mark (satellite revolves around the ring)
  HIA.orbMark = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="rotate(-24 12 12)">' +
    '<ellipse cx="12" cy="12" rx="9" ry="3.8"/><circle r="1.6" fill="currentColor" stroke="none">' +
    '<animateMotion dur="6s" repeatCount="indefinite" path="M3 12a9 3.8 0 1 0 18 0a9 3.8 0 1 0 -18 0"/></circle></g>' +
    '<circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></svg>';
})();
