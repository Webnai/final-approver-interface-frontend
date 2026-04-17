import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { SupervisorCapacityData, fetchSupervisorCapacity } from '@/app/lib/api';
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

export function SupervisorView() {
  const [capacity, setCapacity] = useState<SupervisorCapacityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCapacity = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchSupervisorCapacity();
        if (!cancelled) {
          setCapacity(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load supervisor capacity.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCapacity();

    return () => {
      cancelled = true;
    };
  }, []);

  const officerWorkload = capacity?.officers ?? [];
  const maxLoans = Math.max(...officerWorkload.map((officer) => officer.activeLoans), 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacity?.totalPending ?? 0}</div>
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
            <div className="text-2xl font-bold">{capacity?.unassigned ?? 0}</div>
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
            <div className="text-2xl font-bold">{capacity?.activeOfficers ?? officerWorkload.length}</div>
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
            <div className="text-2xl font-bold">{(capacity?.averageProcessingHours ?? 0).toFixed(1)}h</div>
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
          {error && !loading && !capacity ? (
            <p className="text-center text-muted-foreground py-8">{error}</p>
          ) : officerWorkload.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {loading ? 'Loading capacity data...' : 'No active assignments'}
            </p>
          ) : (
            <div className="space-y-6">
              {officerWorkload.map((officer) => (
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
                        Avg age: {officer.averageAgeHours.toFixed(1)}h
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
                  {officer.isStale && (
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
                0
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium">Processing Rate</p>
                <p className="text-sm text-muted-foreground">Completion percentage</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                0%
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium">Value Processed</p>
                <p className="text-sm text-muted-foreground">Successfully disbursed</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                ${(0).toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
