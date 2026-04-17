import { AlertTriangle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { LoanRecord } from '@/app/types/loan';

interface DashboardMetricsProps {
  loans: LoanRecord[];
}

export function DashboardMetrics({ loans }: DashboardMetricsProps) {
  const pendingLoans = loans.filter(l => 
    l.status === 'Unassigned' || l.status === 'In Progress' || l.status === 'On Hold'
  );
  
  const totalPending = pendingLoans.reduce((sum, loan) => sum + loan.amount, 0);
  
  const completedLoans = loans.filter(l => l.status === 'Completed');
  const avgTurnaround = completedLoans.length > 0
    ? completedLoans.reduce((sum, loan) => {
        if (loan.completedAt && loan.createdAt) {
          return sum + (loan.completedAt.getTime() - loan.createdAt.getTime());
        }
        return sum;
      }, 0) / completedLoans.length / (1000 * 60 * 60)
    : 0;
  
  const staleLoans = pendingLoans.filter(loan => {
    const hoursSinceCreation = (Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation > 24;
  });
  
  const metrics = [
    {
      title: 'Total Pending Disbursement',
      value: `$${totalPending.toLocaleString()}`,
      icon: DollarSign,
      description: `${pendingLoans.length} loans awaiting disbursement`,
      color: 'text-blue-600'
    },
    {
      title: 'Average Turnaround Time',
      value: `${avgTurnaround.toFixed(1)}h`,
      icon: TrendingUp,
      description: 'From approval to disbursed',
      color: 'text-green-600'
    },
    {
      title: 'Stale Applications',
      value: staleLoans.length,
      icon: AlertTriangle,
      description: 'Over 24 hours in queue',
      color: 'text-orange-600'
    },
    {
      title: 'Processing Today',
      value: loans.filter(l => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return l.createdAt >= today;
      }).length,
      icon: Clock,
      description: 'Applications received today',
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
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
    </div>
  );
}
