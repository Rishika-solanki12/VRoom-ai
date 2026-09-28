
"use client";

import { useState } from "react";

type AvatarGender = "female" | "male";

interface AIAvatarProps {
  isSpeaking: boolean;
  isListening?: boolean;
  audioLevel?: number;
  avatar: AvatarGender;
  onAvatarChange: (avatar: AvatarGender) => void;
}

export default function AIAvatar({
  isSpeaking,
  isListening = false,
  audioLevel = 0,
  avatar,
  onAvatarChange,
}: AIAvatarProps) {
  const avatarName = avatar === "female" ? "Vira" : "Rivan";
  const requestedSrc =
    avatar === "female" ? "/avatar/female.png" : "/avatar/male.png";

  const [imageSrc, setImageSrc] = useState(requestedSrc);
  const [usingCombinedFallback, setUsingCombinedFallback] = useState(false);

  const level = Math.max(0, Math.min(1, audioLevel));
  const speakingScale = isSpeaking ? 1 + level * 0.008 : 1;

  const handleImageError = () => {
    if (!usingCombinedFallback) {
      setImageSrc("/avatar/avatar.png");
      setUsingCombinedFallback(true);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-4 flex rounded-full border border-white/10 bg-[#090e1a]/90 p-1 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setUsingCombinedFallback(false);
            setImageSrc("/avatar/female.png");
            onAvatarChange("female");
          }}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
            avatar === "female"
              ? "bg-violet-600 text-white shadow-lg"
              : "text-gray-300 hover:bg-white/10"
          }`}
        >
          Vira
        </button>

        <button
          type="button"
          onClick={() => {
            setUsingCombinedFallback(false);
            setImageSrc("/avatar/male.png");
            onAvatarChange("male");
          }}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
            avatar === "male"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-gray-300 hover:bg-white/10"
          }`}
        >
          Rivan
        </button>
      </div>

      <div
        className={`avatar-stage ${
          isSpeaking ? "is-speaking" : isListening ? "is-listening" : ""
        }`}
      >
        <div className="avatar-glow" />

        <div className="avatar-window">
          {!usingCombinedFallback ? (
            <img
              key={imageSrc}
              src={imageSrc}
              alt={`${avatarName} AI coach`}
              draggable={false}
              onError={handleImageError}
              className="avatar-image"
              style={{
                transform: `scale(${speakingScale})`,
              }}
            />
          ) : (
            <div className="combined-fallback">
              <img
                src="/avatar/avatar.png"
                alt={`${avatarName} AI coach`}
                draggable={false}
                className={`combined-image ${
                  avatar === "female" ? "combined-female" : "combined-male"
                }`}
                style={{
                  transform: `scale(${speakingScale})`,
                }}
              />
            </div>
          )}

          {/* Tiny audio-reactive cue on the actual mouth area. */}
          {!usingCombinedFallback && isSpeaking && (
            <div
              className={`mouth-pixel ${
                avatar === "female" ? "female-mouth" : "male-mouth"
              }`}
              style={{
                transform: `translate(-50%, -50%) scaleY(${1 + level * 0.12})`,
                opacity: 0.12 + level * 0.16,
              }}
              aria-hidden="true"
            />
          )}

          <div className="avatar-status">
            <span
              className={`status-dot ${
                isSpeaking
                  ? "status-speaking"
                  : isListening
                    ? "status-listening"
                    : ""
              }`}
            />
            <span>
              {isSpeaking
                ? `${avatarName} is speaking`
                : isListening
                  ? "Listening to you"
                  : `${avatarName} · AI Communication Coach`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isSpeaking
              ? "animate-pulse bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]"
              : isListening
                ? "animate-pulse bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                : "bg-slate-500"
          }`}
        />
        <span className="text-sm text-gray-400">
          {isSpeaking
            ? "VRoom AI is speaking..."
            : isListening
              ? "Listening..."
              : "Ready"}
        </span>
      </div>

      <style jsx>{`
        .avatar-stage {
          position: relative;
          width: min(100%, 370px);
          aspect-ratio: 1;
          margin-inline: auto;
          isolation: isolate;
        }

        .avatar-window {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0a1020;
          box-shadow:
            0 22px 64px rgba(0, 0, 0, 0.4),
            inset 0 0 0 1px rgba(255, 255, 255, 0.03);
          z-index: 2;
        }

        .avatar-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          user-select: none;
          pointer-events: none;
          z-index: 1;
          will-change: transform;
          transition: transform 120ms linear;
        }

        .combined-fallback {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 1;
        }

        .combined-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 100%;
          max-width: none;
          object-fit: cover;
          object-position: center top;
          user-select: none;
          pointer-events: none;
          will-change: transform;
        }

        .combined-female {
          transform-origin: 25% 50%;
        }

        .combined-male {
          transform: translateX(-50%);
          transform-origin: 75% 50%;
        }

        .is-speaking .avatar-image,
        .is-speaking .combined-image {
          animation: naturalTalk 1.25s ease-in-out infinite alternate;
        }

        .is-listening .avatar-image,
        .is-listening .combined-image {
          animation: naturalListen 3s ease-in-out infinite;
        }

        @keyframes naturalTalk {
          0% {
            transform: translateY(0) rotate(-0.14deg);
          }
          50% {
            transform: translateY(-1.5px) rotate(0deg);
          }
          100% {
            transform: translateY(0.8px) rotate(0.14deg);
          }
        }

        @keyframes naturalListen {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1px) rotate(-0.07deg);
          }
        }

        .avatar-glow {
          position: absolute;
          inset: 5%;
          border-radius: 32px;
          background: rgba(124, 58, 237, 0.25);
          filter: blur(32px);
          z-index: 0;
          pointer-events: none;
          animation: glowIdle 3.2s ease-in-out infinite;
        }

        .is-speaking .avatar-glow {
          background: rgba(139, 92, 246, 0.45);
          animation: glowTalk 800ms ease-in-out infinite alternate;
        }

        .is-listening .avatar-glow {
          background: rgba(16, 185, 129, 0.28);
        }

        @keyframes glowIdle {
          0%, 100% {
            opacity: 0.7;
            transform: scale(0.98);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes glowTalk {
          from {
            opacity: 0.68;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1.07);
          }
        }

        /* Exact face-region cue for the current Vira/Rivan portraits. */
        .mouth-pixel {
          position: absolute;
          z-index: 4;
          left: 50%;
          top: 34.8%;
          width: 5%;
          height: 2.6%;
          border-radius: 50%;
          background: rgba(78, 17, 28, 0.42);
          filter: blur(0.5px);
          pointer-events: none;
          transform-origin: center center;
        }

        .female-mouth {
          left: 58.8%;
          top: 34.6%;
        }

        .male-mouth {
          left: 58.5%;
          top: 34.6%;
        }

        .avatar-status {
          position: absolute;
          left: 12px;
          bottom: 12px;
          z-index: 8;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(6, 10, 20, 0.62);
          backdrop-filter: blur(12px);
          color: rgba(255, 255, 255, 0.9);
          font-size: 10px;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: #64748b;
        }

        .status-speaking {
          background: #a78bfa;
          box-shadow: 0 0 13px rgba(167, 139, 250, 0.95);
        }

        .status-listening {
          background: #34d399;
          box-shadow: 0 0 13px rgba(52, 211, 153, 0.85);
        }

        @media (max-width: 900px) {
          .avatar-stage {
            width: min(100%, 340px);
          }
        }

        @media (max-width: 640px) {
          .avatar-stage {
            width: min(100%, 320px);
          }

          .avatar-window {
            border-radius: 22px;
          }

          .avatar-status {
            left: 8px;
            bottom: 8px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .avatar-image,
          .combined-image,
          .avatar-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
