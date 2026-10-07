import React, { useState, useRef } from 'react';

export default function PaywallCalculatorApp() {
  // Navigation State
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Calculator State
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [pendingResult, setPendingResult] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [history, setHistory] = useState([]);

  // Animation & Toast States
  const [isShaking, setIsShaking] = useState(false);
  const [popScreen, setPopScreen] = useState(false);
  const [showSlangToast, setShowSlangToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const canvasRef = useRef(null);

  // Trigger digit pop animation on display change
  const updateDisplay = (newVal) => {
    setDisplay(newVal);
    setPopScreen(true);
    setTimeout(() => setPopScreen(false), 150);
  };

  // Web Audio Synth
  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'paywall') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.3);
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Canvas Confetti
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = Array.from({ length: 110 }).map(() => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 22,
      vy: (Math.random() - 0.8) * 22,
      size: Math.random() * 9 + 4,
      color: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#F43F5E'][
        Math.floor(Math.random() * 6)
      ],
      alpha: 1,
      decay: Math.random() * 0.018 + 0.008,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      particles = particles.filter((p) => p.alpha > 0);
      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  // Input Handling
  const handleInput = (val) => {
    playSound('click');

    if (val === 'C') {
      updateDisplay('0');
      setEquation('');
      setPendingResult(null);
      return;
    }

    if (val === 'DEL') {
      updateDisplay(display.length > 1 ? display.slice(0, -1) : '0');
      return;
    }

    if (val === '=') {
      try {
        const sanitizedEq = (equation + display).replace(/×/g, '*').replace(/÷/g, '/');
        const calculatedResult = Function(`"use strict"; return (${sanitizedEq})`)();

        if (!isSubscribed) {
          // Trigger Paywall Intercept + Shake
          setPendingResult(calculatedResult);
          playSound('paywall');
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          setShowPaywall(true);
        } else {
          // Unlocked Calculation
          const resStr = String(calculatedResult);
          updateDisplay(resStr);
          setHistory((prev) => [`${equation}${display} = ${resStr}`, ...prev.slice(0, 3)]);
          setEquation('');
        }
      } catch (err) {
        updateDisplay('Error');
      }
      return;
    }

    if (['+', '-', '×', '÷'].includes(val)) {
      setEquation(`${display} ${val} `);
      updateDisplay('0');
      return;
    }

    updateDisplay(display === '0' ? val : display + val);
  };

  // Payment Action with Pidgin Slang Toast
  const handleSubscribePayment = () => {
    setIsSubscribed(true);
    setShowPaywall(false);
    playSound('victory');
    triggerConfetti();

    setToastMessage("🎉 Jayelo yami! You self enjoy the premium right! Math answer don show clear clear!");
    setShowSlangToast(true);
    setTimeout(() => setShowSlangToast(false), 4500);

    if (pendingResult !== null) {
      const resStr = String(pendingResult);
      updateDisplay(resStr);
      setHistory((prev) => [`${equation}${display} = ${resStr}`, ...prev.slice(0, 3)]);
      setEquation('');
      setPendingResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans select-none relative overflow-x-hidden">
      {/* Embedded CSS Keyframes */}
      <style>{`
        @keyframes customFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-10px) rotate(-1deg); }
          30%, 60%, 90% { transform: translateX(10px) rotate(1deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes lockWobble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-12deg) scale(1.1); }
          75% { transform: rotate(12deg) scale(1.1); }
        }
        .animate-float { animation: customFloat 6s ease-in-out infinite; }
        .animate-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .animate-lock { animation: lockWobble 1.5s infinite ease-in-out; }
      `}</style>

      {/* Confetti Overlay Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* Background Glowing Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-emerald-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Navbar */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/30">
            🧮
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 bg-clip-text text-transparent">
            CalcSaaS <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">v2.0 Pro</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsCalcOpen(true);
              playSound('click');
            }}
            className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs tracking-wider uppercase transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            <span className="relative z-10">Launch Calculator</span>
          </button>
        </div>
      </nav>

      {/* LANDING PAGE HERO SECTION */}
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-24 relative z-10 text-center">
        {/* Floating Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md mb-8 shadow-xl animate-float">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-300">
            🚀 World's First $200/mo Paywalled Calculator
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-tight">
          Math as a Service <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            (MaaS) For Big Boys
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Why calculate <span className="text-emerald-400 font-mono">1 + 1 = 2</span> for free when you can pay <span className="text-amber-400 font-extrabold">$200/month</span> to unlock the equals button? High quality math, zero dulling!
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => {
              setIsCalcOpen(true);
              playSound('click');
            }}
            className="relative overflow-hidden w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-base transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-500/30 group"
          >
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              🔥 Launch Paywall Calculator
            </span>
          </button>

          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-2xl text-base transition-all duration-200"
          >
            View $200 Sub Tier
          </a>
        </div>

        {/* Floating Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-24">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-md hover:border-slate-700 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-2xl mb-4">
              🔐
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-100">Paywalled Equals Key</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pressing = automatically intercepts execution and prompts for a $200 subscription before revealing answers.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-md hover:border-slate-700 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl mb-4">
              🎉
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-100">Street Slang Alerts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon payment confirmation, get instant street alerts: "Jayelo yami! You self enjoy the premium right!"
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-md hover:border-slate-700 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-2xl mb-4">
              🔊
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-100">Web Audio Synth FX</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesized keypress clicks, paywall error alarms, and victory fanfare directly in your browser.
            </p>
          </div>
        </div>

        {/* Pricing Matrix Section */}
        <div id="pricing" className="pt-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            No Dulling Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-12">Choose Your Math Plan</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
            {/* Free Tier */}
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl opacity-70 hover:opacity-100 transition-opacity">
              <div className="text-sm font-bold text-slate-400 mb-2">Basic Free Tier</div>
              <div className="text-3xl font-black font-mono mb-4 text-slate-200">$0 <span className="text-xs font-normal text-slate-500">/mo</span></div>
              <ul className="text-xs text-slate-400 space-y-3 mb-8">
                <li className="flex items-center gap-2"><span>✅</span> Type single digits (0-9)</li>
                <li className="flex items-center gap-2"><span>✅</span> Look at the OLED screen</li>
                <li className="flex items-center gap-2 text-slate-600"><span>❌</span> Reveal math results</li>
                <li className="flex items-center gap-2 text-slate-600"><span>❌</span> Equals button disabled</li>
              </ul>
              <button
                onClick={() => {
                  setIsCalcOpen(true);
                  playSound('click');
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Use Free Calculator
              </button>
            </div>

            {/* Pro Math VIP Tier */}
            <div className="p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/60 rounded-3xl relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 right-6 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                Most Popular 🔥
              </div>
              <div className="text-sm font-extrabold text-emerald-400 mb-2">Pro Math VIP Tier</div>
              <div className="text-4xl font-black font-mono mb-4 text-emerald-400">$200 <span className="text-xs font-normal text-slate-400">/mo</span></div>
              <ul className="text-xs text-slate-300 space-y-3 mb-8">
                <li className="flex items-center gap-2"><span>✨</span> Full access to `=` answer key</li>
                <li className="flex items-center gap-2"><span>✨</span> Unlimited 1+1 calculation</li>
                <li className="flex items-center gap-2"><span>✨</span> Jayelo yami victory alerts</li>
                <li className="flex items-center gap-2"><span>✨</span> Confetti celebration burst</li>
              </ul>
              <button
                onClick={() => {
                  setIsCalcOpen(true);
                  playSound('click');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
              >
                Claim $200 Pro Pass
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ANIMATED CALCULATOR MODAL POPUP */}
      {isCalcOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Street Slang Success Toast Alert */}
          {showSlangToast && (
            <div className="fixed top-8 z-50 max-w-md w-11/12 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/50 text-sm text-center animate-bounce border-2 border-slate-950">
              <p className="text-base font-extrabold tracking-wide">{toastMessage}</p>
            </div>
          )}

          {/* Close Calculator Button */}
          <button
            onClick={() => {
              setIsCalcOpen(false);
              playSound('click');
            }}
            className="absolute top-6 right-6 w-10 h-10 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors text-lg"
          >
            ✕
          </button>

          {/* Top Status Pill */}
          <div className="mb-6 flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSubscribed ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isSubscribed ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase text-slate-300">
              Status: {isSubscribed ? '🔥 VIP Oga Boss ($200/mo Active)' : '🔒 Free Tier (You Never Sub)'}
            </span>
          </div>

          {/* Calculator Body Container */}
          <div
            className={`w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative transition-all duration-300 ${
              isShaking ? 'animate-shake border-rose-500/80 shadow-rose-500/20' : ''
            }`}
          >
            {/* Glow Border Overlay */}
            <div
              className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-r ${
                isSubscribed ? 'from-emerald-500/20 to-teal-500/20' : 'from-amber-500/20 to-rose-500/20'
              } blur opacity-75 -z-10 animate-pulse`}
            />

            {/* OLED Screen */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 text-right font-mono relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-20 pointer-events-none" />

              <div className="text-slate-500 text-xs h-5 truncate tracking-widest relative z-10">
                {equation || 'OYA PRESS BUTTON'}
              </div>

              <div
                className={`text-4xl font-bold text-emerald-400 tracking-tight truncate mt-1 relative z-10 transition-transform duration-150 ${
                  popScreen ? 'scale-110 text-emerald-300' : 'scale-100'
                }`}
              >
                {display}
              </div>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-3">
              {['C', 'DEL', '÷', '×', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.'].map(
                (btn) => {
                  const isOperator = ['÷', '×', '-', '+'].includes(btn);
                  const isEqual = btn === '=';
                  const isClear = ['C', 'DEL'].includes(btn);

                  return (
                    <button
                      key={btn}
                      onClick={() => handleInput(btn)}
                      className={`relative overflow-hidden py-4 rounded-2xl text-lg font-bold transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 shadow-md ${
                        isEqual
                          ? 'col-span-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black tracking-wider shadow-emerald-500/20 hover:shadow-emerald-500/40'
                          : btn === '0'
                          ? 'col-span-1 bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/50'
                          : isOperator
                          ? 'bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 text-indigo-300'
                          : isClear
                          ? 'bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/40 text-rose-300'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/50'
                      }`}
                    >
                      {isEqual && !isSubscribed && (
                        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                      )}
                      {btn}
                    </button>
                  );
                }
              )}
            </div>

            {/* Audit Log History */}
            {history.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-2">
                  Unlocked Math History
                </div>
                <div className="space-y-1">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono text-slate-400 flex justify-between animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <span className="text-slate-600">#{history.length - idx}</span>
                      <span className="text-emerald-400 font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sandbox Toggle */}
          <div className="mt-6 flex gap-3 z-10">
            <button
              onClick={() => {
                setIsSubscribed(!isSubscribed);
                playSound('click');
              }}
              className="text-xs font-mono text-slate-400 hover:text-slate-100 bg-slate-900/80 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
            >
              {isSubscribed ? '🔄 Revoke Subscription (Lock math)' : '⚡ Test Mode: Skip Paywall'}
            </button>
          </div>

          {/* SaaS Paywall Modal Overlay with Street Slangs */}
          {showPaywall && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center transform transition-all duration-300 scale-100 animate-in zoom-in-95">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl animate-lock shadow-inner">
                  🔒
                </div>

                <span className="inline-block px-3.5 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-extrabold rounded-full uppercase tracking-wider mb-2 border border-amber-500/30 animate-pulse">
                  Who Goes Dere? Paywall Intercepted!
                </span>

                <h2 className="text-2xl font-black text-slate-100 mb-2 tracking-tight">
                  Pay $200 To Sub For Premium!
                </h2>

                <p className="text-xs text-slate-300 mb-6 leading-relaxed font-medium">
                  You wan see answer for <span className="font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">{equation + display}</span> without subscription? No dulling! Upgrade to VIP math pass now.
                </p>

                {/* Feature Plan Matrix */}
                <div className="space-y-3 mb-6 text-left">
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-between opacity-60">
                    <div>
                      <div className="text-xs font-bold text-slate-400">Basic Free Tier</div>
                      <div className="text-[10px] text-slate-500">Only pressing digits, no equals answer</div>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-500">$0/mo</div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 rounded-2xl border border-emerald-500/50 flex items-center justify-between shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                    <div>
                      <div className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                        Premium VIP Tier 🔥
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Jayelo features: Equals key (`=`), sound effects, & instant answer
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-black text-emerald-400">$200</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider">/ month</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleSubscribePayment}
                    className="relative overflow-hidden w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-98 shadow-xl shadow-emerald-500/25 group"
                  >
                    <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                    <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-black">
                      <span>💳</span> I HAVE PAID THE SUB ($200) — JAYELO!
                    </span>
                  </button>

                  <button
                    onClick={() => setShowPaywall(false)}
                    className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors rounded-xl"
                  >
                    Abeg Cancel (Keep Answer Hidden)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
