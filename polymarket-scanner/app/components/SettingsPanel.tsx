"use client";

import { ALL_MARKET_TYPES, LIMITS, MARKET_TYPE_LABELS, type Settings } from "@/lib/config";
import { cents, num, pct, usd } from "@/lib/format";
import type { MarketType } from "@/lib/types";

/** Slider positions for the minimum return: fine steps where it matters most. */
export const RETURN_STEPS: number[] = (() => {
  const out: number[] = [];
  for (let x = 1.2; x < 3 - 1e-9; x += 0.1) out.push(Math.round(x * 10) / 10);
  for (let x = 3; x < 5 - 1e-9; x += 0.25) out.push(Math.round(x * 100) / 100);
  for (let x = 5; x < 10 - 1e-9; x += 0.5) out.push(Math.round(x * 10) / 10);
  for (let x = 10; x <= LIMITS.minReturn.max + 1e-9; x += 1) out.push(x);
  return out;
})();

const SPREAD_STEPS = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.15, 0.2];
const LIQUIDITY_STEPS = [0, 100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000];
const LEG_PROB_STEPS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
const RESULT_OPTIONS = [10, 25, 50, 100];

function nearestIndex(steps: number[], value: number): number {
  let best = 0;
  for (let i = 1; i < steps.length; i++) if (Math.abs(steps[i] - value) < Math.abs(steps[best] - value)) best = i;
  return best;
}

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
  sports: { name: string; matches: number }[];
};

export function SettingsPanel({ settings, onChange, sports }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const allSports = settings.sports === null;
  const sportOn = (name: string) => allSports || settings.sports!.includes(name);

  const toggleSport = (name: string) => {
    const current = allSports ? sports.map((s) => s.name) : settings.sports!;
    const next = current.includes(name) ? current.filter((s) => s !== name) : [...current, name];
    set({ sports: next });
  };
  const toggleType = (t: MarketType) => {
    const has = settings.marketTypes.includes(t);
    const next = has ? settings.marketTypes.filter((x) => x !== t) : ALL_MARKET_TYPES.filter((x) => x === t || settings.marketTypes.includes(x));
    set({ marketTypes: next });
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Instellingen</h2>

      <Field label="Sporten">
        <div className="flex flex-wrap gap-2">
          <Chip active={allSports} onClick={() => set({ sports: allSports ? ["Voetbal"] : null })}>
            Alle sporten
          </Chip>
          {sports.map((s) => (
            <Chip
              key={s.name}
              active={!allSports && sportOn(s.name)}
              pressed={sportOn(s.name)}
              dim={allSports}
              onClick={() => toggleSport(s.name)}
            >
              {s.name}
              <span className="ml-1 text-xs">
                <span className="sr-only">, </span>
                {s.matches}
                <span className="sr-only"> wedstrijden</span>
              </span>
            </Chip>
          ))}
          {sports.length === 0 && <span className="text-sm text-zinc-500 dark:text-zinc-400">Scan eerst om de sporten te zien.</span>}
        </div>
      </Field>

      <Field label="Markttypes">
        <div className="flex flex-wrap gap-2">
          {ALL_MARKET_TYPES.map((t) => (
            <Chip key={t} active={settings.marketTypes.includes(t)} onClick={() => toggleType(t)}>
              {MARKET_TYPE_LABELS[t]}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Slider
          label="Minimale return"
          value={`${num(settings.minReturn, 2)}×`}
          steps={RETURN_STEPS}
          current={settings.minReturn}
          onPick={(v) => set({ minReturn: v })}
        />
        <div>
          <Label>Aantal legs</Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">min.</span>
            <Select
              value={settings.minLegs}
              options={range(LIMITS.legs.min, LIMITS.legs.max)}
              onChange={(v) => set({ minLegs: v, maxLegs: Math.max(v, settings.maxLegs) })}
              aria="Minimum aantal legs"
            />
            <span className="text-zinc-500 dark:text-zinc-400">max.</span>
            <Select
              value={settings.maxLegs}
              options={range(LIMITS.legs.min, LIMITS.legs.max)}
              onChange={(v) => set({ maxLegs: v, minLegs: Math.min(v, settings.minLegs) })}
              aria="Maximum aantal legs"
            />
          </div>
        </div>
        <Slider
          label="Min. liquiditeit per markt"
          value={usd(settings.minLiquidity)}
          steps={LIQUIDITY_STEPS}
          current={settings.minLiquidity}
          onPick={(v) => set({ minLiquidity: v })}
        />
        <Slider
          label="Max. spread"
          value={cents(settings.maxSpread)}
          steps={SPREAD_STEPS}
          current={settings.maxSpread}
          onPick={(v) => set({ maxSpread: v })}
        />
        <Slider
          label="Max. kans per leg"
          value={settings.maxLegProb >= 1 ? "geen limiet" : pct(settings.maxLegProb, 0)}
          steps={LEG_PROB_STEPS}
          current={settings.maxLegProb}
          onPick={(v) => set({ maxLegProb: v })}
        />
        <div>
          <Label>Aantal resultaten</Label>
          <div className="flex flex-wrap gap-2">
            {RESULT_OPTIONS.map((n) => (
              <Chip key={n} active={settings.maxResults === n} onClick={() => set({ maxResults: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{children}</div>;
}

function Chip({
  active,
  pressed,
  dim,
  onClick,
  children,
}: {
  active: boolean;
  pressed?: boolean; // for screen readers when it differs from the look (sports under "Alle sporten")
  dim?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed ?? active}
      className={
        "rounded-full border px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
          : dim
            ? "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300")
      }
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  steps,
  current,
  onPick,
}: {
  label: string;
  value: string;
  steps: number[];
  current: number;
  onPick: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={nearestIndex(steps, current)}
        aria-valuetext={value}
        onChange={(e) => onPick(steps[Number(e.target.value)])}
        className="w-full accent-indigo-600"
      />
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
  aria,
}: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
  aria: string;
}) {
  return (
    <select
      aria-label={aria}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
