import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { createEffect, createSignal, onCleanup } from 'solid-js';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
  title?: string;
  height?: number;
  yLabel?: string;
}

export function LineChart(props: LineChartProps) {
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
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: props.labels,
        datasets: props.datasets.map((ds) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.borderColor || '#6366f1',
          backgroundColor: ds.backgroundColor || 'rgba(99, 102, 241, 0.1)',
          fill: ds.fill ?? true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: props.datasets.length > 1, labels: { color: textColor, font: { size: 11 } } },
          title: props.title
            ? { display: true, text: props.title, color: textColor, font: { size: 13, weight: 'bold' } }
            : undefined,
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor },
            title: props.yLabel ? { display: true, text: props.yLabel, color: textColor } : undefined,
          },
        },
      },
    });

    setChartInstance(chart);

    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      const tc = dark ? '#94a3b8' : '#64748b';
      const gc = dark ? '#334155' : '#e2e8f0';
      chart.options.scales!.x!.ticks!.color = tc;
      chart.options.scales!.y!.ticks!.color = tc;
      chart.options.plugins!.legend!.labels!.color = tc;
      if (chart.options.plugins!.title) {
        (chart.options.plugins!.title as any).color = tc;
      }
      chart.options.scales!.x!.grid!.color = gc;
      chart.options.scales!.y!.grid!.color = gc;
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
