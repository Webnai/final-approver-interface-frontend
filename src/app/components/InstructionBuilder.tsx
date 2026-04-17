import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, Send } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Priority, User } from '@/app/types/loan';
import { toast } from 'sonner';
import { ApiError, submitLoanInstruction } from '@/app/lib/api';

interface InstructionBuilderProps {
  currentUser: User;
  onSubmitted?: () => void;
}

interface FormData {
  loanId: string;
  beneficiaryName: string;
  accountNumber: string;
  bankCode: string;
  amount: string;
  priority: Priority;
}

export function InstructionBuilder({ currentUser, onSubmitted }: InstructionBuilderProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [checklist, setChecklist] = useState({
    idVerified: false,
    collateralSigned: false,
    sanctionsCheckCleared: false,
    creditScoreVerified: false,
    kycCompleted: false
  });
  
  const [priority, setPriority] = useState<Priority>('Normal');

  const checklistItems = [
    { key: 'idVerified' as const, label: 'ID Verified' },
    { key: 'creditScoreVerified' as const, label: 'Credit Score Verified' },
    { key: 'collateralSigned' as const, label: 'Collateral Documentation Signed' },
    { key: 'kycCompleted' as const, label: 'KYC Completed' },
    { key: 'sanctionsCheckCleared' as const, label: 'Sanctions Check Cleared' }
  ];

  const allChecksPassed = Object.values(checklist).every(v => v);

  const onFormSubmit = async (data: FormData) => {
    if (!allChecksPassed) {
      toast.error('Please complete all eligibility checks before submitting');
      return;
    }

    const loanPayload = {
      loanId: data.loanId,
      beneficiaryName: data.beneficiaryName,
      accountNumber: data.accountNumber,
      bankCode: data.bankCode,
      amount: parseFloat(data.amount),
      priority,
      checklist,
      approverName: currentUser.name,
      approverId: currentUser.id
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitLoanInstruction({
        ...loanPayload,
      });

      reset();
      setChecklist({
        idVerified: false,
        collateralSigned: false,
        sanctionsCheckCleared: false,
        creditScoreVerified: false,
        kycCompleted: false
      });
      setPriority('Normal');
      onSubmitted?.();
      toast.success('Disbursement instruction submitted successfully');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to submit the instruction.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create Disbursement Instruction
            </CardTitle>
            <CardDescription className="mt-2">
              Submit a verified loan package to the disbursement team
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Eligibility Validation Checklist */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Eligibility Validation Checklist</Label>
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              {checklistItems.map(item => (
                <div key={item.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.key}
                    checked={checklist[item.key]}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, [item.key]: checked === true }))
                    }
                  />
                  <label
                    htmlFor={item.key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
            {!allChecksPassed && (
              <p className="text-sm text-orange-600">
                All checks must be completed before submission
              </p>
            )}
          </div>

          {/* Loan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanId">Loan Reference ID *</Label>
              <Input
                id="loanId"
                {...register('loanId', { required: 'Loan ID is required' })}
                placeholder="e.g., LN-2026-00123"
              />
              {errors.loanId && (
                <p className="text-sm text-red-600">{errors.loanId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { required: 'Amount is required', min: 0.01 })}
                placeholder="e.g., 50000.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaryName">Beneficiary Name *</Label>
            <Input
              id="beneficiaryName"
              {...register('beneficiaryName', { required: 'Beneficiary name is required' })}
              placeholder="Full name as per bank account"
            />
            {errors.beneficiaryName && (
              <p className="text-sm text-red-600">{errors.beneficiaryName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                {...register('accountNumber', { required: 'Account number is required' })}
                placeholder="e.g., 1234567890"
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-600">{errors.accountNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankCode">Bank Code / SWIFT *</Label>
              <Input
                id="bankCode"
                {...register('bankCode', { required: 'Bank code is required' })}
                placeholder="e.g., CHASUS33"
              />
              {errors.bankCode && (
                <p className="text-sm text-red-600">{errors.bankCode.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority Tagging</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="High Value">High Value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!allChecksPassed || isSubmitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Send to Disbursement Team'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
