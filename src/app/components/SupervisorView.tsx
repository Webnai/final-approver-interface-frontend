import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { LoanRecord } from '@/app/types/loan';
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface SupervisorViewProps {
  loans: LoanRecord[];
}

export function SupervisorView({ loans }: SupervisorViewProps) {
  // Get unique officers and their workload
  const officerWorkload = loans
    .filter(l => l.assignedOfficerId && l.status !== 'Completed')
    .reduce((acc, loan) => {
      const officer = loan.assignedOfficer!;
      if (!acc[officer]) {
        acc[officer] = {
          name: officer,
          activeLoans: 0,
          totalValue: 0,
          avgAge: 0,
          ages: []
        };
      }
      acc[officer].activeLoans++;
      acc[officer].totalValue += loan.amount;
      const age = (Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60);
      acc[officer].ages.push(age);
      return acc;
    }, {} as Record<string, { name: string; activeLoans: number; totalValue: number; avgAge: number; ages: number[] }>);

  // Calculate average ages
  Object.values(officerWorkload).forEach(officer => {
    officer.avgAge = officer.ages.reduce((sum, age) => sum + age, 0) / officer.ages.length;
  });

  const maxLoans = Math.max(...Object.values(officerWorkload).map(o => o.activeLoans), 5);

  // Overall statistics
  const totalPending = loans.filter(l => l.status !== 'Completed').length;
  const totalUnassigned = loans.filter(l => l.status === 'Unassigned').length;
  const avgProcessingTime = loans.filter(l => l.completedAt && l.claimedAt).reduce((sum, loan) => {
    const time = (loan.completedAt!.getTime() - loan.claimedAt!.getTime()) / (1000 * 60 * 60);
    return sum + time;
  }, 0) / Math.max(loans.filter(l => l.completedAt && l.claimedAt).length, 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Across all officers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnassigned}</div>
            <p className="text-xs text-muted-foreground">
              Waiting to be claimed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Officers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(officerWorkload).length}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Claim to completion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Officer Capacity Overview</CardTitle>
          <CardDescription>
            Current workload distribution across disbursement officers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(officerWorkload).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active assignments
            </p>
          ) : (
            <div className="space-y-6">
              {Object.values(officerWorkload).map(officer => (
                <div key={officer.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700">
                          {officer.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{officer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {officer.activeLoans} active loan{officer.activeLoans !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${officer.totalValue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg age: {officer.avgAge.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Workload</span>
                      <span>{officer.activeLoans} / {maxLoans}</span>
                    </div>
                    <Progress value={(officer.activeLoans / maxLoans) * 100} />
                  </div>
                  {officer.avgAge > 24 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Has stale applications
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Total Completed Today</p>
                <p className="text-sm text-muted-foreground">Disbursements finalized</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                {loans.filter(l => {
                  if (!l.completedAt) return false;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return l.completedAt >= today;
                }).length}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium">Processing Rate</p>
                <p className="text-sm text-muted-foreground">Completion percentage</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                {loans.length > 0 
                  ? ((loans.filter(l => l.status === 'Completed').length / loans.length) * 100).toFixed(0)
                  : 0}%
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium">Value Processed</p>
                <p className="text-sm text-muted-foreground">Successfully disbursed</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                ${loans
                  .filter(l => l.status === 'Completed')
                  .reduce((sum, l) => sum + l.amount, 0)
                  .toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
