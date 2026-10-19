import React from 'react';
import { DamageType } from '../types/combat.ts';

interface TokenAttackEffectProps {
  damageType?: DamageType;
  amount: number;
}

export const TokenAttackEffect: React.FC<TokenAttackEffectProps> = ({
  damageType = 'cortante',
  amount,
}) => {
  const normType = (damageType || 'cortante').toLowerCase();

  const isFire = normType === 'fuego';
  const isSlash =
    normType === 'cortante' ||
    normType === 'perforante' ||
    normType === 'contundente' ||
    normType === 'physical';
  const isLightning = normType === 'rayo';
  const isCold = normType === 'frio';
  const isAcid = normType === 'acido';
  const isForce = normType === 'fuerza';
  const isThunder = normType === 'trueno';
  const isNecrotic = normType === 'necrotico';
  const isPsychic = normType === 'psiquico';
  const isRadiant = normType === 'radiante';
  const isPoison = normType === 'veneno';

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center overflow-visible">
      {/* 1. Impact Hit Flash & Radial Bloom ("Brillo al momento de atacar") */}
      <div className="absolute -inset-2 rounded-full bg-white/70 animate-hit-flash mix-blend-screen shadow-[0_0_25px_rgba(255,255,255,0.9)]" />

      {/* 2. SPECIFIC ELEMENTAL & PHYSICAL ATTACK VISUALS */}

      {/* A) FUEGUITO: Llamas ardientes y ráfaga de fuego */}
      {isFire && (
        <div className="absolute inset-0 flex items-center justify-center animate-flame-burst">
          {/* Fiery ambient glow */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-t from-red-600/80 via-orange-500/90 to-yellow-300/90 blur-xs animate-pulse" />

          {/* SVG Animated Flame Tongues */}
          <svg
            viewBox="0 0 64 64"
            className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_12px_rgba(249,115,22,1)]"
            fill="none"
          >
            <path
              d="M32 4 C34 16, 48 24, 48 38 C48 50, 40 58, 32 60 C24 58, 16 50, 16 38 C16 26, 26 18, 32 4 Z"
              fill="url(#fireGrad1)"
            />
            <path
              d="M32 18 C35 26, 42 32, 42 42 C42 48, 37 54, 32 55 C27 54, 22 48, 22 42 C22 34, 28 28, 32 18 Z"
              fill="url(#fireGrad2)"
            />
            <circle cx="32" cy="44" r="5" fill="#fef08a" className="animate-ping" />
            <defs>
              <linearGradient id="fireGrad1" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.3" stopColor="#f97316" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="fireGrad2" x1="32" y1="18" x2="32" y2="55" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="0.4" stopColor="#fef08a" />
                <stop offset="1" stopColor="#ea580c" />
              </linearGradient>
            </defs>
          </svg>

          {/* Rising ember spark particles */}
          <span className="absolute -top-3 -left-1 text-xs select-none">🔥</span>
          <span className="absolute -top-2 right-0 text-sm select-none">✨</span>
        </div>
      )}

      {/* B) ESPADAZO: Destello y tajo de espada cortante */}
      {isSlash && (
        <div className="absolute inset-0 flex items-center justify-center animate-slash-sweep">
          {/* Slash blade streak across the token */}
          <svg
            viewBox="0 0 80 80"
            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_15px_rgba(255,255,255,1)]"
            fill="none"
          >
            {/* Primary glowing blade slash */}
            <path
              d="M 10 15 Q 40 40 70 65"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_#38bdf8]"
            />
            {/* Secondary colored energy trail */}
            <path
              d="M 12 18 Q 42 43 68 68"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* Impact spark cross */}
            <line x1="32" y1="48" x2="48" y2="32" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
            {/* Central hit sparkle */}
            <circle cx="40" cy="40" r="4.5" fill="#ffffff" className="animate-ping" />
          </svg>

          <span className="absolute text-base font-black text-amber-200 select-none drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
            ⚔️
          </span>
        </div>
      )}

      {/* C) RAYO: Descarga eléctrica con chispas */}
      {isLightning && (
        <div className="absolute inset-0 flex items-center justify-center animate-lightning-zap">
          <div className="absolute -inset-3 rounded-full bg-yellow-400/50 blur-sm animate-pulse" />
          <svg
            viewBox="0 0 60 80"
            className="w-16 h-20 sm:w-20 sm:h-24 drop-shadow-[0_0_14px_rgba(250,204,21,1)]"
            fill="none"
          >
            <path
              d="M 32 0 L 16 34 L 30 34 L 20 80 L 46 38 L 32 38 Z"
              fill="#fef08a"
              stroke="#eab308"
              strokeWidth="2"
            />
          </svg>
          <span className="absolute text-xl select-none animate-ping">⚡</span>
        </div>
      )}

      {/* D) FRÍO: Explosión de escarcha e hielo */}
      {isCold && (
        <div className="absolute inset-0 flex items-center justify-center animate-frost-crystal">
          <div className="absolute -inset-3 rounded-full bg-cyan-400/60 blur-xs" />
          <svg
            viewBox="0 0 64 64"
            className="w-16 h-16 sm:w-18 sm:h-18 drop-shadow-[0_0_12px_rgba(56,189,248,1)]"
            fill="none"
          >
            <line x1="32" y1="8" x2="32" y2="56" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <line x1="8" y1="32" x2="56" y2="32" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <line x1="15" y1="15" x2="49" y2="49" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="15" y1="49" x2="49" y2="15" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="absolute text-xl select-none drop-shadow-[0_0_6px_#38bdf8]">❄️</span>
        </div>
      )}

      {/* E) RADIANTE: Columna de luz divina y destello sagrado */}
      {isRadiant && (
        <div className="absolute inset-0 flex items-center justify-center animate-holy-radiance">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-yellow-200 via-amber-300 to-yellow-500 blur-sm opacity-80 animate-pulse" />
          <svg
            viewBox="0 0 60 60"
            className="w-18 h-18 sm:w-20 sm:h-20 drop-shadow-[0_0_16px_rgba(253,224,71,1)]"
            fill="none"
          >
            <circle cx="30" cy="30" r="14" fill="#ffffff" />
            <path
              d="M30 2 L33 22 L53 15 L38 28 L58 30 L38 32 L53 45 L33 38 L30 58 L27 38 L7 45 L22 32 L2 30 L22 28 L7 15 L27 22 Z"
              fill="#fef08a"
              opacity="0.9"
            />
          </svg>
          <span className="absolute text-base select-none">✨</span>
        </div>
      )}

      {/* F) ÁCIDO / VENENO: Salpicadura corrosiva o nube tóxica */}
      {(isAcid || isPoison) && (
        <div className="absolute inset-0 flex items-center justify-center animate-toxic-spurt">
          <div
            className={`absolute -inset-3 rounded-full blur-xs ${
              isAcid ? 'bg-lime-500/70' : 'bg-emerald-600/70'
            }`}
          />
          <svg
            viewBox="0 0 64 64"
            className="w-16 h-16 drop-shadow-[0_0_10px_rgba(132,204,22,1)]"
            fill="none"
          >
            <circle cx="32" cy="32" r="12" fill={isAcid ? '#a3e635' : '#4ade80'} opacity="0.85" />
            <circle cx="22" cy="20" r="5" fill="#bef264" />
            <circle cx="44" cy="24" r="6" fill="#84cc16" />
            <circle cx="26" cy="44" r="7" fill="#65a30d" />
            <circle cx="42" cy="42" r="4" fill="#d9f99d" />
          </svg>
          <span className="absolute text-sm select-none">
            {isAcid ? '🧪' : '☠️'}
          </span>
        </div>
      )}

      {/* G) FUERZA / TRUENO: Onda expansiva cinética y acústica */}
      {(isForce || isThunder) && (
        <div className="absolute inset-0 flex items-center justify-center animate-hit-flash">
          <div
            className={`absolute -inset-4 rounded-full border-4 border-dashed animate-spin ${
              isForce
                ? 'border-purple-400 bg-purple-950/60 shadow-[0_0_18px_rgba(168,85,247,0.9)]'
                : 'border-cyan-300 bg-cyan-950/60 shadow-[0_0_18px_rgba(6,182,212,0.9)]'
            }`}
          />
          <span className="text-xl select-none">{isForce ? '🌀' : '📢'}</span>
        </div>
      )}

      {/* H) NECRÓTICO: Velo oscuro y drenaje de fuerza vital */}
      {isNecrotic && (
        <div className="absolute inset-0 flex items-center justify-center animate-flame-burst">
          <div className="absolute -inset-3 rounded-full bg-slate-900/90 border border-purple-900 shadow-[0_0_18px_rgba(147,51,234,0.8)]" />
          <span className="text-xl select-none text-purple-300">💀</span>
        </div>
      )}

      {/* I) PSÍQUICO: Ondas de distorsión mental */}
      {isPsychic && (
        <div className="absolute inset-0 flex items-center justify-center animate-frost-crystal">
          <div className="absolute -inset-3 rounded-full bg-pink-500/40 border border-pink-400 animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
          <span className="text-xl select-none">🧠</span>
        </div>
      )}
    </div>
  );
};
