// ================= INTERFACE : coquille =================
const TABS = [
  { id:"today",    n:"Aujourd'hui", icon:"home" },
  { id:"history",  n:"Historique",  icon:"clock" },
  { id:"progress", n:"Progrès",     icon:"chart" },
  { id:"profil",   n:"Profil",      icon:"user" },
];

const ICONS = {
  leaf:'<path d="M19.8 4.2C10.2 4.2 5 8.8 5 15c0 1.7.5 3.1 1.2 4.2 1-4.1 4-7.6 8.4-9.7-3.7 2.7-6.1 6.2-6.9 10C17.2 20.4 20.4 13 19.8 4.2Z" fill="currentColor"/>',
  lock:'<rect x="6" y="10.5" width="12" height="9.5" rx="2.2" fill="currentColor"/><path d="M8.6 10.5V8a3.4 3.4 0 0 1 6.8 0v2.5" stroke="currentColor" stroke-width="2" fill="none"/>',
  bolt:'<path d="M13.2 2.8 5.5 13.3h5.6l-.9 7.9 7.9-10.8h-5.7Z" fill="currentColor"/>',
  target:'<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.9" fill="none"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.9" fill="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  warn:'<path d="M12 4 21 19.5H3Z" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linejoin="round"/><path d="M12 10v4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.1" fill="currentColor"/>',
  star:'<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="currentColor"/>',
  sparkle:'<path d="m10 3.5 1.7 4.6 4.6 1.7-4.6 1.7L10 16.1l-1.7-4.6-4.6-1.7 4.6-1.7Z" fill="currentColor"/><path d="m17.5 13 .8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z" fill="currentColor"/>',
  home:'<path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  clock:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chart:'<path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  user:'<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  check:'<path d="M5 13l4.5 4.5L19 8" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chev:'<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  close:'<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus:'<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12 14v3M9 20h6M9.5 17h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  flame:'<path d="M12 3s4 3.5 4 7.5a4 4 0 1 1-8 0c0-1 .4-1.8 1-2.5-.1 1 .3 1.6.9 1.9C9.6 7 10.5 5 12 3Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  edit:'<path d="M4 20l.9-3.6L16.4 5 19 7.6 7.6 19 4 20Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  timer:'<circle cx="12" cy="13" r="7.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5M12 2.5v2.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  undo:'<path d="M9 14 4 9l5-5" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
  swap:'<path d="M6 8h11l-3-3M18 16H7l3 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  play:'<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  bookmark:'<path d="M7 4h10v16l-5-3.6L7 20V4Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  repeat:'<path d="M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1M7 21l-3-3 3-3M4 18h12a4 4 0 0 0 4-4v-1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  search:'<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  trash:'<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

// ---------- icônes façon Réglages d'iOS : glyphe blanc sur pastille colorée ----------
const IOS_COL = { orange:"#F2622F", red:"#FF3B30", yellow:"#FFCC00", green:"#34C759", mint:"#00C7BE", teal:"#30B0C7", blue:"#007AFF", indigo:"#5856D6", purple:"#AF52DE", pink:"#FF2D55", gray:"#8E8E93", brown:"#A2845E" };
const S_ = 'stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const GLYPHS = {
  dumbbell:`<path d="M6.5 7.5v9M17.5 7.5v9M3.8 10v4M20.2 10v4M6.5 12h11" ${S_} stroke-width="2.4"/>`,
  flame:'<path d="M12 21c-3.4 0-6-2.5-6-5.9 0-3.4 2.4-5.3 3.6-7.8.3 1.7 1.2 2.8 2.2 3.2.2-3 1.4-5.6 3.6-7.5-.2 3.1 3.1 5.3 3.1 9.9 0 4.9-2.6 8.1-6.5 8.1Z" fill="#fff"/>',
  star:'<path d="m12 3.3 2.7 5.4 5.9.9-4.3 4.2 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.3-4.2 5.9-.9Z" fill="#fff"/>',
  calPlan:`<rect x="4" y="5.5" width="16" height="14.5" rx="2.5" ${S_}/><path d="M4 10.2h16M8.5 3.5v3.6M15.5 3.5v3.6" ${S_}/><path d="m9 15 2 2 4-4" ${S_}/>`,
  // ---- v2.4 : glyphes des trophées ----
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" fill="#fff"/>',
  anvil:'<path d="M3.5 7.5h11.5c.6 2.2 2.5 3.2 5.5 3.2v1.6h-5l-1.3 2.7h1.8v3.5H8v-3.5h1.8L8.5 12.3C5.2 12 3.5 10.2 3.5 7.5Z" fill="#fff"/>',
  trendUp:`<path d="m4 17 5.2-5.2 3.4 3.4L20 7.8" ${S_} stroke-width="2.4"/><path d="M14.6 7.8H20v5.4" ${S_} stroke-width="2.4"/>`,
  cap:`<path d="M12 5 2.5 9.4 12 13.8l9.5-4.4Z" fill="#fff"/><path d="M6.5 11.6v3.9c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-3.9M20.6 10v5" ${S_}/>`,
  plate:`<circle cx="12" cy="12" r="8" ${S_} stroke-width="2.4"/><circle cx="12" cy="12" r="3.2" ${S_}/><circle cx="12" cy="12" r=".9" fill="#fff"/>`,
  hourglass:`<path d="M6.5 3.8h11M6.5 20.2h11" ${S_}/><path d="M8 3.8c0 4.4 8 4.8 8 8.2s-8 3.8-8 8.2M16 3.8c0 4.4-8 4.8-8 8.2s8 3.8 8 8.2" ${S_}/><path d="M9.6 18.6 12 16.4l2.4 2.2Z" fill="#fff"/>`,
  compass:`<circle cx="12" cy="12" r="8.3" ${S_}/><path d="m15.8 8.2-2.4 5.2-5.2 2.4 2.4-5.2Z" fill="#fff"/>`,
  gauge:`<path d="M4.2 16.5a7.8 7.8 0 1 1 15.6 0" ${S_} stroke-width="2.4"/><path d="m12 16.2 4-5.4" ${S_} stroke-width="2.4"/><circle cx="12" cy="16.2" r="1.6" fill="#fff"/>`,
  sunrise:`<path d="M3.5 18.5h17M7 18.5a5 5 0 0 1 10 0M12 5.5v3M5.4 9.4l2 2M18.6 9.4l-2 2" ${S_}/>`,
  moon:'<path d="M15.8 4.2a8 8 0 1 0 4 13.2 6.8 6.8 0 0 1-4-13.2Z" fill="#fff"/>',
  sun:`<circle cx="12" cy="12" r="4" fill="#fff"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.5 1.5M16.7 16.7l1.5 1.5M5.8 18.2l1.5-1.5M16.7 7.3l1.5-1.5" ${S_}/>`,
  shield:'<path d="M12 3.2 19.5 6v5.6c0 4.6-3.2 7.9-7.5 9.3-4.3-1.4-7.5-4.7-7.5-9.3V6Z" fill="#fff"/>',
  leg:`<path d="M9.2 3.5v7.2L7.6 17c-.3 1.2.5 2.4 1.8 2.4h7" ${S_} stroke-width="2.8"/>`,
  ruler:`<path d="M4.5 19.5V4.5l15 15Z" ${S_}/><path d="M8.5 15.5h3v-3" ${S_}/><path d="M4.5 9h2M4.5 13h2" ${S_}/>`,
  gift:`<rect x="4.5" y="10.2" width="15" height="9.6" rx="1.6" ${S_}/><path d="M3.5 7h17v3.2h-17ZM12 7v12.8" ${S_}/><path d="M12 7c-1.8-3.6-5.2-3-4.2-.1M12 7c1.8-3.6 5.2-3 4.2-.1" ${S_}/>`,
  leaf:'<path d="M19.8 4.2C10.2 4.2 5 8.8 5 15c0 1.7.5 3.1 1.2 4.2 1-4.1 4-7.6 8.4-9.7-3.7 2.7-6.1 6.2-6.9 10C17.2 20.4 20.4 13 19.8 4.2Z" fill="#fff"/>',
  lock:`<rect x="6" y="10.5" width="12" height="9.5" rx="2.2" fill="#fff"/><path d="M8.6 10.5V8a3.4 3.4 0 0 1 6.8 0v2.5" ${S_} stroke-width="2.2"/>`,
  cup:`<path d="M7.5 4h9v5.6a4.5 4.5 0 0 1-9 0Z" fill="#fff"/><path d="M7.5 6H4.8c0 2.6 1.3 4.2 3.2 4.6M16.5 6h2.7c0 2.6-1.3 4.2-3.2 4.6M12 14.2v3.3M8.5 20h7M9.8 17.5h4.4" ${S_}/>`,
  phoenix:'<path d="M12 21c-3 0-5.2-2.2-5.2-5.1 0-2.2 1.3-3.6 2.6-5 .2 1.4 1 2.2 1.9 2.5-.4-2.6.6-5.2 3.2-7.4-.4 2.6 3.3 4.4 3.3 8.6 0 3.8-2.4 6.4-5.8 6.4Z" fill="#fff"/><path d="M4 9.5c1.5.3 2.6 1 3.3 2M20 9.5c-1.5.3-2.6 1-3.3 2M6 5.5c1.2.6 2 1.4 2.4 2.5M18 5.5c-1.2.6-2 1.4-2.4 2.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  storage:`<ellipse cx="12" cy="6.5" rx="7" ry="2.8" ${S_}/><path d="M5 6.5v11c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-11M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" ${S_}/>`,
  bookmarkG:'<path d="M7 3.8h10a1 1 0 0 1 1 1V20l-6-4-6 4V4.8a1 1 0 0 1 1-1Z" fill="#fff"/>',
  search:`<circle cx="10.5" cy="10.5" r="5.5" ${S_}/><path d="m15 15 4.5 4.5" ${S_}/>`,
  chart:`<path d="M5 19V11M10 19V6M15 19v-5M20 19V9" ${S_} stroke-width="2.6"/>`,
  flag:`<path d="M6 20V4.5" ${S_}/><path d="M6 5h10.5l-2 3.2 2 3.3H6Z" fill="#fff"/>`,
  history:`<circle cx="12" cy="12" r="7.5" ${S_}/><path d="M12 8v4.2l2.8 1.8" ${S_}/>`,
  calendar:`<rect x="4" y="5.5" width="16" height="14.5" rx="2.5" ${S_}/><path d="M4 10.2h16M8.5 3.5v3.6M15.5 3.5v3.6" ${S_}/>`,
  stopwatch:`<circle cx="12" cy="13.5" r="7" ${S_}/><path d="M12 13.5V9.8M9.8 3h4.4M18 6.8l1.4-1.4" ${S_}/>`,
  trophy:`<path d="M8 4h8v5.2a4 4 0 0 1-8 0Z" fill="#fff"/><path d="M8 6H5.2c0 2.3 1.2 3.8 3 4M16 6h2.8c0 2.3-1.2 3.8-3 4M12 13.3v3.7M8.5 20h7" ${S_}/>`,
  mountain:'<path d="m2.8 19.5 6.6-11.2 4.1 6.6 2.6-3.6 5.1 8.2Z" fill="#fff"/>',
  bolt:'<path d="M13.4 2.5 5 13.6h6.1l-1.1 7.9 8.3-11.2h-6.1Z" fill="#fff"/>',
  toolbox:`<rect x="3.5" y="8.5" width="17" height="11" rx="2" ${S_}/><path d="M9 8.5V6h6v2.5M3.5 13.2h17M12 12v2.5" ${S_}/>`,
  scale:`<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.2" ${S_}/><path d="M8.6 10a4.6 4.6 0 0 1 6.8 0" ${S_}/><path d="m12 12 1.3-2.2" ${S_}/>`,
  target:`<circle cx="12" cy="12" r="8" ${S_}/><circle cx="12" cy="12" r="4.4" ${S_}/><circle cx="12" cy="12" r="1.4" fill="#fff"/>`,
  list:`<path d="M9.5 7h10M9.5 12h10M9.5 17h10" ${S_}/><circle cx="5.2" cy="7" r="1.3" fill="#fff"/><circle cx="5.2" cy="12" r="1.3" fill="#fff"/><circle cx="5.2" cy="17" r="1.3" fill="#fff"/>`,
  sparkles:'<path d="m10.5 3 1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9Z" fill="#fff"/><path d="m18 13.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z" fill="#fff"/>',
  contrast:`<circle cx="12" cy="12" r="8" ${S_}/><path d="M12 4a8 8 0 0 1 0 16Z" fill="#fff"/>`,
  speaker:`<path d="M4 9.3h3.6L12 5.3v13.4l-4.4-4H4Z" fill="#fff"/><path d="M15.3 9a4.2 4.2 0 0 1 0 6M17.8 6.6a7.6 7.6 0 0 1 0 10.8" ${S_}/>`,
  tap:`<circle cx="12" cy="12" r="3" fill="#fff"/><circle cx="12" cy="12" r="7" ${S_} opacity=".55"/>`,
  trash:`<path d="M4.8 7h14.4M10 4h4M7 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h5.2a1.5 1.5 0 0 0 1.5-1.3L17 7M10.3 10.5v6M13.7 10.5v6" ${S_}/>`,
  info:'<circle cx="12" cy="7" r="1.5" fill="#fff"/><path d="M12 10.8v7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  person:'<circle cx="12" cy="7.5" r="3.6" fill="#fff"/><path d="M4.8 20.5c.5-4.2 3.4-6.4 7.2-6.4s6.7 2.2 7.2 6.4Z" fill="#fff"/>',
  barbell:`<path d="M2.8 12h18.4M6 7.8v8.4M8.8 9.5v5M15.2 9.5v5M18 7.8v8.4" ${S_}/>`,
  kettlebell:`<path d="M8.8 9a3.2 3.2 0 0 1 6.4 0" ${S_}/><circle cx="12" cy="14.8" r="5.4" fill="#fff"/>`,
  bench:`<path d="M3.5 11h17M6 11v7.5M18 11v7.5M9 11V7.5h6V11" ${S_}/>`,
  bar:`<path d="M3 4.8h18M8.2 4.8l2.4 4.8M15.8 4.8l-2.4 4.8M12 13.2v6.3" ${S_}/><circle cx="12" cy="11.4" r="1.9" fill="#fff"/>`,
  band:`<path d="M3.5 12c2.2-6 6.3-6 8.5 0s6.3 6 8.5 0" ${S_}/>`,
  mat:`<path d="M3.5 16.5h11.5a3.2 3.2 0 0 0 0-6.4H6.5a2 2 0 0 0 0 4h8.2" ${S_}/>`,
  wrench:'<path d="M15.2 3.8a4.6 4.6 0 0 0-4.3 6.3L4.3 16.7a1.9 1.9 0 0 0 2.7 2.7l6.6-6.6a4.6 4.6 0 0 0 6.3-4.3l-2.8 2.8-2.6-.6-.6-2.6Z" fill="#fff"/>',
  medal:`<path d="M8 3.5 10.2 9M16 3.5 13.8 9" ${S_}/><circle cx="12" cy="14.5" r="5.5" fill="#fff"/>`,
  repeat:`<path d="M5 11V9.5A3.5 3.5 0 0 1 8.5 6H19m-3-3 3 3-3 3M19 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5m3 3-3-3 3-3" ${S_}/>`,
  pencil:'<path d="m15.8 4.2 4 4L9 19l-5 1 1-5Z" fill="#fff"/>',
  benchIncline:`<path d="M3.5 17h10M5.5 17v3M11.5 17v3M9.5 17l7-9.5" ${S_}/>`,
  benchPress:`<path d="M3.5 14.5h11M5.5 14.5v5M12.5 14.5v5M18 4.5v15M2.5 8.5h19" ${S_}/>`,
  rack:`<path d="M6 3.5v17M18 3.5v17M3.5 20.5h17M2.5 9h19M4 7v4M20 7v4" ${S_}/>`,
  dips:`<path d="M4.5 20V9.5h5M19.5 20V9.5h-5" ${S_}/><path d="M9.5 9.5v2.5M14.5 9.5v2.5" ${S_}/>`,
  straps:`<path d="M12 3v3.5M12 6.5 7.5 16M12 6.5l4.5 9.5M5 16h5M14 16h5" ${S_}/>`,
  wheel:`<circle cx="12" cy="12" r="5.6" ${S_}/><circle cx="12" cy="12" r="1.7" fill="#fff"/><path d="M2.8 12h3.6M17.6 12h3.6" ${S_}/>`,
  rope:`<path d="M6.5 17c0-10 11-10 11 0" ${S_}/><path d="M6.5 16.5v4M17.5 16.5v4" ${S_} stroke-width="3"/>`,
  download:`<path d="M12 3.8v11M7.6 10.6 12 15l4.4-4.4M5 19.6h14" ${S_}/>`,
  restore:`<path d="M12 20.2v-11M7.6 13.4 12 9l4.4 4.4M5 4.4h14" ${S_}/>`,
  phone:`<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" ${S_}/><path d="M12 8.6v5.6M9.2 11.4h5.6" ${S_}/>`,
};
function sfIcon(name, color, extra){
  return `<span class="sfi ${extra||""}" style="--c:${IOS_COL[color]||color}" aria-hidden="true"><svg viewBox="0 0 24 24">${GLYPHS[name]||""}</svg></span>`;
}

function icon(name){ return `<svg viewBox="0 0 24 24">${ICONS[name]||""}</svg>`; }
// ---------- logotype ASCEN ----------
// Mot dessiné au trait (une seule épaisseur, bouts arrondis) ; la barre du A est relevée près du
// sommet et porte l'orange. ASCEN_MONO = ce A seul (icône d'app, petites tailles).
const ASCEN_LETTERS = "M4 52L21 12L38 52M69.66 17A10 10 0 1 0 61 32A10 10 0 1 1 52.34 47M118.55 19.79A19 19 0 1 0 118.55 44.21M160 12H132V52H160M132 32H156M171 52V12L199 52V12";
const ASCEN_BAR = "M8 20H34";
const ASCEN_MONO = { a:"M15 54L32 11L49 54", bar:"M18 21H46" };
function ascenMark(cls, withBar){
  return `<svg class="ascen-mark ${cls||""}" viewBox="0 5 206 56" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="ASCEN"><path d="${ASCEN_LETTERS}"/>${withBar===false?"":`<path class="bar" d="${ASCEN_BAR}"/>`}</svg>`;
}
// petite icône alignée sur le texte (remplace les emojis dans les libellés)
function ii(name, cls){ return `<svg class="ii ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||""}</svg>`; }

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function qs(sel,root){ return (root||document).querySelector(sel); }
function qsa(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }

// ---------- tabbar ----------
function buildShell(){
  qs("#app").innerHTML = TABS.map(t=>`<div class="view" id="v-${t.id}"></div>`).join("");
  if(!qs("#charttip")){ const t = document.createElement("div"); t.id = "charttip"; t.setAttribute("role","tooltip"); document.body.appendChild(t); }
  qs(".tabbar").innerHTML = TABS.map(t=>`<button class="tabbtn" data-a="tab" data-id="${t.id}">${icon(t.icon)}<span class="tl">${t.n}</span></button>`).join("");
  // défilement : barre de navigation translucide et grand titre qui se replie façon iOS
  // (une seule écriture par image, uniquement des propriétés composées par le GPU)
  qsa(".view").forEach(v=>{
    let pending = false;
    v.addEventListener("scroll", ()=>{
      if(pending) return; pending = true;
      requestAnimationFrame(()=>{
        pending = false;
        const y = v.scrollTop;
        v.classList.toggle("scrolled", y>4);
        const lt = v.querySelector(".lt");
        if(lt){ const k = Math.max(0, Math.min(1, y/70)); lt.style.opacity = (1-k*0.9).toFixed(2); lt.style.transform = k ? `translateY(${(k*6).toFixed(1)}px) scale(${(1-k*0.06).toFixed(3)})` : ""; }
      });
    }, { passive:true });
  });
}

let currentTab = "today";
const TAB_ORDER = ["today","history","progress","profil"];
// transitions entre écrans : View Transitions (Safari 18+, Chrome) quand disponible,
// sinon l'animation d'entrée CSS habituelle
const canVT = ()=>!!document.startViewTransition && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
function withTransition(kind, fn){
  if(!canVT()) return fn();
  document.documentElement.dataset.vt = kind;
  const t = document.startViewTransition(fn);
  // deux changements rapprochés interrompent la transition précédente : ses promesses sont
  // rejetées (AbortError), sans conséquence ; une erreur de l'écran lui-même est notée
  const done = ()=>{ if(document.documentElement.dataset.vt===kind) delete document.documentElement.dataset.vt; };
  t.finished.then(done, done);
  t.ready.catch(()=>{});
  if(t.updateCallbackDone) t.updateCallbackDone.catch(err=>{ if(!err || err.name!=="AbortError") reportError("transition", err); });
}
// Changement d'onglet (v4.0) : comme sur iOS, immédiat et léger. L'écran d'arrivée apparaît en
// fondu court avec un petit glissement dans le sens de l'onglet ; son contenu n'est reconstruit
// que si les données ont changé, et les animations d'entrée (cartes en cascade, compteurs) ne se
// jouent qu'à la première visite. Avant : capture de toute la page (View Transitions) + cascade
// rejouée à chaque visite, ce qui donnait l'impression d'un rechargement.
function switchTab(id){ switchTabNow(id); }
function switchTabNow(id){
  const from = TAB_ORDER.indexOf(currentTab), to = TAB_ORDER.indexOf(id);
  const v = qs("#v-"+id); if(!v) return;
  const changed = currentTab!==id;
  v.dataset.dir = !changed || from<0 ? "" : to>from ? "r" : "l";
  currentTab = id;
  qsa(".tabbtn").forEach(b=>{ const on = b.dataset.id===id; b.classList.toggle("on", on); if(on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  qsa(".view").forEach(x=>x.classList.toggle("active", x===v));
  const upToDate = v._ver===DATA_VER && v._day===todayISO() && v.firstChild;
  if(!upToDate){
    const first = !v._seen; v._seen = true;
    if(first){ v.classList.add("enter"); clearTimeout(enterTimer); enterTimer = setTimeout(()=>v.classList.remove("enter"), 1200); }
    renderView(id);
    if(first) animateCounts(v);
  } else settleSegs(v);
  // fondu d'arrivée par l'API Web Animations : aucune mise en page forcée, rien à nettoyer
  if(changed && v.animate && !reducedMotion()){
    const dx = v.dataset.dir==="r" ? 12 : v.dataset.dir==="l" ? -12 : 0;
    try{ v.animate([{ opacity:0, transform:`translateX(${dx}px)` }, { opacity:1, transform:"none" }], { duration:220, easing:"cubic-bezier(.2,.8,.2,1)" }); }catch(e){}
  }
  if(typeof renderRestBar==="function") renderRestBar();
  syncLiveChrome();
  prerenderStaleViews();
}
// Onglets déjà visités dont les données ont changé : reconstruits pendant les temps morts (un à la
// fois), pour que le prochain changement d'onglet soit instantané au lieu de reconstruire au toucher.
// Rien pendant une séance en cours (barre d'onglets masquée, batterie) ni pour les trophées 3D.
let prerenderQueued = false;
function prerenderStaleViews(){
  if(prerenderQueued) return;
  const idle = window.requestIdleCallback || (f=>setTimeout(()=>f({ timeRemaining:()=>12, didTimeout:false }), 400));
  const stale = ()=>(S.draft && S.draft.startedAt) ? [] : TAB_ORDER.filter(id=>id!==currentTab).map(id=>qs("#v-"+id))
    .filter(v=>v && v._seen && !(v._ver===DATA_VER && v._day===todayISO()) && !(v.id==="v-progress" && typeof progressTab!=="undefined" && progressTab==="medals"));
  prerenderQueued = true;
  idle(function step(dl){
    const list = stale();
    if(!list.length){ prerenderQueued = false; return; }
    if(dl && !dl.didTimeout && dl.timeRemaining()<10){ idle(step, { timeout:3000 }); return; }
    try{ renderView(list[0].id.slice(2)); }catch(e){}
    if(list.length>1) idle(step, { timeout:3000 }); else prerenderQueued = false;
  }, { timeout:3000 });
}
// onglet déjà affiché touché à nouveau : retour en haut en douceur (convention iOS) ; déjà en
// haut de Progrès sur un sous-onglet : retour au résumé. Jamais de reconstruction de la page.
function reselectTab(){
  const v = qs("#v-"+currentTab); if(!v) return;
  if(v.scrollTop>4){ try{ v.scrollTo({ top:0, behavior:reducedMotion() ? "auto" : "smooth" }); }catch(e){ v.scrollTop = 0; } return; }
  if(currentTab==="progress" && typeof progressTab!=="undefined" && progressTab!=="overview" && ACT.progressTab) ACT.progressTab({ v:"overview" });
}
// séance en cours à l'écran : la barre d'onglets s'efface (toute la hauteur pour l'effort, rien
// ne passe dessous) ; « Terminer » et la croix restent en haut pour sortir
function syncLiveChrome(){ document.body.classList.toggle("live-focus", currentTab==="today" && !!(S.draft && S.draft.startedAt)); }

const VIEWS = {};
function renderView(id){
  if(id==="today" && typeof syncWakeLock==="function") syncWakeLock();
  const el = qs("#v-"+id);
  if(!el || !VIEWS[id]) return;
  const scrollTop = el.scrollTop;
  hideTip();
  // un écran qui échoue (donnée inattendue) ne doit ni rester vide ni bloquer l'app : message
  // sobre et bouton pour réessayer, les autres onglets restent utilisables
  let html;
  try{ html = VIEWS[id](); }catch(err){ reportError("écran "+id, err); html = viewErrorHTML(id); }
  el.innerHTML = html;
  if(id==="today") syncLiveChrome();
  el._ver = DATA_VER; el._day = todayISO(); // rendu à jour pour ces données
  el.classList.toggle("scrolled", scrollTop>4);
  // rétablir la position force une mise en page immédiate : inutile en haut de page (cas courant)
  if(scrollTop>0) el.scrollTop = scrollTop;
  settleSegs(el);
  if(typeof afterRenderView==="function") try{ afterRenderView(id, el); }catch(err){ reportError("après "+id, err); }
}
function viewErrorHTML(id){
  return `<div class="content"><div class="empty-state view-err"><span class="em">${ii("warn")}</span>
    Cet écran n'a pas pu s'afficher.<br>Tes données ne sont pas touchées.
    <div class="btnrow" style="justify-content:center"><button class="btn secondary sm" data-a="retryView" data-v="${id}">Réessayer</button></div></div></div>`;
}
// rendu avec entrée animée (apparition décalée des éléments .stagger, compteurs)
// — réservé aux changements d'onglet ou de section, pas aux rendus après chaque action.
let enterTimer = null;
function renderViewAnimated(id, reuse){
  const el = qs("#v-"+id);
  if(!el) return;
  // changement d'onglet sans modification des données : on réutilise le rendu existant
  // (ni reconstruction du HTML ni nouvelle mise en page complète) ; il faut alors relancer
  // les animations d'entrée. Un rendu neuf les joue de lui-même (éléments nouveaux).
  if(reuse && el._ver===DATA_VER && el._day===todayISO() && el.firstChild){
    el.classList.remove("enter"); void el.offsetWidth;
    el.classList.add("enter"); settleSegs(el);
  } else { el.classList.add("enter"); renderView(id); }
  animateCounts(el);
  clearTimeout(enterTimer);
  enterTimer = setTimeout(()=>{ el.classList.remove("enter"); el.dataset.dir = ""; }, 1200);
}

// ---------- contrôle segmenté avec indicateur glissant ----------
const SEG_PREV = {};
function segHTML(key, options, cur, action){
  const idx = Math.max(0, options.findIndex(o=>o[0]===cur));
  return `<div class="seg" data-seg="${key}" data-cur="${idx}" style="--n:${options.length}" role="tablist">
    <span class="seg-ind"></span>
    ${options.map(([id,label])=>`<button role="tab" aria-selected="${id===cur}" class="${id===cur?"on":""}" data-a="${action}" data-v="${id}">${label}</button>`).join("")}
  </div>`;
}
// L'indicateur glisse de l'ancienne à la nouvelle position. Web Animations plutôt qu'une
// transition relancée par lecture de offsetWidth : cette lecture forçait la mise en page
// complète de l'écran qu'on venait de construire (≈ 20 ms par rendu sur téléphone).
function settleSegs(root){
  qsa(".seg", root).forEach(sg=>{
    const key = sg.dataset.seg, cur = +sg.dataset.cur, ind = qs(".seg-ind", sg);
    const prev = SEG_PREV[key]==null ? cur : SEG_PREV[key];
    SEG_PREV[key] = cur;
    ind.style.transition = "none";
    ind.style.transform = `translateX(${cur*100}%)`;
    if(prev!==cur && ind.animate) try{ ind.animate([{ transform:`translateX(${prev*100}%)` }, { transform:`translateX(${cur*100}%)` }], { duration:320, easing:"cubic-bezier(.32,.72,0,1)" }); }catch(e){}
  });
}

// ---------- compteurs animés ----------
function animateCounts(root){
  const els = qsa("[data-count]", root);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  els.forEach(el=>{
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.dec||0), unit = el.dataset.unit;
    const fmt = v => (dec ? v.toLocaleString("fr-CH",{minimumFractionDigits:dec,maximumFractionDigits:dec}) : fmtNum(v)) + (unit?" "+unit:"");
    if(reduce || !(target>0)){ el.textContent = fmt(target||0); return; }
    const t0 = performance.now(), dur = 800;
    (function step(t){
      const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = fmt(target*e);
      if(p<1) requestAnimationFrame(step);
    })(t0);
  });
}

// ---------- info-bulle des graphiques (appui ou focus clavier) ----------
let tipOn = null;
function showTip(target){
  const tip = qs("#charttip");
  if(!tip) return;
  if(tipOn) tipOn.classList.remove("tip-on");
  tipOn = target; target.classList.add("tip-on");
  tip.textContent = target.dataset.tip;
  tip.classList.add("show");
  // graphiques : la bulle se pose en haut du graphique, au-dessus de la colonne ou du point touché
  // (avant, elle montait au-dessus de toute la colonne et recouvrait le titre et les onglets) ;
  // si la barre ou le point monte jusque-là, elle se décale à côté
  const bar = target.classList.contains("cc-col") && qs(".cc-bar", target);
  const r = (bar || target).getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  const plot = target.closest(".cc-plot, .linechart");
  let x = r.left + r.width/2 - tw/2; x = Math.max(8, Math.min(innerWidth-tw-8, x));
  let y = r.top - th - 8;
  if(plot){
    y = Math.max(8, plot.getBoundingClientRect().top - 4);
    const cy = lineHitCenter(target, r);
    if(cy < y + th + 6 && r.left < x + tw && r.right > x) x = r.right + 8 + tw <= innerWidth - 8 ? r.right + 8 : Math.max(8, r.left - 8 - tw);
  } else if(y<8) y = r.bottom + 8;
  tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
// haut de ce qui est montré : sommet de la barre, ou centre du point d'une courbe (zone de toucher plus large)
function lineHitCenter(target, r){ return target.classList.contains("lc-hit") ? r.top + r.height/2 - 5 : r.top; }
function hideTip(){
  const tip = qs("#charttip");
  if(tip) tip.classList.remove("show");
  qsa(".lc-cursor.on,.lc-cdot.on").forEach(x=>x.classList.remove("on"));
  if(tipOn){ tipOn.classList.remove("tip-on"); tipOn = null; }
}
document.addEventListener("click", e=>{
  const t = e.target.closest("[data-tip]");
  // pas de bascule : le focus (qui précède le clic) a déjà pu afficher la bulle
  if(t) showTip(t); else hideTip();
});
document.addEventListener("focusin", e=>{ const t = e.target.closest && e.target.closest("[data-tip]"); if(t) showTip(t); });
document.addEventListener("scroll", hideTip, true);

// ---------- saisie d'une valeur numérique ----------
function promptNumber({title, value, unit, step, onOk}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">${esc(title)}</div>
    <div class="num-field"><input id="numInput" type="number" inputmode="decimal" step="${step||"any"}" value="${value??""}"><span>${esc(unit||"")}</span></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn" data-a="numOk">Valider</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onNum = onOk;
  setTimeout(()=>{ const i=qs("#numInput"); if(i){ i.focus(); i.select(); } }, 80);
}
function changed(){
  save();
  const sheetOpen = qs("#overlay").classList.contains("open");
  if(!sheetOpen) renderView(currentTab);
  else dirtyOnClose = true;
}
let dirtyOnClose = false;

// ---------- sheets / overlay ----------
// _gen : chaque ouverture incrémente le compteur, pour qu'une fermeture en cours
// (nettoyage différé de 300 ms) n'efface pas une sheet ouverte entre-temps.
let overlayGen = 0;
function showOverlay(inner, kind){
  const ov = qs("#overlay");
  const gen = ++overlayGen;
  hideTip();
  ov.innerHTML = `<div class="scrim" data-a="dismisssheet"></div>${inner}`;
  ov.classList.add("open");
  if(typeof syncStatusBar==="function") syncStatusBar(true);
  ov.dataset.kind = kind;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(gen===overlayGen) ov.classList.add("show"); }));
}
// ---------- pile de feuilles ----------
// Une feuille ouverte DEPUIS une autre (fiche d'un exercice depuis la liste, liste depuis
// l'éditeur de séance) garde le chemin du retour : glisser vers le bas, toucher le fond ou ✕
// reviennent à la feuille précédente au lieu de tout fermer (et de perdre l'édition en cours).
// opts.restore : comment redessiner CETTE feuille si on y revient ; opts.child : empiler la
// feuille courante ; opts.onBack : quoi faire au lieu de fermer (ex. liste → éditeur).
let sheetStack = [], sheetRestore = null, sheetOnBack = null, sheetRestoring = false;
function sheetShown(){ const ov = qs("#overlay"); return ov.classList.contains("show") && ov.dataset.kind==="sheet"; }
function sheetCanGoBack(){ return sheetStack.length>0 || !!sheetOnBack; }
function sheetBack(){
  if(sheetStack.length){
    const r = sheetStack.pop();
    sheetRestoring = true;
    try{ r(); } catch(e){ sheetStack = []; closeSheet(); } finally{ sheetRestoring = false; }
    return true;
  }
  if(sheetOnBack){ const f = sheetOnBack; sheetOnBack = null; f(); return true; }
  return false;
}
function openSheet(html, opts){
  opts = opts||{};
  if(!sheetRestoring){
    if(!sheetShown()) sheetStack = [];
    else if(opts.child && sheetRestore) sheetStack.push(sheetRestore);
  }
  sheetRestore = opts.restore || null;
  sheetOnBack = opts.onBack || null;
  showOverlay(`<div class="sheet ${opts.tall?"tall":""}" role="dialog">${opts.noGrab?"":'<div class="sheet-grab"></div>'}${html}${opts.footer?`<div class="sheet-ft">${opts.footer}</div>`:""}</div>`, "sheet");
}
function openModal(html){
  // une confirmation remplace la feuille : « Annuler » ferme tout, comme avant
  sheetStack = []; sheetRestore = null; sheetOnBack = null;
  showOverlay(`<div class="center-modal" role="dialog">${html}</div>`, "modal");
}
function closeSheet(){
  const ov = qs("#overlay");
  if(!ov.classList.contains("open")) return;
  ov.classList.remove("show");
  if(typeof syncStatusBar==="function") syncStatusBar(false);
  sheetStack = []; sheetRestore = null; sheetOnBack = null;
  const gen = overlayGen;
  setTimeout(()=>{
    if(gen!==overlayGen) return;
    ov.classList.remove("open"); ov.innerHTML="";
    if(dirtyOnClose){ dirtyOnClose=false; renderView(currentTab); }
  },300);
}
// ---------- glisser vers le bas pour fermer (comme les feuilles d'iOS) ----------
// Depuis la poignée ou l'en-tête, ou depuis le contenu quand il est déjà tout en haut.
// Une séance en cours d'édition avec des changements demande confirmation au lieu de fermer.
function sheetDismissGuard(){
  if(typeof tplEdit!=="undefined" && tplEdit && tplEdit.dirty && qs("#tplEdBody")){ ACT.tplEdCancel(); return true; }
  return false;
}
function dismissSheet(){ if(sheetBack()) return; if(!sheetDismissGuard()) closeSheet(); }
(function(){
  let drag = null;
  function scrollerOf(el, sheet){
    for(let n = el; n && n!==sheet; n = n.parentElement){
      if(n.scrollHeight>n.clientHeight+1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
    }
    return null;
  }
  function start(x, y, target){
    const ov = qs("#overlay");
    if(!ov.classList.contains("show") || ov.dataset.kind!=="sheet") return;
    const sheet = target.closest && target.closest(".sheet");
    if(!sheet || !qs(".sheet-grab", sheet) || target.closest("input,textarea,select")) return;
    const onHandle = !!target.closest(".sheet-grab,.sheet-hd");
    drag = { sheet, x0:x, y0:y, active:false, scroller: onHandle ? null : scrollerOf(target, sheet), dy:0, lastY:y, lastT:performance.now(), v:0 };
  }
  function move(x, y, e){
    if(!drag) return;
    const dy = y-drag.y0, dx = x-drag.x0;
    if(!drag.active){
      if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)){ drag = null; return; }  // défilement horizontal (puces)
      if(dy<-4 || (drag.scroller && drag.scroller.scrollTop>0)){ drag = null; return; }
      if(dy<8) return;
      drag.active = true; drag.y0 = y; drag.sheet.style.transition = "none";
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
    }
    if(e && e.cancelable) e.preventDefault();
    const d = Math.max(0, y-drag.y0), now = performance.now();
    drag.v = (y-drag.lastY)/Math.max(1, now-drag.lastT); drag.lastY = y; drag.lastT = now; drag.dy = d;
    drag.sheet.style.transform = `translateY(${d}px)`;
    const sc = qs("#overlay .scrim"); if(sc) sc.style.opacity = String(Math.max(0, 1-d/(drag.sheet.offsetHeight*0.9)));
  }
  // cancel : geste interrompu par iOS (centre de contrôle, sélecteur d'apps, appel) : la feuille
  // revient toujours à sa place, jamais fermée par erreur
  function end(cancel){
    if(!drag) return;
    const g = drag; drag = null;
    if(!g.active) return;
    const sc = qs("#overlay .scrim");
    const far = cancel!==true && (g.dy > Math.min(140, g.sheet.offsetHeight*0.28) || (g.v>0.45 && g.dy>30));
    g.sheet.style.transition = "transform .26s cubic-bezier(.32,.72,0,1)";
    if(far && sheetCanGoBack()){
      // feuille empilée : elle s'en va, la précédente revient à sa place
      g.sheet.style.transform = "translateY(100%)";
      if(sc) sc.style.opacity = "";
      suppressSheetClick = Date.now()+350;
      setTimeout(()=>{ if(g.sheet.isConnected) sheetBack(); }, 200);
    } else if(far && !sheetDismissGuard()){
      g.sheet.style.transform = "translateY(100%)";
      if(sc) sc.style.opacity = "";
      suppressSheetClick = Date.now()+350;
      closeSheet();
    } else {
      g.sheet.style.transform = ""; if(sc) sc.style.opacity = "";
      setTimeout(()=>{ if(g.sheet.style.transform==="") g.sheet.style.transition = ""; }, 280);
    }
  }
  document.addEventListener("touchstart", e=>{ if(e.touches.length===1) start(e.touches[0].clientX, e.touches[0].clientY, e.target); else drag = null; }, { passive:true });
  document.addEventListener("touchmove", e=>{ if(drag) move(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive:false });
  document.addEventListener("touchend", ()=>end(), { passive:true });
  document.addEventListener("touchcancel", ()=>end(true), { passive:true });
  document.addEventListener("ascen:suspend", ()=>end(true));
  // à la souris : uniquement depuis la poignée ou l'en-tête
  document.addEventListener("mousedown", e=>{ if(e.button===0 && e.target.closest && e.target.closest(".sheet-grab,.sheet-hd") && !e.target.closest("button")) start(e.clientX, e.clientY, e.target); });
  document.addEventListener("mousemove", e=>{ if(drag) move(e.clientX, e.clientY, e); });
  document.addEventListener("mouseup", ()=>end());
})();
let suppressSheetClick = 0;
function confirmSheet({title,html,ok,onOk,danger}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:6px">${esc(title)}</div>
    <div style="color:var(--label2);font-size:var(--fs-sub);line-height:1.4;margin-bottom:18px">${html||""}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn ${danger?"danger":""}" data-a="confirmYes">${esc(ok||"OK")}</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onYes = onOk;
}

// ---------- toast ----------
let toastTimer=null;
// undo (facultatif) : le message porte un bouton « Annuler » pendant 5 s (Nielsen : pouvoir revenir en arrière)
let toastUndoFn = null;
function toast(msg, ic, undo){
  const t = qs("#toast");
  t.innerHTML = (ic ? ii(ic, "t-ic") : "")+esc(msg)+(undo ? `<button class="t-undo" data-a="toastUndo">Annuler</button>` : "");
  toastUndoFn = typeof undo==="function" ? undo : null;
  t.classList.toggle("has-act", !!toastUndoFn);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.classList.remove("show","has-act"); toastUndoFn = null; }, toastUndoFn ? 5000 : 2200);
}

// ---------- délégation d'actions ----------
const ACT = {
  toastUndo(){ const f = toastUndoFn; toastUndoFn = null; clearTimeout(toastTimer); qs("#toast").classList.remove("show","has-act"); if(f){ f(); sfx("seg"); } },
  retryView(d){ renderViewAnimated(d.v||currentTab); },
  tab(d){ if(d.id===currentTab) reselectTab(); else switchTab(d.id); },
  closesheet(){ if(!sheetBack()) closeSheet(); },
  sheetBack(){ if(!sheetBack()) closeSheet(); },
  dismisssheet(){ if(Date.now()>suppressSheetClick) dismissSheet(); },
  confirmYes(){ const fn = qs("#overlay")._onYes; closeSheet(); if(fn) fn(); },
  numOk(){
    const fn = qs("#overlay")._onNum, v = parseFloat((qs("#numInput")||{}).value);
    closeSheet();
    if(fn && !isNaN(v) && v>=0) fn(v);
  },
  noop(){},
};

// ---------- exécution des actions ----------
// Une action qui échoue (donnée inattendue, cas non prévu) ne doit ni figer l'écran ni perdre de
// données : l'erreur est notée (dernières 20, en mémoire), l'utilisateur est prévenu sobrement et
// la vue est redessinée depuis l'état enregistré. Les actions qui enregistrent quelque chose sont
// protégées contre le double appui (une série validée deux fois, une séance terminée deux fois).
const ERR_LOG = [];
let errToastAt = 0;
function reportError(where, err){
  ERR_LOG.push({ at:new Date().toISOString(), where, msg:String(err && err.message || err).slice(0,200) });
  if(ERR_LOG.length>20) ERR_LOG.shift();
  if(typeof console!=="undefined") console.warn("[ASCEN]", where, err);
  if(Date.now()-errToastAt>5000){ errToastAt = Date.now(); try{ toast("Petit souci, l'écran a été rechargé — rien n'est perdu", "warn"); }catch(e){} }
}
const ONCE_ACTS = new Set(["startExpress","validateSet","finishSession","startSession","startCustom","startTemplate","pickerDone","infoAdd","addToCustom","tplEdSave","saveTemplate","saveTemplateNew","backupData","obFinish","confirmYes","holdStop","histEditSave"]);
let lastAct = { name:"", el:null, t:0 };
function runAction(name, el, e){
  const fn = ACT[name]; if(!fn) return;
  const now = Date.now();
  if(ONCE_ACTS.has(name) && lastAct.name===name && lastAct.el===el && now-lastAct.t<450){ if(e) e.preventDefault(); return; }
  lastAct = { name, el, t:now };
  try{
    const r = fn.call(ACT, el.dataset, el);
    if(r && typeof r.catch==="function") r.catch(err=>{ reportError(name, err); recoverView(); });
  }catch(err){ reportError(name, err); recoverView(); }
}
function recoverView(){ try{ if(typeof renderView==="function") renderView(currentTab); }catch(e){} }
window.addEventListener("error", e=>{ if(e && e.message && !/ResizeObserver|Script error/.test(e.message)) reportError("window", e.error || e.message); });
window.addEventListener("unhandledrejection", e=>{ const r = e && e.reason; if(r && !/AbortError|NotAllowedError/.test(String(r.name||r))) reportError("promise", r); });

document.addEventListener("click", e=>{
  // un glissement de carte ne doit pas déclencher le bouton sous le doigt
  if(typeof suppressClicksUntil!=="undefined" && Date.now()<suppressClicksUntil){ e.preventDefault(); return; }
  const el = e.target.closest("[data-a]");
  if(!el) return;
  runAction(el.dataset.a, el, e);
});
document.addEventListener("keydown", e=>{
  if(e.key==="Enter" && e.target && e.target.id==="numInput"){ e.preventDefault(); ACT.numOk(); }
  if(e.key==="Enter" && e.target && e.target.id==="tplEdName"){ e.preventDefault(); e.target.blur(); }
  if(e.key==="Enter" && e.target && e.target.id==="bodyIn"){ e.preventDefault(); ACT.bodyAdd(); }
  if(e.key==="Enter" && e.target && /^wadd-/.test(e.target.id||"")){ e.preventDefault(); ACT.addWeight({ id:e.target.id.slice(5) }); }
  if(e.key==="Enter" && e.target && (e.target.id==="nameInput" || e.target.id==="whyInput" || e.target.id==="tplName")){
    e.preventDefault(); const b = qs('.center-modal [data-a^="save"]'); if(b) b.click();
  }
});
document.addEventListener("change", e=>{
  const el = e.target.closest("[data-c]");
  if(!el) return;
  runAction(el.dataset.c, el, e);
});
