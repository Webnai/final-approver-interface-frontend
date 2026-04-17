import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy, ExternalLink, Hand, Lock, MessageSquare, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { LoanRecord, User } from '@/app/types/loan';
import { toast } from 'sonner';
import { LoanDetailView } from './LoanDetailView';

interface WorkQueueProps {
  loans: LoanRecord[];
  currentUser: User;
  onClaimLoan: (loanId: string) => void;
  onUpdateLoan: (loan: LoanRecord) => void;
}

export function WorkQueue({ loans, currentUser, onClaimLoan, onUpdateLoan }: WorkQueueProps) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'mine'>('all');

  const filteredLoans = loans.filter(loan => {
    if (loan.status === 'Completed') return false;
    
    if (filter === 'unassigned') {
      return loan.status === 'Unassigned';
    } else if (filter === 'mine') {
      return loan.assignedOfficerId === currentUser.id;
    }
    return true;
  });

  const handleClaim = (loan: LoanRecord) => {
    onClaimLoan(loan.id);
    toast.success(`Claimed loan ${loan.loanId}`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusIcon = (status: LoanRecord['status']) => {
    switch (status) {
      case 'Unassigned':
        return <Clock className="h-4 w-4" />;
      case 'In Progress':
        return <ExternalLink className="h-4 w-4" />;
      case 'On Hold':
        return <AlertCircle className="h-4 w-4" />;
      case 'Action Required':
        return <XCircle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LoanRecord['status']) => {
    switch (status) {
      case 'Unassigned':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'Action Required':
        return 'bg-red-100 text-red-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityColor = (priority: LoanRecord['priority']) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High Value':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (selectedLoan) {
    return (
      <LoanDetailView
        loan={selectedLoan}
        currentUser={currentUser}
        onBack={() => setSelectedLoan(null)}
        onUpdate={onUpdateLoan}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Disbursement Work Queue</CardTitle>
            <CardDescription className="mt-2">
              Claim and process loan disbursements
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({loans.filter(l => l.status !== 'Completed').length})
            </Button>
            <Button
              variant={filter === 'unassigned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unassigned')}
            >
              Unassigned ({loans.filter(l => l.status === 'Unassigned').length})
            </Button>
            <Button
              variant={filter === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('mine')}
            >
              My Tasks ({loans.filter(l => l.assignedOfficerId === currentUser.id && l.status !== 'Completed').length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No loans in queue
                  </TableCell>
                </TableRow>
              ) : (
                filteredLoans.map(loan => {
                  const hoursSinceCreation = (Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60);
                  const isStale = hoursSinceCreation > 24;
                  const canClaim = loan.status === 'Unassigned';
                  const isOwner = loan.assignedOfficerId === currentUser.id;
                  
                  return (
                    <TableRow 
                      key={loan.id}
                      className={isStale ? 'bg-orange-50' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {loan.loanId}
                          {loan.comments.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {loan.comments.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{loan.beneficiaryName}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          ${loan.amount.toLocaleString()}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(loan.amount.toString(), 'Amount')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(loan.priority)}>
                          {loan.priority}
                        </Badge>
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
                        {loan.assignedOfficer ? (
                          <div className="flex items-center gap-2">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            {loan.assignedOfficer}
                            {isOwner && <span className="text-xs text-blue-600">(You)</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={isStale ? 'text-orange-600 font-semibold' : ''}>
                          {hoursSinceCreation < 1 
                            ? `${Math.floor(hoursSinceCreation * 60)}m`
                            : `${Math.floor(hoursSinceCreation)}h`}
                        </span>
                        {isStale && (
                          <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800">
                            Stale
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canClaim && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleClaim(loan)}
                            >
                              <Hand className="mr-2 h-4 w-4" />
                              Claim
                            </Button>
                          )}
                          {isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              Process
                            </Button>
                          )}
                          {!canClaim && !isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
