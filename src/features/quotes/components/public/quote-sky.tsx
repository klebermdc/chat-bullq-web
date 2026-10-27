/** Céu noturno do topo: estrelas, fogos e o rastro pontilhado (decorativo). */
export function QuoteSky() {
  return (
    <svg className="qt-sky" viewBox="0 0 390 420" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <g fill="#fff">
        <circle cx="32" cy="40" r="1.4" opacity=".8" />
        <circle cx="78" cy="120" r="1" opacity=".6" />
        <circle cx="140" cy="28" r="1.2" opacity=".7" />
        <circle cx="352" cy="66" r="1.5" opacity=".8" />
        <circle cx="300" cy="150" r="1" opacity=".5" />
        <circle cx="22" cy="230" r="1.2" opacity=".6" />
        <circle cx="370" cy="250" r="1" opacity=".6" />
        <circle cx="250" cy="22" r="1" opacity=".7" />
        <circle cx="110" cy="300" r="1" opacity=".4" />
        <circle cx="330" cy="330" r="1.3" opacity=".5" />
        <circle cx="58" cy="370" r="1" opacity=".5" />
      </g>
      <g className="qt-twinkle" stroke="#FFC23D" strokeWidth="2" strokeLinecap="round">
        <path d="M336 92v-16M336 124v16M320 108h-16M352 108h16M347 97l8-8M325 119l-8 8M325 97l-8-8M347 119l8 8" />
      </g>
      <g className="qt-twinkle d2" stroke="#FF6B8B" strokeWidth="2" strokeLinecap="round">
        <path d="M46 176v-10M46 196v10M36 186h-10M56 186h10M52 180l6-6M40 192l-6 6M40 180l-6-6M52 192l6 6" />
      </g>
      <path className="qt-twinkle d3" d="M300 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFC23D" />
      <path className="qt-twinkle d2" d="M96 76l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#9F8CFF" />
      <path
        d="M-10 400C80 350 160 430 240 382S360 330 400 362"
        fill="none"
        stroke="#FFC23D"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
        opacity=".7"
      />
    </svg>
  );
}

/** Faixa do bilhete teal: planeta com anel (decorativo). */
export function TealBandArt() {
  return (
    <svg viewBox="0 0 350 108" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <circle cx="292" cy="44" r="34" fill="#0C8792" />
      <ellipse cx="292" cy="44" rx="58" ry="12" fill="none" stroke="#FFC23D" strokeWidth="3" transform="rotate(-14 292 44)" />
      <circle cx="226" cy="22" r="3" fill="#fff" opacity=".7" />
      <circle cx="340" cy="92" r="2" fill="#fff" opacity=".7" />
      <circle cx="196" cy="70" r="2" fill="#fff" opacity=".5" />
      <path d="M0 108C60 80 120 100 180 86S290 66 350 92V108z" fill="#0C8792" opacity=".7" />
    </svg>
  );
}

/** Faixa do bilhete violeta: lua e colinas (decorativo). */
export function VioletBandArt() {
  return (
    <svg viewBox="0 0 350 108" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <circle cx="300" cy="40" r="26" fill="#FFC23D" />
      <circle cx="312" cy="32" r="22" fill="#6B4EFF" />
      <path d="M240 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" />
      <path d="M200 64l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#FFC23D" />
      <circle cx="336" cy="86" r="2" fill="#fff" opacity=".8" />
      <circle cx="262" cy="80" r="1.6" fill="#fff" opacity=".7" />
      <path d="M150 108C190 66 230 66 260 108z" fill="#5638E8" />
      <path d="M230 108C270 54 320 54 360 108z" fill="#4A2DD8" />
    </svg>
  );
}
