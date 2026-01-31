"use client";

import React, { useEffect, useMemo, useState } from "react";

// ---------------------------
// Minimal UI components
// (so we don't depend on @/components/ui/*)
// ---------------------------

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white/90 backdrop-blur shadow-lg",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 md:p-8", className)} {...props} />;
}

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const sizes = size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm";
  const variants =
    variant === "outline"
      ? "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
      : variant === "ghost"
      ? "bg-transparent hover:bg-slate-100 text-slate-900"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return <button type={type} className={cn(base, sizes, variants, className)} {...props} />;
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none",
        "focus:border-orange-300 focus:ring-2 focus:ring-orange-100",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------
// Math helpers
// ---------------------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, dp = 2) {
  const p = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * p) / p;
}

/**
 * Safe number formatter.
 * - Never throws.
 * - Returns an em-dash for null/undefined/non-finite values.
 */
function format(n: number | null | undefined, dp = 2) {
  if (n == null) return "—";
  if (typeof n !== "number") return "—";
  if (!Number.isFinite(n)) return "—";
  return String(round(n, dp));
}

function calc(doseMg: number, vialMg: number, waterMl: number) {
  const conc = vialMg > 0 && waterMl > 0 ? vialMg / waterMl : NaN; // mg/mL
  const mL = doseMg > 0 && Number.isFinite(conc) && conc > 0 ? doseMg / conc : NaN;
  const units = Number.isFinite(mL) ? mL * 100 : NaN; // U-100
  return { conc, mL, units };
}

// Self-tests (dev only)
function runSelfTests() {
  const a = calc(0.25, 15, 3);
  console.assert(Math.abs(a.conc - 5) < 1e-9, "Expected 5 mg/mL");
  console.assert(Math.abs(a.units - 5) < 1e-9, "0.25 mg @ 5 mg/mL => 5 units");

  const b = calc(0.2, 10, 2);
  console.assert(Math.abs(b.units - 4) < 1e-9, "0.2 mg @ 5 mg/mL => 4 units");

  const c = calc(50, 500, 3);
  console.assert(Math.abs(c.units - 30) < 1e-6, "50 mg @ 166.67 mg/mL => ~30 units");

  console.assert(format(null) === "—", "format(null)");
  console.assert(format(undefined) === "—", "format(undefined)");
  console.assert(format(NaN) === "—", "format(NaN)");
  console.assert(format(Infinity) === "—", "format(Infinity)");
  console.assert(format(1.2345, 2) === "1.23", "format rounding");
}

if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") {
  try {
    runSelfTests();
  } catch {
    // ignore
  }
}

// ---------------------------
// Syringe visual
// ---------------------------

function SyringeScale({ maxUnits, valueUnits }: { maxUnits: number; valueUnits: number }) {
  const width = 980;
  const height = 160;
  const padL = 48;
  const padR = 48;
  const trackY = 82;
  const trackH = 24;
  const trackW = width - padL - padR;

  const safeUnits = Number.isFinite(valueUnits) ? clamp(valueUnits, 0, maxUnits) : 0;
  const pct = maxUnits > 0 ? safeUnits / maxUnits : 0;
  const x = padL + pct * trackW;

  const unitsList = Array.from({ length: maxUnits + 1 }, (_, i) => i);

  const tickH = (u: number) => (u % 10 === 0 ? 34 : u % 5 === 0 ? 22 : 12);
  const tickW = (u: number) => (u % 10 === 0 ? 2.8 : u % 5 === 0 ? 2.1 : 1.2);
  const labelEvery = 10;

  return (
    <div className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-2xl border bg-white">
        {/* Barrel */}
        <rect x={padL} y={trackY} width={trackW} height={trackH} rx={12} fill="#f8fafc" stroke="#e2e8f0" />
        {/* Fill */}
        <rect x={padL} y={trackY} width={pct * trackW} height={trackH} rx={12} fill="rgba(249,115,22,0.20)" />

        {/* Plunger */}
        <rect x={14} y={trackY - 8} width={26} height={trackH + 16} rx={10} fill="#f97316" opacity={0.95} />
        <rect x={40} y={trackY - 3} width={12} height={trackH + 6} rx={8} fill="#f97316" opacity={0.55} />

        {/* Needle hub */}
        <rect x={width - 40} y={trackY - 6} width={18} height={trackH + 12} rx={7} fill="#f97316" opacity={0.55} />
        <rect x={width - 22} y={trackY + 9} width={10} height={6} rx={3} fill="#0f172a" opacity={0.7} />

        {/* Tick marks */}
        {unitsList.map((u) => {
          const tx = padL + (u / maxUnits) * trackW;
          const h = tickH(u);
          const w = tickW(u);
          const y1 = trackY - h;
          const y2 = trackY;
          const stroke = u % 10 === 0 ? "#334155" : u % 5 === 0 ? "#64748b" : "#cbd5e1";
          return (
            <g key={u}>
              <line x1={tx} x2={tx} y1={y1} y2={y2} stroke={stroke} strokeWidth={w} />
              {u % labelEvery === 0 && (
                <text x={tx} y={trackY - h - 10} fontSize="12" textAnchor="middle" fill="#0f172a" opacity={0.9}>
                  {u}
                </text>
              )}
            </g>
          );
        })}

        {/* Marker */}
        {Number.isFinite(valueUnits) && (
          <g>
            <line x1={x} x2={x} y1={trackY - 56} y2={trackY + trackH + 22} stroke="#f97316" strokeWidth={4} />
            <polygon points={`${x},${trackY - 62} ${x - 10},${trackY - 44} ${x + 10},${trackY - 44}`} fill="#f97316" />
          </g>
        )}

        <text x={padL} y={trackY + trackH + 48} fontSize="12" fill="#64748b">
          0 units
        </text>
        <text x={padL + trackW} y={trackY + trackH + 48} fontSize="12" textAnchor="end" fill="#64748b">
          {maxUnits} units
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div>Minor: 1 • Medium: 5 • Major: 10 • U-100: 100 units = 1.00 mL</div>
        <div className="rounded-full bg-slate-900 text-white px-3 py-1">
          Draw to: <span className="font-semibold">{Number.isFinite(valueUnits) ? format(valueUnits, 1) : "—"}</span> units
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Page
// ---------------------------

export default function Page() {
  // set browser tab title
  useEffect(() => {
    try {
      document.title = "Dose Converter";
    } catch {
      // ignore
    }
  }, []);

  type SyringeKey = "u30" | "u50" | "u100";
  const syringeOptions: Array<{ key: SyringeKey; label: string; maxUnits: number }> = [
    { key: "u30", label: "0.30 mL", maxUnits: 30 },
    { key: "u50", label: "0.50 mL", maxUnits: 50 },
    { key: "u100", label: "1.0 mL", maxUnits: 100 },
  ];

  const [syringeKey, setSyringeKey] = useState<SyringeKey>("u50");
  const maxUnits = syringeOptions.find((s) => s.key === syringeKey)?.maxUnits ?? 50;

  const vialButtons = [5, 10, 15, 20, 30, 500, 1000] as const;
  const [vialMode, setVialMode] = useState<"preset" | "other">("preset");
  const [vialMg, setVialMg] = useState<string>("10");

  const waterButtons = [1, 2, 3, 5, 10] as const;
  const [waterMode, setWaterMode] = useState<"preset" | "other">("preset");
  const [waterMl, setWaterMl] = useState<string>("2");

  const [doseMg, setDoseMg] = useState<string>("");

  const resetAll = () => {
    setSyringeKey("u50");
    setVialMode("preset");
    setVialMg("10");
    setWaterMode("preset");
    setWaterMl("2");
    setDoseMg("");
  };

  const parsed = useMemo(() => {
    const d = parseFloat(doseMg);
    const v = parseFloat(vialMg);
    const w = parseFloat(waterMl);
    const { conc, mL, units } = calc(d, v, w);
    return { dose: d, vialMg: v, waterMl: w, conc, mL, units };
  }, [doseMg, vialMg, waterMl]);

  const unitsOk = Number.isFinite(parsed.units) && parsed.units <= maxUnits;
  const tiny = Number.isFinite(parsed.units) && parsed.units > 0 && parsed.units < 1;

  const doseQuick = useMemo(() => [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 25, 50], []);

  const chipClass = (active: boolean) =>
    cn(
      "rounded-xl h-14 border transition",
      active
        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
    );

  const smallChipClass = (active: boolean) =>
    cn(
      "rounded-lg border transition",
      active
        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
    );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dose Converter</h1>
          <div className="mt-1 text-sm text-slate-500">Dosage calculator & unit conversion</div>
          <p className="text-sm text-slate-500">Enter what you have and convert doses into syringe units.</p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <strong>Important:</strong> This tool performs unit conversions only. It does not give medical advice.
          </div>
        </div>

        <Card className="mt-8">
          <CardContent>
            {/* Step guidance */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-2 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Step 1:</span> Enter syringe size, vial amount, BAC water, and dose to calculate units.
                </div>
                <div>
                  <span className="font-semibold">Step 2:</span> Use the quick-dose buttons to speed up entry.
                </div>
              </div>
            </div>

            {/* Top: Syringe size + output */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="text-sm font-semibold text-slate-800">Select a Syringe Size</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {syringeOptions.map((s) => {
                    const active = syringeKey === s.key;
                    return (
                      <button
                        key={s.key}
                        className={chipClass(active)}
                        onClick={() => setSyringeKey(s.key)}
                        type="button"
                      >
                        <div className="flex flex-col leading-tight items-center">
                          <span className="font-semibold">{s.label}</span>
                          <span className={cn("text-xs", active ? "text-white/90" : "text-slate-500")}>
                            {s.maxUnits} units
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Output box */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="text-sm font-semibold text-slate-800">Dosage in units on the syringe</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-4xl font-semibold tracking-tight text-slate-900">
                    {Number.isFinite(parsed.units) ? format(parsed.units, 1) : "—"}
                  </div>
                  <div className="text-xs text-slate-500">units (U-100 scale)</div>
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  Concentration:{" "}
                  <span className="font-semibold text-slate-900">
                    {Number.isFinite(parsed.conc) ? `${format(parsed.conc, 3)} mg/mL` : "—"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Volume:{" "}
                  <span className="font-semibold text-slate-900">
                    {Number.isFinite(parsed.mL) ? `${format(parsed.mL, 3)} mL` : "—"}
                  </span>
                </div>

                <div className="mt-3">
                  {!Number.isFinite(parsed.units) || !(parsed.dose > 0) ? (
                    <div className="text-xs text-slate-500">Enter a dose to calculate.</div>
                  ) : !unitsOk ? (
                    <div className="text-xs font-semibold text-red-600">
                      Exceeds this syringe ({maxUnits} units). Choose a larger syringe.
                    </div>
                  ) : tiny ? (
                    <div className="text-xs font-semibold text-amber-700">Very small volume — measure carefully.</div>
                  ) : (
                    <div className="text-xs font-semibold text-emerald-700">Looks good for this syringe.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Vial mg + BAC mL + dose */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Vial mg */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">Amount in vial</div>
                <div className="mt-1 text-xs text-slate-500">Presets set vial only — enter your own dose</div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {vialButtons.map((mg) => {
                    const active = vialMode === "preset" && Number(vialMg) === mg;
                    return (
                      <button
                        key={mg}
                        className={cn("h-10", smallChipClass(active))}
                        onClick={() => {
                          setVialMode("preset");
                          setVialMg(String(mg));
                        }}
                        type="button"
                      >
                        {mg}mg
                      </button>
                    );
                  })}
                  <button
                    className={cn("h-10", smallChipClass(vialMode === "other"))}
                    onClick={() => setVialMode("other")}
                    type="button"
                  >
                    Other
                  </button>
                </div>

                {vialMode === "other" && (
                  <div className="mt-3">
                    <Input
                      inputMode="decimal"
                      value={vialMg}
                      onChange={(e) => setVialMg(e.target.value)}
                      placeholder="mg"
                    />
                  </div>
                )}
              </div>

              {/* BAC water */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">BAC water</div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {waterButtons.map((ml) => {
                    const active = waterMode === "preset" && Number(waterMl) === ml;
                    return (
                      <button
                        key={ml}
                        className={cn("h-10", smallChipClass(active))}
                        onClick={() => {
                          setWaterMode("preset");
                          setWaterMl(String(ml));
                        }}
                        type="button"
                      >
                        {ml}mL
                      </button>
                    );
                  })}
                  <button
                    className={cn("h-10", smallChipClass(waterMode === "other"))}
                    onClick={() => setWaterMode("other")}
                    type="button"
                  >
                    Other
                  </button>
                </div>

                {waterMode === "other" && (
                  <div className="mt-3">
                    <Input
                      inputMode="decimal"
                      value={waterMl}
                      onChange={(e) => setWaterMl(e.target.value)}
                      placeholder="mL"
                    />
                  </div>
                )}
              </div>

              {/* Dose */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">Dose (mg)</div>
                <div className="mt-3">
                  <Input
                    inputMode="decimal"
                    value={doseMg}
                    onChange={(e) => setDoseMg(e.target.value)}
                    placeholder="Enter your dose (mg)"
                  />
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {doseQuick.map((d) => (
                    <button
                      key={d}
                      className={cn(
                        "h-9 px-3 rounded-full border border-slate-200 bg-white text-sm hover:bg-slate-50 transition",
                        "active:scale-[0.98]"
                      )}
                      onClick={() => setDoseMg(String(d))}
                      type="button"
                    >
                      {format(d, d < 1 ? 2 : 0)}mg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual syringe */}
            <div className="mt-10">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-medium text-slate-600">Needle Guide</div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Visual syringe (with tick marks)</div>
                <div className="text-xs text-slate-500">Selected: {maxUnits} unit syringe</div>
              </div>
              <div className="mt-3">
                <SyringeScale maxUnits={maxUnits} valueUnits={parsed.units} />
              </div>
            </div>

            <footer className="mt-12 text-center text-xs text-slate-400 tracking-wide">
              Dose Converter is a unit-conversion and reference tool. No medical advice.
            </footer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
