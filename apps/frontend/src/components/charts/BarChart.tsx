import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { createEffect, createSignal, onCleanup } from 'solid-js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface BarChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  title?: string;
  height?: number;
  horizontal?: boolean;
}

export function BarChart(props: BarChartProps) {
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
      type: props.horizontal ? 'bar' : 'bar',
      data: {
        labels: props.labels,
        datasets: props.datasets.map((ds) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor:
            ds.backgroundColor ||
            (isDark
              ? ['#4f46e5', '#06b6d4', '#22c55e', '#f43f5e', '#eab308']
              : ['#6366f1', '#06b6d4', '#22c55e', '#f43f5e', '#eab308']),
          borderColor: ds.borderColor || 'transparent',
          borderRadius: 6,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: props.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: props.datasets.length > 1, labels: { color: textColor, font: { size: 11 } } },
          title: props.title
            ? { display: true, text: props.title, color: textColor, font: { size: 13, weight: 'bold' } }
            : undefined,
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: isDark ? '#334155' : '#e2e8f0' } },
          y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: isDark ? '#334155' : '#e2e8f0' } },
        },
      },
    });

    setChartInstance(chart);

    // Observer for theme changes
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      chart.options.scales!.x!.ticks!.color = dark ? '#94a3b8' : '#64748b';
      chart.options.scales!.y!.ticks!.color = dark ? '#94a3b8' : '#64748b';
      chart.options.plugins!.legend!.labels!.color = dark ? '#94a3b8' : '#64748b';
      if (chart.options.plugins!.title) {
        (chart.options.plugins!.title as any).color = dark ? '#94a3b8' : '#64748b';
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
