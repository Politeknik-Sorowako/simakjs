import { ArcElement, Chart, Legend, PieController, Title, Tooltip } from 'chart.js';
import { createEffect, createSignal, onCleanup } from 'solid-js';

Chart.register(PieController, ArcElement, Title, Tooltip, Legend);

interface PieChartProps {
  labels: string[];
  data: number[];
  backgroundColors?: string[];
  title?: string;
  height?: number;
  donut?: boolean;
}

const defaultColors = ['#6366f1', '#06b6d4', '#22c55e', '#f43f5e', '#eab308', '#f97316', '#a855f7', '#ec4899'];

export function PieChart(props: PieChartProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [chartInstance, setChartInstance] = createSignal<Chart | null>(null);

  createEffect(() => {
    if (!canvasRef) return;

    if (chartInstance()) {
      chartInstance()!.destroy();
    }

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: props.labels,
        datasets: [
          {
            data: props.data,
            backgroundColor: props.backgroundColors || defaultColors,
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: props.donut === false ? 0 : '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { size: 11 }, padding: 12 },
          },
          title: props.title
            ? { display: true, text: props.title, color: textColor, font: { size: 13, weight: 'bold' } }
            : undefined,
        },
      },
    });

    setChartInstance(chart);

    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      chart.options.plugins!.legend!.labels!.color = dark ? '#94a3b8' : '#64748b';
      if (chart.options.plugins!.title) {
        (chart.options.plugins!.title as Record<string, unknown>).color = dark ? '#94a3b8' : '#64748b';
      }
      chart.update();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    onCleanup(() => {
      observer.disconnect();
      chart.destroy();
    });
  });

  return (
    <div style={{ height: `${props.height || 250}px` }}>
      <canvas ref={canvasRef!} />
    </div>
  );
}
