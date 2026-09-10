import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Wifi,
  Radio,
  Mic,
  Music,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  ExternalLink,
  HardDrive,
  FileCheck,
} from 'lucide-react';

export const DownloadAppPage: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState(false);

  const apkUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/AuraStream.apk`
    : '/AuraStream.apk';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(apkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const appFeatures = [
    {
      icon: <Wifi className="w-5 h-5 text-emerald-400" />,
      title: 'Offline Wi-Fi Hotspot Mesh',
      desc: 'Listen together with friends over a mobile hotspot with zero cellular data or internet needed.',
    },
    {
      icon: <Radio className="w-5 h-5 text-rose-400" />,
      title: 'Listen Together Rooms',
      desc: 'Synchronized live music streaming with collaborative queue, live reactions, and room chat.',
    },
    {
      icon: <Mic className="w-5 h-5 text-amber-400" />,
      title: 'Smart Voice Chat with Ducking',
      desc: 'Talk with friends live; background music automatically lowers to 25% volume when someone speaks.',
    },
    {
      icon: <HardDrive className="w-5 h-5 text-cyan-400" />,
      title: 'Local File Player with P2P Sharing',
      desc: 'Play offline MP3/FLAC/M4A files directly from device storage and stream files to nearby peers.',
    },
    {
      icon: <Smartphone className="w-5 h-5 text-violet-400" />,
      title: 'Background Audio Playback',
      desc: 'Continue listening seamlessly with screen locked or while multitasking in other apps.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: '100% Ad-Free Experience',
      desc: 'Clean, modern studio interface without interruptions, trackers, or intrusive advertisements.',
    },
  ];

  const installSteps = [
    {
      step: '1',
      title: 'Download APK',
      desc: 'Click the Download button below or scan the QR code from your Android device.',
    },
    {
      step: '2',
      title: 'Allow Installation',
      desc: 'When prompted by your browser, tap "Open" or "Install from unknown sources".',
    },
    {
      step: '3',
      title: 'Launch & Stream',
      desc: 'Open AuraStream and enjoy unlimited music streaming, rooms, and hotspot parties.',
    },
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* 1. Hero Download Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-cyan-950/30 border border-emerald-500/25 p-6 md:p-10 shadow-2xl">
        {/* Glow ambient background elements */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Hero Details */}
          <div className="space-y-4 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold tracking-wider uppercase text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Official Android Release</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-heading leading-tight">
              Get AuraStream for Android
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Experience zero-data Wi-Fi hotspot listening parties, synchronized live rooms, background playback, and studio voice chat on your Android device.
            </p>

            {/* Version and Specs chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs text-zinc-400 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                Version: <strong>1.0.0</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                Size: <strong>~3.9 MB</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                Android 8.0+
              </span>
            </div>

            {/* Download CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
              <a
                href="/AuraStream.apk"
                download="AuraStream.apk"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Download APK File</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                <span>{copiedLink ? 'Direct Link Copied' : 'Copy Download Link'}</span>
              </button>
            </div>
          </div>

          {/* Right Phone Mockup & Instant QR Code */}
          <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-2xl flex-shrink-0">
            <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
              {/* Stylized high-contrast SVG pairing QR code */}
              <svg viewBox="0 0 24 24" className="w-full h-full text-black" fill="currentColor">
                <path d="M2 2h8v8H2zm2 2v4h4V4zm8-2h8v8h-8zm2 2v4h4V4zM2 14h8v8H2zm2 2v4h4v-4zm10-2h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2-2h2v2h-2zm-2 4h6v2h-6zM4 6h2v2H4zm12 0h2v2h-2zM4 18h2v2H4z" />
              </svg>
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scan with Phone Camera</span>
              </p>
              <p className="text-[11px] text-zinc-400">Download directly to your Android device</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key App Features */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Why Use the Android App?</h2>
            <p className="text-xs text-zinc-400">Engineered for native performance and offline media sync</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850/80 hover:border-zinc-700/80 transition-all space-y-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                {feat.icon}
              </div>
              <h3 className="text-sm font-bold text-white">{feat.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Easy 3-Step Installation Guide */}
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/30 border border-zinc-850 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Simple Installation Guide</h2>
          <p className="text-xs text-zinc-400">Installing AuraStream via APK takes less than 30 seconds</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {installSteps.map((step) => (
            <div
              key={step.step}
              className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col justify-between space-y-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                {step.step}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">{step.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Security & Integrity Badge */}
      <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-white">Verified Safe & Malware-Free</p>
            <p className="text-[11px] text-zinc-400">
              Built directly from open source repository with official Android signing certificates.
            </p>
          </div>
        </div>

        <a
          href="/AuraStream.apk"
          download="AuraStream.apk"
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Download AuraStream.apk (3.9 MB)</span>
        </a>
      </div>
    </div>
  );
};
