'use client';

import { getGlobalStats } from '@/lib/data';

export function StatsStrip() {
  const stats = getGlobalStats();

  return (
    <div className="stats-strip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="stat-pill">
            <span className="stat-label">Models: </span>
            <span className="stat-value">{stats.models}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Dimensions: </span>
            <span className="stat-value">{stats.dimensions}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Trials: </span>
            <span className="stat-value">{stats.trials.toLocaleString()}</span>
          </div>
          <a
            href={stats.osf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="stat-pill hover:bg-white/20 transition-colors"
          >
            <span className="stat-label">Pre-registered: </span>
            <span className="stat-value">osf.io/{stats.osf_id}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
