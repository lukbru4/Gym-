// Einheitliche Chart.js-Optik: dünne Linien, dezentes Raster, Tooltip beim Antippen.
// Die Farben kommen aus den CSS-Variablen; nach einem Designwechsel wird neu gezeichnet.
import { Chart, registerables } from 'chart.js';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { fmt } from '../lib/format';
import { subscribeTheme, themeVersion } from '../lib/themeStore';

Chart.register(...registerables);

export interface Series { label: string; data: number[]; color: string }

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function ChartView(props: {
  type: 'bar' | 'line';
  labels: string[];
  series: Series[];
  unit: string;
  integer?: boolean;
  ariaLabel?: string;
  id?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, themeVersion);
  const { type, labels, series, unit, integer } = props;
  // Nur neu zeichnen, wenn sich die Werte wirklich ändern (nicht bei jedem Rendern)
  const key = JSON.stringify([type, labels, series, unit, integer]);
  useEffect(() => {
    if (!ref.current) return;
    const text = cssVar('--text-secondary');
    const grid = cssVar('--grid');
    const surface = cssVar('--surface');
    const color = (c: string) => (c.startsWith('--') ? cssVar(c) : c);
    const chart = new Chart(ref.current, {
      type,
      data: {
        labels,
        datasets: series.map((d) => ({
          label: d.label,
          data: d.data,
          borderColor: color(d.color),
          backgroundColor: color(d.color),
          borderWidth: 2,
          pointRadius: type === 'line' ? 4 : 0,
          pointHoverRadius: 6,
          pointBorderColor: surface,
          pointBorderWidth: 2,
          borderRadius: type === 'bar' ? 4 : 0,
          maxBarThickness: 28,
          tension: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: series.length > 1, labels: { color: text, boxWidth: 12, boxHeight: 12 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)} ${unit}` } },
        },
        scales: {
          x: { ticks: { color: text, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false }, border: { color: grid } },
          y: {
            beginAtZero: type === 'bar',
            ticks: { color: text, callback: (v) => fmt(Number(v)), ...(integer ? { precision: 0 } : {}) },
            grid: { color: grid },
            border: { display: false },
            title: { display: true, text: unit, color: text },
          },
        },
      },
    });
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, theme]);
  return (
    <div className="chart">
      <canvas ref={ref} id={props.id} aria-label={props.ariaLabel} />
    </div>
  );
}
