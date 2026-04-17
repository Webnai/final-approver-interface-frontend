import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, FileText, Pause, Send, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Separator } from '@/app/components/ui/separator';
import { LoanRecord, User, Comment } from '@/app/types/loan';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { ApiError, completeLoan, getLoanPackage, getStatusBreadcrumbs, postLoanComment, putLoanOnHold, returnLoanToApprover } from '@/app/lib/api';

interface LoanDetailViewProps {
  loan: LoanRecord;
  currentUser: User;
  onBack: () => void;
  onChanged?: () => void | Promise<void>;
}

export function LoanDetailView({ loan, currentUser, onBack, onChanged }: LoanDetailViewProps) {
  const [detailLoan, setDetailLoan] = useState<LoanRecord>(loan);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; label: string; status: LoanRecord['status']; timestamp: Date; actor?: string; note?: string }>>([]);
  const [transactionRef, setTransactionRef] = useState(loan.transactionReference || '');
  const [commentText, setCommentText] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLoanDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const [packageLoan, statusBreadcrumbs] = await Promise.all([
          getLoanPackage(loan.id),
          getStatusBreadcrumbs(loan.id),
        ]);

        if (!cancelled) {
          setDetailLoan(packageLoan);
          setBreadcrumbs(statusBreadcrumbs);
          setTransactionRef(packageLoan.transactionReference || '');
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this loan.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLoanDetail();

    return () => {
      cancelled = true;
    };
  }, [loan.id]);

  useEffect(() => {
    setTransactionRef(detailLoan.transactionReference || '');
  }, [detailLoan.transactionReference]);

  const refreshDetail = async () => {
    try {
      const packageLoan = await getLoanPackage(loan.id);
      const statusBreadcrumbs = await getStatusBreadcrumbs(loan.id);
      setDetailLoan(packageLoan);
      setBreadcrumbs(statusBreadcrumbs);
      setTransactionRef(packageLoan.transactionReference || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh this loan.');
    }
  };

  const isOwner = detailLoan.assignedOfficerId === currentUser.id;
  const isReadOnly = !isOwner || detailLoan.status === 'Completed';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      message: commentText,
      timestamp: new Date(),
    };

    const addComment = async () => {
      setIsSaving(true);
      try {
        await postLoanComment(detailLoan.id, commentText.trim());
        setDetailLoan((current) => ({
          ...current,
          comments: [...current.comments, newComment],
        }));
        setCommentText('');
        toast.success('Comment added');
        await refreshDetail();
        await onChanged?.();
      } catch (requestError) {
        const message = requestError instanceof ApiError ? requestError.message : 'Unable to add the comment.';
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    };

    void addComment();
  };

  const handleMarkComplete = () => {
    if (!transactionRef.trim()) {
      toast.error('Please enter transaction reference number');
      return;
    }

    const complete = async () => {
      setIsSaving(true);
      try {
        await completeLoan(detailLoan.id, transactionRef.trim());
        setDetailLoan((current) => ({
          ...current,
          status: 'Completed',
          transactionReference: transactionRef.trim(),
          completedAt: new Date(),
        }));
        toast.success('Loan marked as disbursed');
        await refreshDetail();
        await onChanged?.();
        onBack();
      } catch (requestError) {
        const message = requestError instanceof ApiError ? requestError.message : 'Unable to complete this loan.';
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    };

    void complete();
  };

  const handlePutOnHold = () => {
    const hold = async () => {
      setIsSaving(true);
      try {
        await putLoanOnHold(detailLoan.id);
        setDetailLoan((current) => ({
          ...current,
          status: 'On Hold',
        }));
        toast.success('Loan put on hold');
        await refreshDetail();
        await onChanged?.();
      } catch (requestError) {
        const message = requestError instanceof ApiError ? requestError.message : 'Unable to put this loan on hold.';
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    };

    void hold();
  };

  const handleReturnToApprover = () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning');
      return;
    }

    const returnLoan = async () => {
      setIsSaving(true);
      try {
        await returnLoanToApprover(detailLoan.id, returnReason.trim());
        const returnComment: Comment = {
          id: Date.now().toString(),
          userId: currentUser.id,
          userName: currentUser.name,
          message: `🔴 RETURNED TO APPROVER: ${returnReason}`,
          timestamp: new Date(),
          mentionedUser: detailLoan.approverId,
        };

        setDetailLoan((current) => ({
          ...current,
          status: 'Action Required',
          assignedOfficer: undefined,
          assignedOfficerId: undefined,
          comments: [...current.comments, returnComment],
        }));
        toast.success('Loan returned to approver');
        await refreshDetail();
        await onChanged?.();
        onBack();
      } catch (requestError) {
        const message = requestError instanceof ApiError ? requestError.message : 'Unable to return this loan.';
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    };

    void returnLoan();
  };

  const currentLoan = detailLoan;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Queue
        </Button>
        <Badge className={currentLoan.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
          {currentLoan.status}
        </Badge>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Disbursement Package */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Disbursement Package
              </CardTitle>
              <CardDescription>
                Copy data below to execute payment in your banking system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Reference ID</Label>
                  <div className="flex gap-2">
                    <Input value={currentLoan.loanId} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(currentLoan.loanId, 'Loan ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Badge variant="outline" className={
                    currentLoan.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                    currentLoan.priority === 'High Value' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {currentLoan.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beneficiary Name</Label>
                <div className="flex gap-2">
                  <Input value={currentLoan.beneficiaryName} readOnly className="bg-gray-50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(currentLoan.beneficiaryName, 'Beneficiary Name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input value={currentLoan.accountNumber} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(currentLoan.accountNumber, 'Account Number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Code / SWIFT</Label>
                  <div className="flex gap-2">
                    <Input value={currentLoan.bankCode} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(currentLoan.bankCode, 'Bank Code')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`$${currentLoan.amount.toLocaleString()}`} 
                    readOnly 
                    className="bg-yellow-50 font-bold text-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(currentLoan.amount.toString(), 'Amount')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Transaction Reference Number</Label>
                <Input
                  placeholder="Enter reference from payment system (e.g., FT12345678)"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  disabled={isReadOnly}
                  className={isReadOnly ? 'bg-gray-50' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Required to mark disbursement as complete
                </p>
              </div>

              {isOwner && currentLoan.status !== 'Completed' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleMarkComplete}
                    disabled={!transactionRef.trim() || isSaving}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Disbursed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePutOnHold}
                    disabled={isSaving}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Put on Hold
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <XCircle className="mr-2 h-4 w-4" />
                        Return to Approver
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Return to Approver</AlertDialogTitle>
                        <AlertDialogDescription>
                          Provide a reason for returning this loan to the approver
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="e.g., Account number belongs to a closed account"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        rows={3}
                        disabled={isSaving}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReturnReason('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReturnToApprover}>
                          Return to Approver
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eligibility Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Checklist (Verified by Approver)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(currentLoan.checklist).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${value ? 'text-green-600' : 'text-gray-300'}`} />
                    <span className="text-sm">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Comments & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Approved by:</span>
                <p className="font-medium">{currentLoan.approverName}</p>
              </div>
              {currentLoan.assignedOfficer && (
                <div>
                  <span className="text-muted-foreground">Assigned to:</span>
                  <p className="font-medium">{currentLoan.assignedOfficer}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{currentLoan.createdAt.toLocaleString()}</p>
              </div>
              {currentLoan.claimedAt && (
                <div>
                  <span className="text-muted-foreground">Claimed:</span>
                  <p className="font-medium">{currentLoan.claimedAt.toLocaleString()}</p>
                </div>
              )}
              {currentLoan.completedAt && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <p className="font-medium">{currentLoan.completedAt.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Breadcrumbs</CardTitle>
              <CardDescription>Backend workflow milestones for this loan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading status breadcrumbs...</p>
              ) : breadcrumbs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status breadcrumbs available.</p>
              ) : (
                breadcrumbs.map((breadcrumb) => (
                  <div key={breadcrumb.id} className="rounded-lg border bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{breadcrumb.label}</p>
                        <p className="text-xs text-muted-foreground">{breadcrumb.status}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{breadcrumb.timestamp.toLocaleString()}</p>
                    </div>
                    {(breadcrumb.actor || breadcrumb.note) && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {breadcrumb.actor ? `${breadcrumb.actor}${breadcrumb.note ? ' · ' : ''}` : ''}
                        {breadcrumb.note ?? ''}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Thread</CardTitle>
              <CardDescription>Internal comments and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {currentLoan.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                ) : (
                  currentLoan.comments.map(comment => (
                    <div key={comment.id} className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {comment.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>

              {!isReadOnly && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment or @mention the approver..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleAddComment()}
                    disabled={!commentText.trim() || isSaving}
                    className="w-full"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Add Comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
