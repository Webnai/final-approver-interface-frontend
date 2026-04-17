import { useState, useEffect } from 'react';
import { Building2, UserCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Toaster } from '@/app/components/ui/sonner';
import { LoanRecord, User } from '@/app/types/loan';
import { DashboardMetrics } from '@/app/components/DashboardMetrics';
import { ApproverDashboard } from '@/app/components/ApproverDashboard';
import { WorkQueue } from '@/app/components/WorkQueue';
import { SupervisorView } from '@/app/components/SupervisorView';

// Mock users
const MOCK_USERS: User[] = [
  { id: '1', name: 'Sarah Johnson', role: 'Final Approver' },
  { id: '2', name: 'Michael Chen', role: 'Final Approver' },
  { id: '3', name: 'Emily Davis', role: 'Disbursement Officer' },
  { id: '4', name: 'James Wilson', role: 'Disbursement Officer' },
  { id: '5', name: 'Lisa Anderson', role: 'Disbursement Officer' },
  { id: '6', name: 'Robert Martinez', role: 'Supervisor' }
];

// Generate some sample data
const generateSampleLoans = (): LoanRecord[] => {
  const now = Date.now();
  return [
    {
      id: '1',
      loanId: 'LN-2026-00145',
      beneficiaryName: 'Anderson Manufacturing LLC',
      accountNumber: '9876543210',
      bankCode: 'CHASUS33',
      amount: 250000,
      status: 'Unassigned',
      priority: 'High Value',
      checklist: {
        idVerified: true,
        collateralSigned: true,
        sanctionsCheckCleared: true,
        creditScoreVerified: true,
        kycCompleted: true
      },
      approverName: 'Sarah Johnson',
      approverId: '1',
      createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
      comments: []
    },
    {
      id: '2',
      loanId: 'LN-2026-00146',
      beneficiaryName: 'TechStart Innovations Inc',
      accountNumber: '1234567890',
      bankCode: 'BOFAUS3N',
      amount: 75000,
      status: 'In Progress',
      priority: 'Normal',
      checklist: {
        idVerified: true,
        collateralSigned: true,
        sanctionsCheckCleared: true,
        creditScoreVerified: true,
        kycCompleted: true
      },
      approverName: 'Michael Chen',
      approverId: '2',
      assignedOfficer: 'Emily Davis',
      assignedOfficerId: '3',
      createdAt: new Date(now - 5 * 60 * 60 * 1000), // 5 hours ago
      claimedAt: new Date(now - 4 * 60 * 60 * 1000),
      comments: [
        {
          id: 'c1',
          userId: '3',
          userName: 'Emily Davis',
          message: 'Processing payment now - all details verified',
          timestamp: new Date(now - 3.5 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: '3',
      loanId: 'LN-2026-00147',
      beneficiaryName: 'Green Energy Solutions',
      accountNumber: '5555666677',
      bankCode: 'WELLSFARGO',
      amount: 150000,
      status: 'Unassigned',
      priority: 'Urgent',
      checklist: {
        idVerified: true,
        collateralSigned: true,
        sanctionsCheckCleared: true,
        creditScoreVerified: true,
        kycCompleted: true
      },
      approverName: 'Sarah Johnson',
      approverId: '1',
      createdAt: new Date(now - 30 * 60 * 60 * 1000), // 30 minutes ago
      comments: []
    },
    {
      id: '4',
      loanId: 'LN-2026-00148',
      beneficiaryName: 'Metro Construction Group',
      accountNumber: '9998887776',
      bankCode: 'CITIUS33',
      amount: 320000,
      status: 'Completed',
      priority: 'High Value',
      checklist: {
        idVerified: true,
        collateralSigned: true,
        sanctionsCheckCleared: true,
        creditScoreVerified: true,
        kycCompleted: true
      },
      approverName: 'Michael Chen',
      approverId: '2',
      assignedOfficer: 'James Wilson',
      assignedOfficerId: '4',
      createdAt: new Date(now - 26 * 60 * 60 * 1000), // 26 hours ago (stale)
      claimedAt: new Date(now - 25 * 60 * 60 * 1000),
      completedAt: new Date(now - 1 * 60 * 60 * 1000),
      transactionReference: 'FT20260121001',
      comments: []
    },
    {
      id: '5',
      loanId: 'LN-2026-00149',
      beneficiaryName: 'Downtown Retail Partners',
      accountNumber: '4444333322',
      bankCode: 'JPMORGAN',
      amount: 95000,
      status: 'On Hold',
      priority: 'Normal',
      checklist: {
        idVerified: true,
        collateralSigned: true,
        sanctionsCheckCleared: true,
        creditScoreVerified: true,
        kycCompleted: true
      },
      approverName: 'Sarah Johnson',
      approverId: '1',
      assignedOfficer: 'Lisa Anderson',
      assignedOfficerId: '5',
      createdAt: new Date(now - 27 * 60 * 60 * 1000), // 27 hours ago (stale)
      claimedAt: new Date(now - 26 * 60 * 60 * 1000),
      comments: [
        {
          id: 'c2',
          userId: '5',
          userName: 'Lisa Anderson',
          message: 'Waiting for client confirmation on account details',
          timestamp: new Date(now - 24 * 60 * 60 * 1000)
        }
      ]
    }
  ];
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);

  // Load loans from localStorage or use sample data
  useEffect(() => {
    const stored = localStorage.getItem('loan-disbursement-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      const loansWithDates = parsed.map((loan: any) => ({
        ...loan,
        createdAt: new Date(loan.createdAt),
        claimedAt: loan.claimedAt ? new Date(loan.claimedAt) : undefined,
        completedAt: loan.completedAt ? new Date(loan.completedAt) : undefined,
        comments: loan.comments.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        }))
      }));
      setLoans(loansWithDates);
    } else {
      setLoans(generateSampleLoans());
    }
  }, []);

  // Save loans to localStorage whenever they change
  useEffect(() => {
    if (loans.length > 0) {
      localStorage.setItem('loan-disbursement-data', JSON.stringify(loans));
    }
  }, [loans]);

  const handleSubmitLoan = (loanData: Omit<LoanRecord, 'id' | 'status' | 'createdAt' | 'comments'>) => {
    const newLoan: LoanRecord = {
      ...loanData,
      id: Date.now().toString(),
      status: 'Unassigned',
      createdAt: new Date(),
      comments: []
    };
    setLoans(prev => [newLoan, ...prev]);
  };

  const handleClaimLoan = (loanId: string) => {
    setLoans(prev =>
      prev.map(loan =>
        loan.id === loanId
          ? {
              ...loan,
              status: 'In Progress',
              assignedOfficer: currentUser.name,
              assignedOfficerId: currentUser.id,
              claimedAt: new Date()
            }
          : loan
      )
    );
  };

  const handleUpdateLoan = (updatedLoan: LoanRecord) => {
    setLoans(prev =>
      prev.map(loan => (loan.id === updatedLoan.id ? updatedLoan : loan))
    );
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data to sample loans?')) {
      const sampleLoans = generateSampleLoans();
      setLoans(sampleLoans);
      localStorage.setItem('loan-disbursement-data', JSON.stringify(sampleLoans));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Loan Disbursement System</h1>
                <p className="text-sm text-muted-foreground">
                  Streamlined workflow management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetData}
              >
                Reset to Sample Data
              </Button>
              <Card className="w-[300px]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-10 w-10 text-blue-600" />
                    <div className="flex-1">
                      <Select
                        value={currentUser.id}
                        onValueChange={(id) => {
                          const user = MOCK_USERS.find(u => u.id === id);
                          if (user) setCurrentUser(user);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_USERS.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} - {user.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Dashboard Metrics - Always visible */}
          <DashboardMetrics loans={loans} />

          {/* Role-specific content */}
          {currentUser.role === 'Final Approver' && (
            <ApproverDashboard
              loans={loans}
              currentUser={currentUser}
              onSubmitLoan={handleSubmitLoan}
              onUpdateLoan={handleUpdateLoan}
            />
          )}

          {currentUser.role === 'Disbursement Officer' && (
            <WorkQueue
              loans={loans}
              currentUser={currentUser}
              onClaimLoan={handleClaimLoan}
              onUpdateLoan={handleUpdateLoan}
            />
          )}

          {currentUser.role === 'Supervisor' && (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Officer Overview</TabsTrigger>
                <TabsTrigger value="queue">Full Queue</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <SupervisorView loans={loans} />
              </TabsContent>

              <TabsContent value="queue">
                <WorkQueue
                  loans={loans}
                  currentUser={currentUser}
                  onClaimLoan={handleClaimLoan}
                  onUpdateLoan={handleUpdateLoan}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}