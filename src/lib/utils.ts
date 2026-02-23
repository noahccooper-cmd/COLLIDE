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

export function getDotTier(count: number): string {
  if (count === 0) return 'dot-t0';
  if (count <= 20) return 'dot-t1';
  if (count <= 60) return 'dot-t2';
  if (count <= 120) return 'dot-t3';
  if (count <= 200) return 'dot-t4';
  return 'dot-t5';
}

export function getShortName(name: string): string {
  return name.replace(/\s*(Bar\s*&?\s*Grill|Bar\s*and\s*Grill|Restaurant)\s*$/i, '').trim();
}

/** Extract a short label for the map cover bubble (e.g. "$20", "FREE") */
export function getCoverLabel(cover: string): string {
  const t = cover.trim().toUpperCase();
  if (t === 'FREE' || t === 'FREE ENTRY' || t === 'NO COVER') return 'FREE';
  const m = cover.match(/\$\d+/);
  if (m) return m[0];
  return cover.length > 5 ? cover.slice(0, 5) : cover;
}

export function getCommentDay(): string {
  const now = new Date();
  if (now.getHours() < 12) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
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
