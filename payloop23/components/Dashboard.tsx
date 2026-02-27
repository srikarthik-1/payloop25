
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Customer, TransactionHistory, Tier, TierSettings, Admin, TierThreshold, DiscountSettings, DeadlineSettings, LastTransactionDetails, SmsLog } from '../types';
import { FaBars, FaChartLine, FaPlus, FaSearch, FaUsers, FaChartPie, FaPowerOff, FaWallet, FaCoins, FaShoppingBag, FaDownload, FaCog, FaPercent, FaCommentDots, FaHistory } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Tier utility functions
export const getTierBySpend = (customer: Customer, settings: TierSettings): Tier => {
    if (customer.totalSpent >= settings.platinum.minSpend) return 'Platinum';
    if (customer.totalSpent >= settings.gold.minSpend) return 'Gold';
    if (customer.totalSpent >= settings.silver.minSpend) return 'Silver';
    return 'Bronze';
};

export const getTierByPoints = (customer: Customer, settings: TierSettings): Tier => {
    if (customer.points >= settings.platinum.minPoints) return 'Platinum';
    if (customer.points >= settings.gold.minPoints) return 'Gold';
    if (customer.points >= settings.silver.minPoints) return 'Silver';
    return 'Bronze';
};

export const getCustomerTier = (customer: Customer, settings: TierSettings): Tier => {
    if (customer.totalSpent >= settings.platinum.minSpend || customer.points >= settings.platinum.minPoints) return 'Platinum';
    if (customer.totalSpent >= settings.gold.minSpend || customer.points >= settings.gold.minPoints) return 'Gold';
    if (customer.totalSpent >= settings.silver.minSpend || customer.points >= settings.silver.minPoints) return 'Silver';
    return 'Bronze';
};

const TIER_COLORS: Record<Tier, string> = {
    Bronze: 'bg-yellow-800 text-yellow-100',
    Silver: 'bg-gray-400 text-black',
    Gold: 'bg-yellow-400 text-black',
    Platinum: 'bg-purple-300 text-purple-900',
};

enum Section {
    Overview = 'overview',
    Transaction = 'transaction',
    Search = 'search',
    Customers = 'customers',
    Analytics = 'analytics',
    SmsLogs = 'sms-logs',
    Settings = 'settings',
}

interface DashboardProps {
    currentUser: Admin | null;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    tierSettings: TierSettings;
    setTierSettings: React.Dispatch<React.SetStateAction<TierSettings>>;
    discountSettings: DiscountSettings;
    setDiscountSettings: React.Dispatch<React.SetStateAction<DiscountSettings>>;
    deadlineSettings: DeadlineSettings;
    setDeadlineSettings: React.Dispatch<React.SetStateAction<DeadlineSettings>>;
    smsLogs: SmsLog[];
    setSmsLogs: React.Dispatch<React.SetStateAction<SmsLog[]>>;
    handleLogout: () => void;
}

// Reusable Card Component
const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-brand-card border border-brand-border p-6 md:p-8 transition-colors hover:border-gray-400 ${className}`}>
        {children}
    </div>
);

// Reusable Stat Card Component
const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <Card>
        <span className="block text-xs text-brand-muted uppercase mb-2">{label}</span>
        <div className="text-4xl font-serif text-brand-accent">{value}</div>
    </Card>
);

// Helper to export CSV
const exportDataToCsv = (customers: Customer[]) => {
    let csv = "Name,Mobile,TotalSpent,Points\n";
    customers.forEach(c => {
        csv += `${c.name},${c.mobile},${c.totalSpent},${c.points}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loyalty_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

// Helper to check discount eligibility
const checkDiscountEligibility = (customer: Customer, deadlineSettings: DeadlineSettings, tierSettings: TierSettings): { eligible: boolean; daysSinceLastTxn: number | null; deadline: number | null; pointsTier: Tier | null } => {
    if (!customer.history || customer.history.length === 0) {
        return { eligible: true, daysSinceLastTxn: null, deadline: null, pointsTier: null };
    }

    const lastTransaction = customer.history.reduce((latest, tx) => new Date(tx.date) > new Date(latest.date) ? tx : latest);
    const lastTxnDate = new Date(lastTransaction.date);
    const today = new Date();
    const daysSinceLastTxn = Math.floor((today.getTime() - lastTxnDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const pointsTier = getTierByPoints(customer, tierSettings);
    const deadline = deadlineSettings[pointsTier.toLowerCase() as keyof DeadlineSettings];

    const eligible = daysSinceLastTxn <= deadline;

    return { eligible, daysSinceLastTxn, deadline, pointsTier };
};


const Dashboard: React.FC<DashboardProps> = ({ currentUser, customers, setCustomers, tierSettings, setTierSettings, discountSettings, setDiscountSettings, deadlineSettings, setDeadlineSettings, smsLogs, setSmsLogs, handleLogout }) => {
    const [activeSection, setActiveSection] = useState<Section>(Section.Overview);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    const [activeContentKey, setActiveContentKey] = useState(0);

    const handleNavClick = (section: Section) => {
        setActiveSection(section);
        setActiveContentKey(prev => prev + 1);
    };
    
    const dashboardStats = useMemo(() => {
        const totalCustomers = customers.length;
        const totalRevenue = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
        const totalPoints = customers.reduce((acc, c) => acc + (c.points || 0), 0);
        return { totalCustomers, totalRevenue, totalPoints };
    }, [customers]);

    const renderSection = () => {
        switch (activeSection) {
            case Section.Transaction:
                return <TransactionSection currentUser={currentUser} customers={customers} setCustomers={setCustomers} tierSettings={tierSettings} discountSettings={discountSettings} deadlineSettings={deadlineSettings} setSmsLogs={setSmsLogs} />;
            case Section.Search:
                return <SearchSection customers={customers} tierSettings={tierSettings}/>;
            case Section.Customers:
                return <CustomersSection customers={customers} tierSettings={tierSettings}/>;
            case Section.Analytics:
                return <AnalyticsSection customers={customers} tierSettings={tierSettings}/>;
            case Section.SmsLogs:
                return <SmsLogsSection smsLogs={smsLogs} />;
            case Section.Settings:
                return <SettingsSection tierSettings={tierSettings} setTierSettings={setTierSettings} discountSettings={discountSettings} setDiscountSettings={setDiscountSettings} deadlineSettings={deadlineSettings} setDeadlineSettings={setDeadlineSettings} />;
            case Section.Overview:
            default:
                return <OverviewSection stats={dashboardStats} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="h-[60px] bg-brand-card/80 backdrop-blur-lg border-b border-brand-border flex justify-between items-center px-5 fixed top-0 left-0 w-full z-50">
                <div className="flex items-center gap-5">
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-brand-text text-lg p-1">
                        <FaBars />
                    </button>
                    <div className="font-serif text-lg tracking-wider text-brand-accent">Pay Loop</div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="border border-brand-border py-1 px-4 rounded-full text-xs tracking-widest hidden sm:block">
                        {currentUser?.businessName || 'Admin'}
                    </div>
                    <button onClick={handleLogout} className="bg-brand-card text-brand-text border border-brand-border text-xs py-1.5 px-4 rounded-md flex items-center gap-2 hover:bg-gray-100 transition-colors">
                        <FaPowerOff />
                        <span className="hidden md:inline">Exit</span>
                    </button>
                </div>
            </header>

            <div className="flex pt-[60px] flex-1">
                <aside className={`bg-brand-card border-r border-brand-border h-[calc(100vh-60px)] fixed top-[60px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 ${isSidebarCollapsed ? 'w-[60px]' : 'w-[240px]'}`}>
                    <nav className="mt-4">
                        {(Object.values(Section)).map(section => {
                            if (section === Section.Settings && !currentUser) {
                                return null;
                            }
                            return (
                                <NavItem
                                    key={section}
                                    section={section}
                                    activeSection={activeSection}
                                    isCollapsed={isSidebarCollapsed}
                                    onClick={handleNavClick}
                                />
                            )
                        })}
                    </nav>
                </aside>

                <main className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] p-4 sm:p-6 md:p-10 ${isSidebarCollapsed ? 'ml-[60px]' : 'ml-[240px]'}`}>
                    <div key={activeContentKey} className="animate-fade-slide-up" style={{ animationDuration: '0.6s' }}>
                        {renderSection()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const navIcons: { [key in Section]: React.ElementType } = {
    [Section.Overview]: FaChartLine,
    [Section.Transaction]: FaPlus,
    [Section.Search]: FaSearch,
    [Section.Customers]: FaUsers,
    [Section.Analytics]: FaChartPie,
    [Section.SmsLogs]: FaHistory,
    [Section.Settings]: FaCog,
};

const NavItem: React.FC<{ section: Section, activeSection: Section, isCollapsed: boolean, onClick: (s: Section) => void }> = ({ section, activeSection, isCollapsed, onClick }) => {
    const Icon = navIcons[section];
    const isActive = section === activeSection;

    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(section); }}
            className={`flex items-center h-16 text-brand-muted hover:text-brand-accent hover:bg-gray-100 transition-all border-l-2 ${isActive ? 'border-brand-accent text-brand-accent bg-gray-100' : 'border-transparent'}`}
        >
            <div className="w-[60px] flex justify-center items-center text-lg"><Icon /></div>
            <span className={`capitalize whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{section.replace('-', ' ')}</span>
        </a>
    );
};

const PageTitle: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <h1 className={`font-serif text-3xl md:text-4xl mb-8 pb-5 border-b border-brand-border text-brand-accent ${className}`}>{children}</h1>
);


const OverviewSection: React.FC<{ stats: { totalCustomers: number; totalRevenue: number; totalPoints: number; } }> = ({ stats }) => (
    <section>
        <PageTitle>System Overview</PageTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard label="Total Users" value={stats.totalCustomers.toLocaleString()} />
            <StatCard label="Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Active Points" value={stats.totalPoints.toLocaleString()} />
        </div>
    </section>
);


const TransactionSection: React.FC<{ currentUser: Admin | null, customers: Customer[], setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>, tierSettings: TierSettings, discountSettings: DiscountSettings, deadlineSettings: DeadlineSettings, setSmsLogs: React.Dispatch<React.SetStateAction<SmsLog[]>> }> = ({ currentUser, customers, setCustomers, tierSettings, discountSettings, deadlineSettings, setSmsLogs }) => {
    const [mobile, setMobile] = useState('');
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [cashGiven, setCashGiven] = useState('');
    
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    
    const [showPinSection, setShowPinSection] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(true);
    const [canUsePoints, setCanUsePoints] = useState(false);
    const [usePointsAndDiscount, setUsePointsAndDiscount] = useState(false);
    
    const [pinStatus, setPinStatus] = useState('');
    const [pinError, setPinError] = useState('');
    const [eligibility, setEligibility] = useState<{ eligible: boolean; daysSinceLastTxn: number | null; deadline: number | null; pointsTier: Tier | null }>({ eligible: true, daysSinceLastTxn: null, deadline: null, pointsTier: null });

    const [lastTransactionDetails, setLastTransactionDetails] = useState<LastTransactionDetails | null>(null);
    type SmsStatus = 'idle' | 'sending' | 'sent' | 'failed';
    const [smsStatus, setSmsStatus] = useState<SmsStatus>('idle');

    const custNameRef = useRef<HTMLInputElement>(null);

    const resetForm = useCallback(() => {
        setMobile('');
        setName('');
        setPin('');
        setBillAmount('');
        setCashGiven('');
        setCurrentCustomer(null);
        setIsNewCustomer(false);
        setShowPinSection(false);
        setShowTransactionForm(true);
        setPinStatus('');
        setPinError('');
        setCanUsePoints(false);
        setUsePointsAndDiscount(false);
        setEligibility({ eligible: true, daysSinceLastTxn: null, deadline: null, pointsTier: null });
        setLastTransactionDetails(null);
        setSmsStatus('idle');
    }, []);
    
    useEffect(() => {
        setCanUsePoints(false);
        setUsePointsAndDiscount(false);
        if(mobile.length >= 10) {
            if(lastTransactionDetails) return; // Don't search while confirmation is shown
            const existingCustomer = customers.find(c => c.mobile === mobile);
            setCurrentCustomer(existingCustomer || null);
            setShowPinSection(true);
            setShowTransactionForm(false); // Hide until PIN verified
            if (existingCustomer) {
                setName(existingCustomer.name);
                setIsNewCustomer(false);
                setPinStatus("Existing User Verification");
                setEligibility(checkDiscountEligibility(existingCustomer, deadlineSettings, tierSettings));
                if (existingCustomer.points > 0) {
                    setCanUsePoints(true);
                }
            } else {
                setName('');
                setIsNewCustomer(true);
                setPinStatus("Set New User PIN");
                setEligibility({ eligible: true, daysSinceLastTxn: null, deadline: null, pointsTier: null });
                custNameRef.current?.focus();
            }
        } else {
            setShowPinSection(false);
            setCurrentCustomer(null);
            setName('');
        }
    }, [mobile, customers, deadlineSettings, tierSettings, lastTransactionDetails]);

    const handlePinVerify = () => {
        setPinError('');
        if (isNewCustomer) {
            if (pin.length === 4) {
                setShowPinSection(false);
                setShowTransactionForm(true);
            } else {
                setPinError("PIN must be 4 digits.");
            }
        } else {
            if (currentCustomer?.pin === pin) {
                setShowPinSection(false);
                setShowTransactionForm(true);
            } else {
                setPinError("Incorrect PIN code.");
            }
        }
    };
    
    const tierInfo = useMemo(() => {
        if (!currentCustomer) return null;
        const spendTier = getTierBySpend(currentCustomer, tierSettings);
        const pointsTier = getTierByPoints(currentCustomer, tierSettings);
        const effectiveTier = getCustomerTier(currentCustomer, tierSettings);
        return { spendTier, pointsTier, effectiveTier };
    }, [currentCustomer, tierSettings]);

    const billDetails = useMemo(() => {
        const subtotal = parseFloat(billAmount) || 0;
        let discountPercentage = 0;
        let discountAmount = 0;
        let finalBill = subtotal;
        let pointsUsed = 0;
        let cashPayable = finalBill;
        
        if (usePointsAndDiscount && eligibility.eligible && currentCustomer && currentCustomer.points > 0 && subtotal > 0 && tierInfo) {
            discountPercentage = discountSettings[tierInfo.effectiveTier.toLowerCase() as keyof DiscountSettings] || 0;
            discountAmount = subtotal * (discountPercentage / 100);
            finalBill = subtotal - discountAmount;
            pointsUsed = Math.min(currentCustomer.points, finalBill);
            cashPayable = finalBill - pointsUsed;
        }
        
        const cash = parseFloat(cashGiven) || 0;
        const pointsEarned = Math.max(0, Math.floor(cash - cashPayable));
        
        return { subtotal, discountPercentage, discountAmount, finalBill, pointsUsed, cashPayable, pointsEarned };
    }, [billAmount, cashGiven, usePointsAndDiscount, currentCustomer, tierSettings, discountSettings, tierInfo, eligibility.eligible]);


    const handleTransactionSubmit = () => {
        const { subtotal, finalBill, pointsUsed, pointsEarned, cashPayable } = billDetails;
        const cash = parseFloat(cashGiven);

        if (!subtotal || subtotal <= 0) { alert("Please enter a valid Bill Amount"); return; }
        if (cash < cashPayable) { alert("Cash Given cannot be less than the amount payable."); return; }
        
        const newHistoryEntry: TransactionHistory = { 
            date: new Date().toISOString(), 
            bill: subtotal,
            discountPercentage: usePointsAndDiscount && eligibility.eligible ? billDetails.discountPercentage : undefined,
            finalBill,
            pointsUsed: usePointsAndDiscount && eligibility.eligible ? pointsUsed : 0,
            points: pointsEarned,
        };
        
        let newTotalPoints = 0;
        let deadlineDays: number | null = null;

        if (isNewCustomer) {
            newTotalPoints = pointsEarned;
            const newCustomer: Customer = { mobile, name: name || "Guest", pin, points: newTotalPoints, totalSpent: finalBill, history: [newHistoryEntry] };
            setCustomers(prev => [...prev, newCustomer]);
            deadlineDays = deadlineSettings.bronze;
        } else {
             let updatedCustomers = customers.map(c => {
                if (c.mobile !== mobile) return c;
                const finalPoints = (c.points - pointsUsed) + pointsEarned;
                newTotalPoints = finalPoints;
                return { ...c, points: finalPoints, totalSpent: c.totalSpent + finalBill, history: [...(c.history || []), newHistoryEntry] };
             })
             setCustomers(updatedCustomers);
             if (eligibility.deadline !== null && eligibility.daysSinceLastTxn !== null) {
                 deadlineDays = Math.max(0, eligibility.deadline - eligibility.daysSinceLastTxn);
             } else if (currentCustomer) {
                // Customer with no history
                const currentPointsTier = getTierByPoints({ ...currentCustomer, points: newTotalPoints }, tierSettings);
                deadlineDays = deadlineSettings[currentPointsTier.toLowerCase() as keyof DeadlineSettings];
             }
        }

        setLastTransactionDetails({
            customerName: name || "Guest",
            businessName: currentUser?.businessName || "Our Store",
            finalBill,
            pointsUsed,
            pointsEarned,
            newTotalPoints,
            deadlineDays
        });
        
        setShowTransactionForm(false);
        setShowPinSection(false);
    };

    const handleSendSms = () => {
        if (!lastTransactionDetails) return;
        setSmsStatus('sending');

        const { customerName, businessName, newTotalPoints, deadlineDays } = lastTransactionDetails;
        
        const message = 
`Hi ${customerName}, thanks for visiting ${businessName}! Your new balance is ${newTotalPoints} points. Your points tier status is valid for the next ${deadlineDays} days. We look forward to seeing you again!`;

        console.log("--- SIMULATING SMS ---");
        console.log(`To: ${mobile}`);
        console.log(message);
        console.log("----------------------");
        
        const newLog: SmsLog = {
            timestamp: new Date().toISOString(),
            recipientMobile: mobile,
            recipientName: customerName,
            message
        };

        setSmsLogs(prev => [newLog, ...prev]);

        setTimeout(() => {
            setSmsStatus('sent');
        }, 1500); // Simulate network delay
    };

    const smsButtonText = () => {
        switch (smsStatus) {
            case 'sending': return 'Sending...';
            case 'sent': return 'SMS Sent!';
            case 'failed': return 'Failed. Try Again.';
            default: return 'Send SMS Notification';
        }
    };

    return (
        <section>
            <PageTitle>New Entry</PageTitle>
            <Card className="max-w-xl mx-auto">
                {!lastTransactionDetails ? (
                <>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Mobile Number</label>
                        <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter 10-digit mobile number..." className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                    </div>
                    { (showPinSection || isNewCustomer) && <div>
                        <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Name</label>
                        <input type="text" ref={custNameRef} value={name} onChange={e => setName(e.target.value)} placeholder="Customer Name" readOnly={!isNewCustomer && !!currentCustomer} className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                    </div> }
                </div>

                {showPinSection && !showTransactionForm && (
                    <div className="mt-6 p-4 border border-dashed border-brand-border bg-gray-50 animate-fade-slide-up">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-brand-text">Security PIN</label>
                            <span className="text-xs text-brand-muted">{pinStatus}</span>
                        </div>
                        <div className="flex gap-4">
                            <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} placeholder="••••" className="flex-grow bg-transparent border-b border-brand-border py-2 text-brand-text text-lg tracking-[0.5em] text-center outline-none focus:border-brand-accent transition-colors" />
                            <button onClick={handlePinVerify} className="bg-brand-card text-brand-text border border-brand-border text-xs py-1.5 px-4 rounded-md hover:bg-gray-100 transition-colors">Verify</button>
                        </div>
                        {pinError && <p className="text-red-500 text-xs mt-2">{pinError}</p>}
                    </div>
                )}
                
                {showTransactionForm && (
                    <div className="mt-6 space-y-6 animate-fade-slide-up text-sm">
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Bill Amount (₹)</label>
                               <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="e.g. 900" className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                           </div>
                            <div>
                               <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Amount Given (₹)</label>
                               <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="e.g. 1000" className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                           </div>
                        </div>

                        {tierInfo && (
                             <div className="p-4 bg-gray-50 border border-brand-border/50 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-brand-text uppercase tracking-wider">Effective Tier</h4>
                                    <p className="text-xs text-brand-muted mt-1">Based on the higher of Spending Tier ({tierInfo.spendTier}) and Points Tier ({tierInfo.pointsTier}).</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_COLORS[tierInfo.effectiveTier]}`}>{tierInfo.effectiveTier}</span>
                            </div>
                        )}

                        {!isNewCustomer && !eligibility.eligible && (
                            <div className="p-4 bg-red-100 border border-red-300 text-red-800">
                                <h4 className="font-bold">Discount Ineligible</h4>
                                <p className="text-xs mt-1">
                                    Customer's last transaction was {eligibility.daysSinceLastTxn} days ago, exceeding the {eligibility.deadline} day deadline for their {eligibility.pointsTier} points tier.
                                </p>
                            </div>
                        )}

                        {canUsePoints && currentCustomer && (
                            <div className="p-4 bg-gray-50 border border-brand-border/50 flex justify-between items-center">
                                <div>
                                    <h4 className={`font-bold transition-colors ${!eligibility.eligible ? 'text-brand-muted' : 'text-brand-text'}`}>Redeem Points & Get Tier Discount</h4>
                                    <p className="text-xs text-brand-muted mt-1">Available: <span className="font-bold text-brand-text">{currentCustomer.points.toLocaleString()}</span> points</p>
                                </div>
                                <input id="redeem-points-checkbox" type="checkbox" checked={usePointsAndDiscount} onChange={e => setUsePointsAndDiscount(e.target.checked)} disabled={!eligibility.eligible} className="h-5 w-5 rounded bg-brand-card border-brand-border text-brand-accent focus:ring-brand-accent shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                        )}
                        
                        <div className="p-4 border border-dashed border-brand-border/50 space-y-2">
                             <h4 className="text-center font-serif text-lg mb-4">Bill Summary</h4>
                             <div className="flex justify-between items-center text-brand-muted">
                                 <span>Subtotal</span>
                                 <span>₹{billDetails.subtotal.toFixed(2)}</span>
                             </div>
                             {billDetails.discountAmount > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                     <span>{tierInfo?.effectiveTier} Discount ({billDetails.discountPercentage}%)</span>
                                     <span>-₹{billDetails.discountAmount.toFixed(2)}</span>
                                 </div>
                             )}
                            {billDetails.pointsUsed > 0 && (
                                <div className="flex justify-between items-center text-brand-muted">
                                    <span>Paid by Points</span>
                                    <span>-₹{billDetails.pointsUsed.toFixed(2)}</span>
                                </div>
                             )}
                             <div className="flex justify-between items-center text-brand-text font-bold text-lg border-t border-brand-border/50 pt-2 mt-2">
                                 <span>Total Payable</span>
                                 <span>₹{billDetails.cashPayable.toFixed(2)}</span>
                             </div>
                             {billDetails.pointsEarned > 0 && (
                                 <p className="text-center text-green-600 pt-2 font-bold">+ {billDetails.pointsEarned} Points Earned</p>
                             )}
                        </div>

                        <button onClick={handleTransactionSubmit} className="w-full mt-2 bg-brand-accent text-white border border-brand-accent py-3 font-semibold transition-all hover:opacity-90">
                            Process Transaction
                        </button>
                    </div>
                )}
                </>
                ) : (
                <div className="text-center animate-fade-slide-up space-y-4">
                    <h2 className="text-2xl font-serif text-green-600">Transaction Successful!</h2>
                    <div className="p-4 bg-gray-50 border border-brand-border/50 text-left space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-brand-muted">Customer:</span> <span>{lastTransactionDetails.customerName}</span></div>
                        <div className="flex justify-between"><span className="text-brand-muted">Points Earned:</span> <span className="text-green-600 font-bold">+{lastTransactionDetails.pointsEarned}</span></div>
                        <div className="flex justify-between"><span className="text-brand-muted">New Balance:</span> <span>{lastTransactionDetails.newTotalPoints.toLocaleString()} Points</span></div>
                    </div>
                    <button onClick={handleSendSms} disabled={smsStatus === 'sending' || smsStatus === 'sent'} className={`w-full flex items-center justify-center gap-2 mt-2 bg-brand-card text-brand-text border border-brand-border py-3 font-semibold transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${smsStatus === 'sent' ? '!bg-green-600 !border-green-500 !text-white' : ''}`}>
                         <FaCommentDots /> {smsButtonText()}
                    </button>
                    <button onClick={resetForm} className="w-full mt-2 bg-brand-accent text-white border border-brand-accent py-3 font-semibold transition-all hover:opacity-90">
                        Start New Transaction
                    </button>
                </div>
                )}
            </Card>
        </section>
    );
};

const SearchSection: React.FC<{ customers: Customer[], tierSettings: TierSettings }> = ({ customers, tierSettings }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [notFound, setNotFound] = useState(false);

    const handleSearch = () => {
        const customer = customers.find(c => c.mobile === searchTerm);
        setFoundCustomer(customer || null);
        setNotFound(!customer);
    };

    return (
        <section>
            <PageTitle>Database Search</PageTitle>
            <Card className="max-w-xl mx-auto">
                <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Find Customer by Mobile</label>
                <div className="flex gap-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Enter mobile number..." className="flex-grow bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                    <button onClick={handleSearch} className="bg-brand-card text-brand-text border border-brand-border text-xs py-1.5 px-6 rounded-md hover:bg-gray-100 transition-colors">Search</button>
                </div>
                {foundCustomer && (
                    <div className="mt-6 p-4 border border-brand-border bg-gray-50 animate-fade-slide-up">
                        <div className="flex justify-between items-center">
                            <h3 className="font-serif text-xl text-brand-accent">{foundCustomer.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${TIER_COLORS[getCustomerTier(foundCustomer, tierSettings)]}`}>{getCustomerTier(foundCustomer, tierSettings)}</span>
                        </div>
                        <p className="text-brand-muted mt-2">Mobile: <span className="text-brand-text font-mono">{foundCustomer.mobile}</span></p>
                        <p className="text-brand-muted">Points: <span className="text-brand-text">{foundCustomer.points.toLocaleString()}</span></p>
                        <p className="text-brand-muted">Total Spend: <span className="text-brand-text">₹{foundCustomer.totalSpent.toLocaleString()}</span></p>
                    </div>
                )}
                {notFound && <p className="text-red-500 text-sm mt-4">User not found in database.</p>}
            </Card>
        </section>
    );
};

const CustomersSection: React.FC<{ customers: Customer[], tierSettings: TierSettings }> = ({ customers, tierSettings }) => (
    <section>
        <PageTitle>Registered Users</PageTitle>
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-brand-border">
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Name</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Mobile</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Points</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Total Spend</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Tier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.mobile} className="border-b border-brand-border/50 hover:bg-gray-50">
                                <td className="p-3">{c.name}</td>
                                <td className="p-3 font-mono">{c.mobile}</td>
                                <td className="p-3">{c.points.toLocaleString()}</td>
                                <td className="p-3">₹{c.totalSpent.toLocaleString()}</td>
                                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${TIER_COLORS[getCustomerTier(c, tierSettings)]}`}>{getCustomerTier(c, tierSettings)}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </section>
);

const SmsLogsSection: React.FC<{ smsLogs: SmsLog[] }> = ({ smsLogs }) => (
    <section>
        <PageTitle>SMS Logs</PageTitle>
        <Card>
            <div className="overflow-x-auto">
                {smsLogs.length === 0 ? (
                    <p className="text-brand-muted text-center py-8">No SMS messages have been sent yet.</p>
                ) : (
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-brand-border">
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Date</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Recipient</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Mobile</th>
                            <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {smsLogs.map((log) => (
                            <tr key={log.timestamp} className="border-b border-brand-border/50 hover:bg-gray-50">
                                <td className="p-3 text-sm whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-3 text-sm">{log.recipientName}</td>
                                <td className="p-3 text-sm font-mono">{log.recipientMobile}</td>
                                <td className="p-3 text-sm text-brand-muted">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
        </Card>
    </section>
);

const AnalyticsSection: React.FC<{ customers: Customer[], tierSettings: TierSettings }> = ({ customers, tierSettings }) => {
    const analyticsData = useMemo(() => {
        let totalRevenue = 0;
        let totalPoints = 0;
        let totalTxns = 0;
        customers.forEach(c => {
            totalRevenue += c.totalSpent || 0;
            totalPoints += c.points || 0;
            totalTxns += c.history?.length || 0;
        });
        const aov = totalTxns > 0 ? Math.round(totalRevenue / totalTxns) : 0;
        
        const tierCounts = customers.reduce((acc, c) => {
            const tier = getCustomerTier(c, tierSettings);
            acc[tier] = (acc[tier] || 0) + 1;
            return acc;
        }, {} as Record<Tier, number>);
        
        const pieData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));
        
        const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

        const revenueHistory = customers.flatMap(c => c.history || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const aggregatedRevenue = revenueHistory.reduce((acc, curr) => {
            const date = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if(!acc[date]){
                acc[date] = 0;
            }
            acc[date] += curr.finalBill ?? curr.bill; // Use finalBill for accuracy, fallback to bill for old data
            return acc;
        }, {} as Record<string, number>);

        const lineChartData = Object.entries(aggregatedRevenue).map(([date, revenue]) => ({ date, revenue })).slice(-30);

        return { aov, totalPoints, totalTxns, pieData, topCustomers, lineChartData };
    }, [customers, tierSettings]);

    const PIE_CHART_COLORS: Record<Tier, string> = { Bronze: '#8d5b2d', Silver: '#a9a9a9', Gold: '#ffd700', Platinum: '#e5e4e2' };
    const pieColors = analyticsData.pieData.map(entry => PIE_CHART_COLORS[entry.name as Tier]);

    return (
        <section>
            <div className="flex justify-between items-end mb-8 pb-5 border-b border-brand-border">
                <h1 className="font-serif text-3xl md:text-4xl text-brand-accent mb-0">Intelligence Hub</h1>
                <button onClick={() => exportDataToCsv(customers)} className="bg-brand-card text-brand-text border border-brand-border text-xs py-1.5 px-4 rounded-md flex items-center gap-2 hover:bg-gray-100 transition-colors">
                    <FaDownload /> Export CSV
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="flex items-center gap-4"><div className="text-2xl p-3 bg-brand-accent/10 text-brand-accent rounded-full"><FaWallet /></div><div><span className="block text-xs text-brand-muted uppercase">Avg. Order Value</span><div className="text-2xl font-serif text-brand-accent">₹{analyticsData.aov.toLocaleString()}</div></div></Card>
                <Card className="flex items-center gap-4"><div className="text-2xl p-3 bg-brand-accent/10 text-brand-accent rounded-full"><FaCoins /></div><div><span className="block text-xs text-brand-muted uppercase">Points Liability</span><div className="text-2xl font-serif text-brand-accent">{analyticsData.totalPoints.toLocaleString()}</div></div></Card>
                <Card className="flex items-center gap-4"><div className="text-2xl p-3 bg-brand-accent/10 text-brand-accent rounded-full"><FaShoppingBag /></div><div><span className="block text-xs text-brand-muted uppercase">Total Transactions</span><div className="text-2xl font-serif text-brand-accent">{analyticsData.totalTxns.toLocaleString()}</div></div></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 h-[400px]">
                     <h3 className="font-serif text-lg text-brand-muted mb-4">Revenue Velocity</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={analyticsData.lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${Number(value)/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }} />
                            <Legend wrapperStyle={{fontSize: "14px"}} />
                            <Line type="monotone" dataKey="revenue" stroke="#1E90FF" strokeWidth={2} dot={{r: 2}} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="h-[400px]">
                    <h3 className="font-serif text-lg text-brand-muted mb-4">Customer Segments</h3>
                    <ResponsiveContainer width="100%" height="90%">
                         <PieChart>
                            <Pie data={analyticsData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {analyticsData.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }} />
                            <Legend wrapperStyle={{fontSize: "14px"}} />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            
            <Card>
                <h3 className="font-serif text-lg text-brand-muted mb-4">Top 5 "Whale" Customers</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-brand-border">
                                <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Rank</th>
                                <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Name</th>
                                <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Spent</th>
                                <th className="p-3 text-xs text-brand-muted uppercase tracking-wider">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analyticsData.topCustomers.map((c, index) => (
                                <tr key={c.mobile} className="border-b border-brand-border/50">
                                    <td className="p-3">{index+1}</td>
                                    <td className="p-3">{c.name}</td>
                                    <td className="p-3 font-bold">₹{c.totalSpent.toLocaleString()}</td>
                                    <td className="p-3">{c.points.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
};

const SettingsSection: React.FC<{ tierSettings: TierSettings, setTierSettings: React.Dispatch<React.SetStateAction<TierSettings>>, discountSettings: DiscountSettings, setDiscountSettings: React.Dispatch<React.SetStateAction<DiscountSettings>>, deadlineSettings: DeadlineSettings, setDeadlineSettings: React.Dispatch<React.SetStateAction<DeadlineSettings>> }> = ({ tierSettings, setTierSettings, discountSettings, setDiscountSettings, deadlineSettings, setDeadlineSettings }) => {
    
    return (
        <section>
            <PageTitle>Settings</PageTitle>
            <div className="max-w-3xl mx-auto space-y-8">
                <TierSettingsEditor tierSettings={tierSettings} setTierSettings={setTierSettings} />
                <DiscountSettingsEditor discountSettings={discountSettings} setDiscountSettings={setDiscountSettings} />
                <DeadlineSettingsEditor deadlineSettings={deadlineSettings} setDeadlineSettings={setDeadlineSettings} />
            </div>
        </section>
    );
};

// Moved outside of TierSettingsEditor to prevent re-creation on every render.
const TierSettingInput: React.FC<{
    tier: keyof TierSettings;
    tierName: string;
    formState: { [key in keyof TierSettings]: { minSpend: string; minPoints: string; } };
    handleInputChange: (tier: keyof TierSettings, field: keyof TierThreshold, value: string) => void;
}> = ({ tier, tierName, formState, handleInputChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <h3 className="font-serif text-lg md:col-span-1 capitalize">{tierName}</h3>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Min. Spend (₹)</label>
                <input type="text" pattern="\d*" value={formState[tier].minSpend} onChange={(e) => handleInputChange(tier, 'minSpend', e.target.value)} className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
             </div>
             <div>
                <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Min. Points</label>
                <input type="text" pattern="\d*" value={formState[tier].minPoints} onChange={(e) => handleInputChange(tier, 'minPoints', e.target.value)} className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
            </div>
        </div>
    </div>
);

const TierSettingsEditor: React.FC<{ tierSettings: TierSettings, setTierSettings: React.Dispatch<React.SetStateAction<TierSettings>> }> = ({ tierSettings, setTierSettings }) => {
    type FormState = { [key in keyof TierSettings]: { minSpend: string; minPoints: string }; };

    const initialFormState = (settings: TierSettings): FormState => ({
        bronze: { minSpend: settings.bronze.minSpend.toString(), minPoints: settings.bronze.minPoints.toString() },
        silver: { minSpend: settings.silver.minSpend.toString(), minPoints: settings.silver.minPoints.toString() },
        gold: { minSpend: settings.gold.minSpend.toString(), minPoints: settings.gold.minPoints.toString() },
        platinum: { minSpend: settings.platinum.minSpend.toString(), minPoints: settings.platinum.minPoints.toString() },
    });
    
    const [formState, setFormState] = useState<FormState>(initialFormState(tierSettings));
    const [saved, setSaved] = useState(false);

    useEffect(() => { setFormState(initialFormState(tierSettings)); }, [tierSettings]);

    const handleInputChange = (tier: keyof TierSettings, field: keyof TierThreshold, value: string) => {
        if (/^\d*$/.test(value)) {
            setFormState(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: value } }));
            setSaved(false);
        }
    };

    const handleSaveChanges = () => {
        const newSettings: TierSettings = {
            bronze: { minSpend: parseInt(formState.bronze.minSpend, 10) || 0, minPoints: parseInt(formState.bronze.minPoints, 10) || 0 },
            silver: { minSpend: parseInt(formState.silver.minSpend, 10) || 0, minPoints: parseInt(formState.silver.minPoints, 10) || 0 },
            gold: { minSpend: parseInt(formState.gold.minSpend, 10) || 0, minPoints: parseInt(formState.gold.minPoints, 10) || 0 },
            platinum: { minSpend: parseInt(formState.platinum.minSpend, 10) || 0, minPoints: parseInt(formState.platinum.minPoints, 10) || 0 },
        };
        setTierSettings(newSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Card>
            <div className="space-y-8">
                <h2 className="font-serif text-xl text-brand-muted pb-3 border-b border-brand-border">Customer Tier Settings</h2>
                <p className="text-sm text-brand-muted -mt-4">A customer achieves a tier if they meet <span className="font-bold text-brand-text">either</span> the minimum spend <span className="font-bold text-brand-text">or</span> minimum points requirement.</p>
                <TierSettingInput tier="bronze" tierName="Bronze" formState={formState} handleInputChange={handleInputChange} />
                <TierSettingInput tier="silver" tierName="Silver" formState={formState} handleInputChange={handleInputChange} />
                <TierSettingInput tier="gold" tierName="Gold" formState={formState} handleInputChange={handleInputChange} />
                <TierSettingInput tier="platinum" tierName="Platinum" formState={formState} handleInputChange={handleInputChange} />
                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveChanges} className={`bg-brand-accent text-white border border-brand-accent py-2 px-6 font-semibold transition-all ${saved ? 'bg-green-500 border-green-500' : 'hover:opacity-90'}`}>
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Card>
    );
}

const DiscountInput: React.FC<{
    tier: keyof DiscountSettings;
    tierName: string;
    formState: { [key in keyof DiscountSettings]: string };
    handleInputChange: (tier: keyof DiscountSettings, value: string) => void;
}> = ({ tier, tierName, formState, handleInputChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <h3 className="font-serif text-lg md:col-span-1 capitalize">{tierName}</h3>
        <div className="md:col-span-2">
            <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Discount (%)</label>
            <div className="relative">
                <input type="text" pattern="\d*" value={formState[tier]} onChange={(e) => handleInputChange(tier, e.target.value)} className="w-full bg-transparent border-b border-brand-border py-2 pl-2 pr-6 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
                <FaPercent className="absolute right-0 top-3 text-brand-muted" />
            </div>
        </div>
    </div>
);

const DiscountSettingsEditor: React.FC<{ discountSettings: DiscountSettings, setDiscountSettings: React.Dispatch<React.SetStateAction<DiscountSettings>> }> = ({ discountSettings, setDiscountSettings }) => {
    type FormState = { [key in keyof DiscountSettings]: string };

    const initialFormState = (settings: DiscountSettings): FormState => ({
        bronze: settings.bronze.toString(),
        silver: settings.silver.toString(),
        gold: settings.gold.toString(),
        platinum: settings.platinum.toString(),
    });

    const [formState, setFormState] = useState<FormState>(initialFormState(discountSettings));
    const [saved, setSaved] = useState(false);

    useEffect(() => { setFormState(initialFormState(discountSettings)); }, [discountSettings]);

    const handleInputChange = (tier: keyof DiscountSettings, value: string) => {
        if (/^\d*$/.test(value)) {
            setFormState(prev => ({ ...prev, [tier]: value }));
            setSaved(false);
        }
    };

    const handleSaveChanges = () => {
        const newSettings: DiscountSettings = {
            bronze: parseInt(formState.bronze, 10) || 0,
            silver: parseInt(formState.silver, 10) || 0,
            gold: parseInt(formState.gold, 10) || 0,
            platinum: parseInt(formState.platinum, 10) || 0,
        };
        setDiscountSettings(newSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Card>
            <div className="space-y-8">
                <h2 className="font-serif text-xl text-brand-muted pb-3 border-b border-brand-border">Discount Settings</h2>
                <DiscountInput tier="bronze" tierName="Bronze" formState={formState} handleInputChange={handleInputChange} />
                <DiscountInput tier="silver" tierName="Silver" formState={formState} handleInputChange={handleInputChange} />
                <DiscountInput tier="gold" tierName="Gold" formState={formState} handleInputChange={handleInputChange} />
                <DiscountInput tier="platinum" tierName="Platinum" formState={formState} handleInputChange={handleInputChange} />
                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveChanges} className={`bg-brand-accent text-white border border-brand-accent py-2 px-6 font-semibold transition-all ${saved ? 'bg-green-500 border-green-500' : 'hover:opacity-90'}`}>
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Card>
    );
};

const DeadlineInput: React.FC<{
    tier: keyof DeadlineSettings;
    tierName: string;
    formState: { [key in keyof DeadlineSettings]: string };
    handleInputChange: (tier: keyof DeadlineSettings, value: string) => void;
}> = ({ tier, tierName, formState, handleInputChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <h3 className="font-serif text-lg md:col-span-1 capitalize">{tierName}</h3>
        <div className="md:col-span-2">
            <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">Deadline (Days)</label>
                <input type="text" pattern="\d*" value={formState[tier]} onChange={(e) => handleInputChange(tier, e.target.value)} className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors" />
        </div>
    </div>
);

const DeadlineSettingsEditor: React.FC<{ deadlineSettings: DeadlineSettings, setDeadlineSettings: React.Dispatch<React.SetStateAction<DeadlineSettings>> }> = ({ deadlineSettings, setDeadlineSettings }) => {
    type FormState = { [key in keyof DeadlineSettings]: string };

    const initialFormState = (settings: DeadlineSettings): FormState => ({
        bronze: settings.bronze.toString(),
        silver: settings.silver.toString(),
        gold: settings.gold.toString(),
        platinum: settings.platinum.toString(),
    });

    const [formState, setFormState] = useState<FormState>(initialFormState(deadlineSettings));
    const [saved, setSaved] = useState(false);

    useEffect(() => { setFormState(initialFormState(deadlineSettings)); }, [deadlineSettings]);

    const handleInputChange = (tier: keyof DeadlineSettings, value: string) => {
        if (/^\d*$/.test(value)) {
            setFormState(prev => ({ ...prev, [tier]: value }));
            setSaved(false);
        }
    };

    const handleSaveChanges = () => {
        const newSettings: DeadlineSettings = {
            bronze: parseInt(formState.bronze, 10) || 0,
            silver: parseInt(formState.silver, 10) || 0,
            gold: parseInt(formState.gold, 10) || 0,
            platinum: parseInt(formState.platinum, 10) || 0,
        };
        setDeadlineSettings(newSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Card>
            <div className="space-y-8">
                <h2 className="font-serif text-xl text-brand-muted pb-3 border-b border-brand-border">Points Deadline Settings</h2>
                <p className="text-sm text-brand-muted -mt-4">Set the number of days a customer has to make a new transaction before their points-based tier status expires, making them ineligible for discounts.</p>
                <DeadlineInput tier="bronze" tierName="Bronze" formState={formState} handleInputChange={handleInputChange} />
                <DeadlineInput tier="silver" tierName="Silver" formState={formState} handleInputChange={handleInputChange} />
                <DeadlineInput tier="gold" tierName="Gold" formState={formState} handleInputChange={handleInputChange} />
                <DeadlineInput tier="platinum" tierName="Platinum" formState={formState} handleInputChange={handleInputChange} />
                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveChanges} className={`bg-brand-accent text-white border border-brand-accent py-2 px-6 font-semibold transition-all ${saved ? 'bg-green-500 border-green-500' : 'hover:opacity-90'}`}>
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default Dashboard;
