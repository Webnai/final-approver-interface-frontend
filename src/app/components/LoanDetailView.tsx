import { useState } from 'react';
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

interface LoanDetailViewProps {
  loan: LoanRecord;
  currentUser: User;
  onBack: () => void;
  onUpdate: (loan: LoanRecord) => void;
}

export function LoanDetailView({ loan, currentUser, onBack, onUpdate }: LoanDetailViewProps) {
  const [transactionRef, setTransactionRef] = useState(loan.transactionReference || '');
  const [commentText, setCommentText] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const isOwner = loan.assignedOfficerId === currentUser.id;
  const isReadOnly = !isOwner || loan.status === 'Completed';

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
      timestamp: new Date()
    };

    const updatedLoan = {
      ...loan,
      comments: [...loan.comments, newComment]
    };

    onUpdate(updatedLoan);
    setCommentText('');
    toast.success('Comment added');
  };

  const handleMarkComplete = () => {
    if (!transactionRef.trim()) {
      toast.error('Please enter transaction reference number');
      return;
    }

    const updatedLoan: LoanRecord = {
      ...loan,
      status: 'Completed',
      transactionReference: transactionRef,
      completedAt: new Date()
    };

    onUpdate(updatedLoan);
    toast.success('Loan marked as disbursed');
    onBack();
  };

  const handlePutOnHold = () => {
    const updatedLoan: LoanRecord = {
      ...loan,
      status: 'On Hold'
    };

    onUpdate(updatedLoan);
    toast.success('Loan put on hold');
  };

  const handleReturnToApprover = () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning');
      return;
    }

    const returnComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      message: `🔴 RETURNED TO APPROVER: ${returnReason}`,
      timestamp: new Date(),
      mentionedUser: loan.approverId
    };

    const updatedLoan: LoanRecord = {
      ...loan,
      status: 'Action Required',
      assignedOfficer: undefined,
      assignedOfficerId: undefined,
      comments: [...loan.comments, returnComment]
    };

    onUpdate(updatedLoan);
    toast.success('Loan returned to approver');
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Queue
        </Button>
        <Badge className={loan.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
          {loan.status}
        </Badge>
      </div>

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
                    <Input value={loan.loanId} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(loan.loanId, 'Loan ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Badge variant="outline" className={
                    loan.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                    loan.priority === 'High Value' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {loan.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beneficiary Name</Label>
                <div className="flex gap-2">
                  <Input value={loan.beneficiaryName} readOnly className="bg-gray-50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(loan.beneficiaryName, 'Beneficiary Name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input value={loan.accountNumber} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(loan.accountNumber, 'Account Number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Code / SWIFT</Label>
                  <div className="flex gap-2">
                    <Input value={loan.bankCode} readOnly className="bg-gray-50" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(loan.bankCode, 'Bank Code')}
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
                    value={`$${loan.amount.toLocaleString()}`} 
                    readOnly 
                    className="bg-yellow-50 font-bold text-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(loan.amount.toString(), 'Amount')}
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

              {isOwner && loan.status !== 'Completed' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleMarkComplete}
                    disabled={!transactionRef.trim()}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Disbursed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePutOnHold}
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
                {Object.entries(loan.checklist).map(([key, value]) => (
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
                <p className="font-medium">{loan.approverName}</p>
              </div>
              {loan.assignedOfficer && (
                <div>
                  <span className="text-muted-foreground">Assigned to:</span>
                  <p className="font-medium">{loan.assignedOfficer}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{loan.createdAt.toLocaleString()}</p>
              </div>
              {loan.claimedAt && (
                <div>
                  <span className="text-muted-foreground">Claimed:</span>
                  <p className="font-medium">{loan.claimedAt.toLocaleString()}</p>
                </div>
              )}
              {loan.completedAt && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <p className="font-medium">{loan.completedAt.toLocaleString()}</p>
                </div>
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
                {loan.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                ) : (
                  loan.comments.map(comment => (
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
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
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
