const FloatingDecor = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <svg className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] opacity-[0.12]" viewBox="0 0 400 400" fill="none" style={{ animation: 'floatA 18s ease-in-out infinite' }}>
      <path d="M50 200 Q100 50 200 100 Q300 150 250 250 Q200 350 100 300 Q0 250 50 200Z" fill="#52B788" />
      <path d="M120 180 Q160 80 220 130 Q280 180 240 260 Q200 340 140 290 Q80 240 120 180Z" fill="#74C69D" />
    </svg>

    <svg className="absolute top-[10%] right-[-3%] w-[25%] h-[25%] opacity-[0.1]" viewBox="0 0 300 300" fill="none" style={{ animation: 'floatB 22s ease-in-out infinite' }}>
      <path d="M150 20 Q250 60 230 150 Q210 240 120 260 Q30 280 50 180 Q70 80 150 20Z" fill="#40916C" />
    </svg>

    <svg className="absolute bottom-[-5%] left-[5%] w-[30%] h-[30%] opacity-[0.1]" viewBox="0 0 350 350" fill="none" style={{ animation: 'floatC 20s ease-in-out infinite' }}>
      <path d="M175 30 Q300 80 280 175 Q260 280 160 300 Q60 310 40 210 Q20 110 175 30Z" fill="#74C69D" />
      <circle cx="80" cy="250" r="40" fill="#95D5B2" opacity="0.5" />
    </svg>

    <svg className="absolute bottom-[10%] right-[2%] w-[20%] h-[20%] opacity-[0.08]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatD 16s ease-in-out infinite' }}>
      <path d="M30 100 Q60 20 120 40 Q180 60 170 130 Q160 190 90 180 Q20 170 30 100Z" fill="#52B788" />
    </svg>

    <svg className="absolute top-[40%] left-[2%] w-[15%] h-[15%] opacity-[0.07]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatE 25s ease-in-out infinite' }}>
      <circle cx="100" cy="100" r="80" fill="#95D5B2" />
    </svg>

    <svg className="absolute top-[60%] right-[10%] w-[12%] h-[12%] opacity-[0.09]" viewBox="0 0 150 150" fill="none" style={{ animation: 'floatA 19s ease-in-out infinite reverse' }}>
      <path d="M75 10 Q140 40 130 90 Q120 140 65 140 Q10 140 15 85 Q20 30 75 10Z" fill="#52B788" />
    </svg>

    {[
      { top: '15%', left: '20%', size: 6, delay: '0s', dur: '14s' },
      { top: '25%', left: '75%', size: 8, delay: '2s', dur: '18s' },
      { top: '70%', left: '15%', size: 5, delay: '4s', dur: '16s' },
      { top: '80%', left: '60%', size: 7, delay: '1s', dur: '20s' },
      { top: '45%', left: '85%', size: 4, delay: '3s', dur: '15s' },
      { top: '55%', left: '40%', size: 5, delay: '5s', dur: '17s' },
    ].map((dot, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-[#74C69D]"
        style={{
          top: dot.top,
          left: dot.left,
          width: dot.size,
          height: dot.size,
          opacity: 0.15,
          animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite`,
        }}
      />
    ))}

    <style>{`
      @keyframes floatA {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(15px, -20px) rotate(3deg); }
        50% { transform: translate(-10px, 15px) rotate(-2deg); }
        75% { transform: translate(20px, 10px) rotate(4deg); }
      }
      @keyframes floatB {
        0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        33% { transform: translate(-20px, 15px) rotate(-5deg) scale(1.05); }
        66% { transform: translate(15px, -10px) rotate(3deg) scale(0.95); }
      }
      @keyframes floatC {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        30% { transform: translate(20px, -15px) rotate(4deg); }
        60% { transform: translate(-15px, -25px) rotate(-3deg); }
      }
      @keyframes floatD {
        0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        50% { transform: translate(-12px, -18px) rotate(6deg) scale(1.1); }
      }
      @keyframes floatE {
        0%, 100% { transform: translate(0, 0) scale(1); }
        40% { transform: translate(10px, -12px) scale(1.15); }
        70% { transform: translate(-8px, 8px) scale(0.9); }
      }
      @keyframes floatDot {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
        50% { transform: translate(8px, -10px) scale(1.5); opacity: 0.25; }
      }
    `}</style>
  </div>
);

export default FloatingDecor;
