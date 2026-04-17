import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DashboardMetricsData, fetchDashboardMetrics } from '../lib/api';

function formatAmount(value: number) {
  return `$${value.toLocaleString()}`;
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDashboardMetrics();
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard metrics.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const fallback = {
    totalPendingAmount: 0,
    averageTurnaroundHours: 0,
    staleApplications: 0,
    processingToday: 0,
    completedToday: 0,
    totalCompletedValue: 0,
  };

  const data = metrics ?? fallback;

  const cards = [
    {
      title: 'Total Pending Disbursement',
      value: formatAmount(data.totalPendingAmount),
      icon: DollarSign,
      description: 'Aggregate value awaiting release',
      color: 'text-blue-600'
    },
    {
      title: 'Average Turnaround Time',
      value: `${data.averageTurnaroundHours.toFixed(1)}h`,
      icon: TrendingUp,
      description: 'From approval through completion',
      color: 'text-green-600'
    },
    {
      title: 'Stale Applications',
      value: data.staleApplications,
      icon: AlertTriangle,
      description: 'Older than the queue SLA',
      color: 'text-orange-600'
    },
    {
      title: 'Processing Today',
      value: data.processingToday,
      icon: Clock,
      description: 'Applications received or progressed today',
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {error && !loading && !metrics ? (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {cards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {loading && !metrics && !error ? (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading dashboard metrics...</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
