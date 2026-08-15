"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import { useBotEngine } from "../../../lib/useBotEngine";
import { useOnlineStatus } from "../../../lib/useOnlineStatus";
import {
  type GameModeSettings,
  type GameModePreset,
  GAME_MODE_PRESETS,
  GAME_MODE_LABELS,
  DEFAULT_CUSTOM,
} from "../../../lib/gameModes";
import {
  syncOfflineGames,
  generateOfflineGameId,
  getPendingCount,
  retryPendingSyncs,
  findInProgressGames,
  clearInProgress,
  type InProgressGame,
} from "../../../lib/offlineSync";
import { ConfirmModal, useToast } from "@aurora/ui";
import { TIME_CONTROL_PRESETS, type BotPersonality } from "@aurora/chess";
import { loadBotPrefs, saveBotPrefs } from "../../../lib/gamePrefs";
import BotDetail from "../../../components/BotDetail";
import BotSelector from "../../../components/BotSelector";
import TimeControlPicker from "../../../components/TimeControlPicker";

function eloLabel(elo: number): string {
  if (elo < 400) return "Beginner";
  if (elo < 800) return "Novice";
  if (elo < 1200) return "Intermediate";
  if (elo < 1600) return "Advanced";
  if (elo < 2000) return "Expert";
  if (elo < 2400) return "Master";
  if (elo < 2800) return "Grandmaster";
  return "Engine";
}

export default function PlayBotPage() {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();
  const botEngine = useBotEngine();
  const isOnline = useOnlineStatus();

  // Bot list (fetch from API -> cache to localStorage -> empty until loaded)
  const [botList, setBotList] = useState<BotPersonality[]>(() => {
    try {
      const cached = localStorage.getItem("aurorachess-bots");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [botsLoading, setBotsLoading] = useState(botList.length === 0);
  useEffect(() => {
    if (isOnline) {
      api
        .get("/api/v1/bots")
        .then(({ data }) => {
          if (data.bots && data.bots.length > 0) {
            setBotList(data.bots);
            try {
              localStorage.setItem("aurorachess-bots", JSON.stringify(data.bots));
            } catch {}
          }
        })
        .finally(() => setBotsLoading(false));
    } else {
      setBotsLoading(false);
    }
  }, [isOnline]);

  // Selection state
  const [selectedBot, setSelectedBot] = useState<BotPersonality | null>(null);
  const [useCustomElo, setUseCustomElo] = useState(false);
  const [botElo, setBotElo] = useState(800);
  const [colorChoice, setColorChoice] = useState<"white" | "black" | "random">("white");
  const [selectedTime, setSelectedTime] = useState("unlimited");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);

  // Game mode
  const [modePreset, setModePreset] = useState<GameModePreset>("friendly");
  const [customSettings, setCustomSettings] = useState<GameModeSettings>({ ...DEFAULT_CUSTOM });

  // Restore last-used settings from localStorage
  useEffect(() => {
    const prefs = loadBotPrefs();
    setColorChoice(prefs.colorChoice);
    setSelectedTime(prefs.selectedTime);
    setShowCustomTime(prefs.showCustomTime);
    setCustomMinutes(prefs.customMinutes);
    setCustomIncrement(prefs.customIncrement);
    setModePreset(prefs.modePreset);
    setCustomSettings(prefs.customSettings);
    setUseCustomElo(prefs.useCustomElo);
    setBotElo(prefs.botElo);
  }, []);

  // UI state
  const [error, setError] = useState("");
  const [confirmStart, setConfirmStart] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [savedGames, setSavedGames] = useState<InProgressGame[]>([]);

  useEffect(() => {
    if (!user) fetchMe();
  }, [user, fetchMe]);
  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);
  const toast = useToast();

  // Check for in-progress games to resume
  useEffect(() => {
    setSavedGames(findInProgressGames());
  }, []);
  useEffect(() => {
    setPendingSyncCount(getPendingCount());
    if (isOnline) {
      // Sync offline games
      syncOfflineGames().then(({ failed }) => {
        setPendingSyncCount(getPendingCount());
        if (failed > 0) {
          toast.show(`${failed} game(s) failed to sync — will retry`, "error");
        }
      });
      // Retry any online games that failed to sync moves
      retryPendingSyncs().then(({ synced }) => {
        if (synced > 0) {
          toast.show(`${synced} game(s) synced successfully`, "success");
        }
      });
    }
  }, [isOnline]);

  function getActiveMode(): GameModeSettings {
    return modePreset === "custom"
      ? customSettings
      : GAME_MODE_PRESETS[modePreset as Exclude<GameModePreset, "custom">];
  }

  /**
   * Pick a bot and time control at random.
   *
   * Weighted toward the player's own rating rather than uniform across the
   * whole ladder: a 1200 player thrown at Aurora (3200) learns nothing, and a
   * pure uniform roll does that one time in seven. The window is wide enough to
   * be a real surprise and narrow enough to be a game.
   */
  function rollRandom() {
    if (botList.length === 0) return;
    const myRating = user?.rating ?? 1200;
    const inRange = botList.filter((b) => Math.abs(b.elo - myRating) <= 400);
    const pool = inRange.length >= 3 ? inRange : botList;
    const bot = pool[Math.floor(Math.random() * pool.length)];

    const timeKeys = Object.keys(TIME_CONTROL_PRESETS);
    const time = timeKeys[Math.floor(Math.random() * timeKeys.length)];

    setUseCustomElo(false);
    setSelectedBot(bot);
    setBotElo(bot.elo);
    setSelectedTime(time);
    setShowCustomTime(false);
    setColorChoice(Math.random() < 0.5 ? "white" : "black");
  }

  async function startGame() {
    setError("");
    setConfirmStart(false);
    const isWhite =
      colorChoice === "white" ? true : colorChoice === "black" ? false : Math.random() < 0.5;

    // Store game config in sessionStorage for the game page to read
    const settings = getActiveMode();
    const config = {
      elo: botElo,
      color: isWhite ? "white" : "black",
      mode: modePreset,
      botId: selectedBot?.id || null,
      settings,
    };
    try {
      sessionStorage.setItem("botGameConfig", JSON.stringify(config));
    } catch {}

    saveBotPrefs({
      colorChoice,
      selectedTime,
      showCustomTime,
      customMinutes,
      customIncrement,
      modePreset,
      customSettings,
      useCustomElo,
      botElo,
    });

    if (isOnline) {
      try {
        const body: Record<string, unknown> = {
          botElo,
          color: isWhite ? "white" : "black",
        };
        if (showCustomTime) {
          body.initialTime = customMinutes * 60;
          body.increment = customIncrement;
        } else {
          body.preset = selectedTime;
        }
        const { data } = await api.post("/api/v1/games/bot", body);
        router.push(`/play/bot/${data.game.id}`);
      } catch {
        setError("Failed to create game");
      }
    } else {
      const offId = generateOfflineGameId();
      router.push(`/play/bot/${offId}`);
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-950">
        <p className="text-night-400">Loading...</p>
      </main>
    );
  }

  const modes: GameModePreset[] = ["challenge", "friendly", "assisted", "custom"];

  return (
    <main className="flex min-h-screen flex-col items-center bg-night-950 p-3 pt-6 sm:p-4 sm:pt-10">
      <div className="max-w-lg w-full space-y-4 sm:space-y-5">
        <h1 className="text-center font-display text-3xl tracking-tight">Play the engine</h1>
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-2 text-center text-xs text-amber-300">
            Offline — games sync when you reconnect
          </div>
        )}
        {pendingSyncCount > 0 && isOnline && (
          <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-2 text-center text-xs text-emerald-300">
            Syncing {pendingSyncCount} offline game{pendingSyncCount > 1 ? "s" : ""}...
          </div>
        )}
        {savedGames.length > 0 && (
          <div className="bg-aurora-cyan/10 border border-aurora-cyan/40 rounded-lg p-3 space-y-2 text-night-200">
            <p className="text-sm font-medium text-aurora-cyan text-center">
              Resume in-progress game{savedGames.length > 1 ? "s" : ""}
            </p>
            {savedGames.slice(0, 3).map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2">
                <div className="text-xs text-night-300">
                  <span className="font-mono">Elo {g.botElo}</span>
                  <span className="text-night-400 ml-2">
                    {g.moves.length} move{g.moves.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/play/bot/${g.id}`)}
                    className="px-3 py-1 bg-aurora-cyan hover:bg-[#3ad2e8] rounded-lg text-xs font-medium transition-colors text-night-950"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => {
                      clearInProgress(g.id);
                      setSavedGames((prev) => prev.filter((s) => s.id !== g.id));
                    }}
                    className="px-3 py-1 bg-night-800 hover:bg-night-700 rounded-lg text-xs transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!botEngine.ready && (
          <div
            className={`rounded-lg border p-3 text-center ${
              botEngine.loadState === "failed"
                ? "border-red-500/40 bg-red-500/10"
                : "border-aurora-cyan/40 bg-aurora-cyan/10"
            }`}
          >
            {botEngine.loadState === "failed" ? (
              <>
                <p className="text-sm font-medium text-red-300">The engine could not load</p>
                <p className="mt-1 text-xs text-red-300/80">
                  Reload the page. If it keeps happening, your browser may be blocking WebAssembly.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-aurora-cyan">
                  {botEngine.loadState === "starting"
                    ? "Starting the engine..."
                    : "Downloading the engine..."}
                </p>
                {/* Indeterminate, honestly: the worker reports handshake stages,
                    not bytes, so a percentage would be invented. Two stages plus
                    motion is enough to show it is alive. */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-night-800">
                  <div
                    className="h-full rounded-full bg-aurora-cyan transition-all duration-500"
                    style={{ width: botEngine.loadState === "starting" ? "75%" : "35%" }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-aurora-cyan/80">
                  ~7MB, cached after the first load
                </p>
              </>
            )}
          </div>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Game Mode */}
        <div className="bg-night-900 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-night-400 mb-3 font-display">Game Mode</h2>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setModePreset(m)}
                className={`p-3 rounded-lg text-left transition-colors ${modePreset === m ? "bg-aurora-cyan" : "bg-night-800 hover:bg-night-700"} text-night-950`}
              >
                <span className="block text-sm font-medium">{GAME_MODE_LABELS[m].name}</span>
                <span className="block text-xs text-night-400">{GAME_MODE_LABELS[m].desc}</span>
              </button>
            ))}
          </div>
          {modePreset === "custom" && (
            <div className="mt-3 space-y-2 border-t border-night-700 pt-3">
              {(Object.keys(customSettings) as (keyof GameModeSettings)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between text-sm cursor-pointer"
                >
                  <span>
                    {key === "evalBar"
                      ? "Evaluation Bar"
                      : key === "moveFeedback"
                        ? "Move Feedback"
                        : key === "botChat"
                          ? "Bot Chat"
                          : key === "botReactions"
                            ? "Bot Reactions"
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <input
                    type="checkbox"
                    checked={customSettings[key]}
                    onChange={() => setCustomSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="rounded-lg"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Bot Difficulty */}
        <div className="bg-night-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-night-400 font-display">Bot Difficulty</h2>
            <button
              onClick={() => {
                setUseCustomElo(!useCustomElo);
                if (!useCustomElo) setSelectedBot(null);
              }}
              className="text-xs text-aurora-cyan hover:underline"
            >
              {useCustomElo ? "Choose a personality" : "Custom Elo"}
            </button>
          </div>
          {botsLoading && botList.length === 0 ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-night-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : useCustomElo || botList.length === 0 ? (
            <>
              {botList.length === 0 && !isOnline && (
                <p className="text-xs text-night-400 text-center mb-2">
                  Bot personalities available when online. Using custom Elo.
                </p>
              )}
              <div className="text-center mb-2">
                <span className="font-mono text-3xl font-bold tracking-tight">{botElo}</span>
                <span className="text-night-400 ml-2">{eloLabel(botElo)}</span>
              </div>
              <input
                type="range"
                min={200}
                max={3200}
                step={50}
                value={botElo}
                onChange={(e) => {
                  setBotElo(parseInt(e.target.value));
                  setSelectedBot(null);
                }}
                className="w-full"
              />
            </>
          ) : (
            <BotSelector
              bots={botList}
              selected={selectedBot}
              onSelect={(bot) => {
                setSelectedBot(bot);
                setBotElo(bot.elo);
              }}
            />
          )}
        </div>

        {/* Color */}
        <div className="bg-night-900 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-night-400 mb-3 font-display">Play As</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["white", "random", "black"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColorChoice(c)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${colorChoice === c ? "bg-aurora-cyan" : "bg-night-800 hover:bg-night-700"} text-night-950`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <TimeControlPicker
          selectedTime={showCustomTime ? "custom" : selectedTime}
          showCustomTime={showCustomTime}
          customMinutes={customMinutes}
          customIncrement={customIncrement}
          onSelect={(key) => {
            setSelectedTime(key);
            setShowCustomTime(false);
          }}
          onSelectCustom={(min, inc) => {
            setCustomMinutes(min);
            setCustomIncrement(inc);
            setShowCustomTime(true);
          }}
          onCustomMinutesChange={setCustomMinutes}
          onCustomIncrementChange={setCustomIncrement}
        />

        {!useCustomElo && <BotDetail bot={selectedBot} />}

        <div className="space-y-2.5">
          <button
            onClick={() => setConfirmStart(true)}
            disabled={!botEngine.ready}
            className="w-full rounded-xl bg-aurora-cyan py-3.5 text-lg font-semibold text-night-950 transition-colors hover:bg-[#3ad2e8] disabled:cursor-wait disabled:opacity-50 font-display"
          >
            {botEngine.ready ? "Start game" : "Loading engine..."}
          </button>

          <button
            onClick={() => {
              rollRandom();
              setConfirmStart(true);
            }}
            disabled={!botEngine.ready || botList.length === 0}
            className="w-full rounded-xl py-3 font-medium ring-1 ring-inset ring-night-700 transition-colors hover:bg-night-800 disabled:opacity-40"
          >
            Surprise me
            <span className="ml-2 text-sm text-night-400">random opponent and time</span>
          </button>
        </div>

        <div className="text-center">
          <Link href="/play" className="text-sm text-night-400 transition-colors hover:text-white">
            &larr; Back
          </Link>
        </div>

        <ConfirmModal
          open={confirmStart}
          title="Start Game?"
          message={`Mode: ${GAME_MODE_LABELS[modePreset].name}\nBot: ${selectedBot ? `${selectedBot.avatar} ${selectedBot.name}` : "Custom"} (${botElo} - ${eloLabel(botElo)})\nColor: ${colorChoice}\nTime: ${showCustomTime ? `${customMinutes}+${customIncrement}` : TIME_CONTROL_PRESETS[selectedTime]?.label || selectedTime}${!isOnline ? "\n\nOffline — will sync later" : ""}`}
          confirmLabel="Start"
          confirmVariant="primary"
          onConfirm={startGame}
          onCancel={() => setConfirmStart(false)}
        />
      </div>
    </main>
  );
}
