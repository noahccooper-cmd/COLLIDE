export function getNightOf(): string {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 4) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}

export function formatNightDate(): string {
  const nightStr = getNightOf();
  const date = new Date(nightStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function getBubbleStyle(count: number, isLive: boolean) {
  const base = (() => {
    if (count >= 150) return {
      size: 72,
      color: '#FF2D05',
      glow: '0 0 20px rgba(255, 45, 5, 0.5)',
      pulse: true,
      pulseSpeed: '1.5s',
    };
    if (count >= 75) return {
      size: 56,
      color: '#FF5E1A',
      glow: '0 0 14px rgba(255, 94, 26, 0.35)',
      pulse: true,
      pulseSpeed: '2s',
    };
    if (count >= 25) return {
      size: 44,
      color: '#FFAA00',
      glow: 'none',
      pulse: false,
      pulseSpeed: '0',
    };
    if (count > 0) return {
      size: 36,
      color: '#4A4A52',
      glow: 'none',
      pulse: false,
      pulseSpeed: '0',
    };
    return {
      size: 32,
      color: '#333338',
      glow: 'none',
      pulse: false,
      pulseSpeed: '0',
    };
  })();

  return {
    ...base,
    liveRing: isLive,
  };
}

export function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getCapacityPercent(count: number, capacity: number | null): number | null {
  if (!capacity || capacity <= 0) return null;
  return Math.min(Math.round((count / capacity) * 100), 100);
}

export function getCapacityColor(percent: number): string {
  if (percent >= 90) return '#FF2D05';
  if (percent >= 70) return '#FF5E1A';
  if (percent >= 50) return '#FFAA00';
  return '#00E676';
}
