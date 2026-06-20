import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconKey, IconBot, IconFileText, IconSatellite } from '@/components/ui/icons';
import { useAuthStore, useConfigStore, useModelsStore } from '@/stores';
import { authFilesApi } from '@/services/api';
import { useApiKeysForModels } from '@/hooks/useApiKeysForModels';
import styles from './DashboardPage.module.scss';

interface MetricCard {
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'violet' | 'green' | 'orange';
  icon: React.ReactNode;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const serverVersion = useAuthStore((state) => state.serverVersion);
  const apiBase = useAuthStore((state) => state.apiBase);
  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const models = useModelsStore((state) => state.models);
  const modelsLoading = useModelsStore((state) => state.loading);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);
  const [authFilesCount, setAuthFilesCount] = useState<number | null>(null);
  const [authFilesLoading, setAuthFilesLoading] = useState(false);
  const resolveApiKeysForModels = useApiKeysForModels();

  const fetchModels = useCallback(async () => {
    if (connectionStatus !== 'connected' || !apiBase) return;
    try {
      const apiKeys = await resolveApiKeysForModels();
      await fetchModelsFromStore(apiBase, apiKeys[0]);
    } catch {
      // Keep dashboard available when model discovery is unavailable.
    }
  }, [connectionStatus, apiBase, resolveApiKeysForModels, fetchModelsFromStore]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    let cancelled = false;
    const loadAuthFiles = async () => {
      setAuthFilesLoading(true);
      try {
        const res = await authFilesApi.list();
        if (!cancelled) setAuthFilesCount(res.files.length);
      } catch {
        if (!cancelled) setAuthFilesCount(null);
      } finally {
        if (!cancelled) setAuthFilesLoading(false);
      }
    };
    fetchConfig().catch(() => undefined);
    fetchModels();
    void loadAuthFiles();
    return () => {
      cancelled = true;
    };
  }, [connectionStatus, fetchConfig, fetchModels]);

  const providerStats = config
    ? {
        gemini: config.geminiApiKeys?.length ?? 0,
        codex: config.codexApiKeys?.length ?? 0,
        claude: config.claudeApiKeys?.length ?? 0,
        vertex: config.vertexApiKeys?.length ?? 0,
        openai: config.openaiCompatibility?.length ?? 0,
      }
    : null;
  const totalProviderKeys = providerStats
    ? Object.values(providerStats).reduce((sum, count) => sum + count, 0)
    : 0;
  const managementKeys = config?.apiKeys?.length ?? 0;
  const activeCredentials = authFilesCount ?? 0;

  const metrics: MetricCard[] = [
    { label: 'Total Requests', value: '0', delta: '→ +0.0%', tone: 'blue', icon: <IconKey size={20} /> },
    { label: 'Avg Tokens', value: '0', delta: '→ +0.0%', tone: 'violet', icon: <IconBot size={20} /> },
    { label: 'Success Rate', value: '100.00%', delta: '→ +0.0%', tone: 'green', icon: <IconSatellite size={20} /> },
    { label: 'MTD Cost', value: '$0.00', delta: '→ +0.0%', tone: 'orange', icon: <IconFileText size={20} /> },
  ];

  const quickLinks = [
    { label: t('nav.config_management'), value: managementKeys, to: '/config' },
    { label: t('nav.ai_providers'), value: totalProviderKeys, to: '/ai-providers' },
    { label: t('nav.auth_files'), value: authFilesLoading ? '...' : activeCredentials, to: '/auth-files' },
    { label: t('dashboard.available_models'), value: modelsLoading ? '...' : models.length, to: '/system' },
  ];

  return (
    <div className={styles.dashboardShell}>
      <section className={styles.headerBlock}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Real-time insights into your API infrastructure.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.versionPill}>{serverVersion ? `v${serverVersion}` : 'System'}</span>
          <span className={`${styles.statusPill} ${connectionStatus === 'connected' ? styles.online : ''}`}>
            {connectionStatus === 'connected' ? 'Online' : 'Offline'}
          </span>
        </div>
      </section>

      <section className={styles.metricGrid}>
        {metrics.map((metric) => (
          <article key={metric.label} className={styles.metricCard}>
            <div className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.icon}</div>
            <span className={styles.metricDelta}>{metric.delta}</span>
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.analyticsGrid}>
        <article className={styles.trafficPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Traffic Volume</h2>
              <p>Requests per hour over time</p>
            </div>
            <div className={styles.segmented}><span>Vol</span><span>Err</span></div>
          </div>
          <div className={styles.chartArea}>
            <div className={styles.gridLines} />
            <div className={styles.flatLine} />
            <div className={styles.timeAxis}>
              <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
            </div>
          </div>
        </article>

        <article className={styles.costPanel}>
          <h2>Cost Distribution</h2>
          <p>No cost data available</p>
        </article>
      </section>

      <section className={styles.linksGrid}>
        {quickLinks.map((item) => (
          <Link to={item.to} className={styles.linkCard} key={item.to}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Link>
        ))}
      </section>

      <section className={styles.recentPanel}>
        <div className={styles.panelHeader}>
          <h2>Recent Requests</h2>
          <Link to="/logs">View All Logs →</Link>
        </div>
        <div className={styles.tableShell}>
          <div className={styles.tableHead}>
            <span>Status</span><span>Timestamp</span><span>Method</span><span>Model</span><span>Tokens</span><span>Cost</span>
          </div>
          <div className={styles.emptyState}>No recent request data yet.</div>
        </div>
      </section>
    </div>
  );
}
