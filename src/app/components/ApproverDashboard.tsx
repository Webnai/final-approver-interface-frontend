import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { LoanRecord, User } from '@/app/types/loan';
import { InstructionBuilder } from './InstructionBuilder';
import { LoanDetailView } from './LoanDetailView';
import { fetchLoanQueue } from '@/app/lib/api';

interface ApproverDashboardProps {
  currentUser: User;
}

export function ApproverDashboard({ currentUser }: ApproverDashboardProps) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [actionRequired, setActionRequired] = useState<LoanRecord[]>([]);
  const [inProgress, setInProgress] = useState<LoanRecord[]>([]);
  const [completed, setCompleted] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLoans = async () => {
    setLoading(true);
    setError(null);

    try {
      const [actionRequiredLoans, inProgressLoans, onHoldLoans, completedLoans] = await Promise.all([
        fetchLoanQueue('action-required'),
        fetchLoanQueue('in-progress'),
        fetchLoanQueue('on-hold'),
        fetchLoanQueue('completed'),
      ]);

      setActionRequired(actionRequiredLoans);
      setInProgress([...inProgressLoans, ...onHoldLoans].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()));
      setCompleted(completedLoans);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load the approval queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadLoans = async () => {
      try {
        setLoading(true);
        setError(null);

        const [actionRequiredLoans, inProgressLoans, onHoldLoans, completedLoans] = await Promise.all([
          fetchLoanQueue('action-required'),
          fetchLoanQueue('in-progress'),
          fetchLoanQueue('on-hold'),
          fetchLoanQueue('completed'),
        ]);

        if (!cancelled) {
          setActionRequired(actionRequiredLoans);
          setInProgress([...inProgressLoans, ...onHoldLoans].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()));
          setCompleted(completedLoans);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load the approval queue.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLoans();

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  const getStatusIcon = (status: LoanRecord['status']) => {
    switch (status) {
      case 'Action Required':
        return <AlertCircle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LoanRecord['status']) => {
    switch (status) {
      case 'Action Required':
        return 'bg-red-100 text-red-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedLoan) {
    return (
      <LoanDetailView
        loan={selectedLoan}
        currentUser={currentUser}
        onBack={() => setSelectedLoan(null)}
        onChanged={async () => {
          setSelectedLoan(null);
          await refreshLoans();
        }}
      />
    );
  }

  const LoanTable = ({ loans }: { loans: LoanRecord[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan ID</TableHead>
            <TableHead>Beneficiary</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No loans found
              </TableCell>
            </TableRow>
          ) : (
            loans.map(loan => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.loanId}</TableCell>
                <TableCell>{loan.beneficiaryName}</TableCell>
                <TableCell className="font-semibold">
                  ${loan.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(loan.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(loan.status)}
                      {loan.status}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>
                  {loan.assignedOfficer || (
                    <span className="text-muted-foreground text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {loan.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLoan(loan)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="new" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="new">New Instruction</TabsTrigger>
          <TabsTrigger value="tracking">
            Tracking
            {actionRequired.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {actionRequired.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <InstructionBuilder currentUser={currentUser} onSubmitted={() => void refreshLoans()} />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {error && !loading && actionRequired.length === 0 && inProgress.length === 0 && completed.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
            </Card>
          ) : null}

          {actionRequired.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Action Required ({actionRequired.length})
                </CardTitle>
                <CardDescription>
                  These loans have been returned and require your attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoanTable loans={actionRequired} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>In Progress ({inProgress.length})</CardTitle>
              <CardDescription>
                Loans currently being processed by disbursement team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanTable loans={inProgress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Completed Disbursements ({completed.length})</CardTitle>
              <CardDescription>
                Successfully disbursed loans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanTable loans={completed} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && actionRequired.length === 0 && inProgress.length === 0 && completed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading approval queue...</p>
      ) : null}
    </div>
  );
}
