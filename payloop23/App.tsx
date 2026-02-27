
import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Admin, Customer, TierSettings, DiscountSettings, DeadlineSettings, SmsLog } from './types';
import Dashboard from './components/Dashboard';
import { FaEye, FaEyeSlash, FaInfinity } from 'react-icons/fa';
import { SAMPLE_CUSTOMERS } from './sampleData';

const DEFAULT_TIER_SETTINGS: TierSettings = {
  bronze: { minSpend: 0, minPoints: 0 },
  silver: { minSpend: 2000, minPoints: 100 },
  gold: { minSpend: 10000, minPoints: 500 },
  platinum: { minSpend: 50000, minPoints: 2500 },
};

const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
  bronze: 0,
  silver: 5,
  gold: 10,
  platinum: 15,
};

const DEFAULT_DEADLINE_SETTINGS: DeadlineSettings = {
  bronze: 365,
  silver: 180,
  gold: 90,
  platinum: 60,
};

// Noise Overlay Component
const NoiseOverlay = () => (
    <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-[0.04]"
        style={{
            background: `url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="1"/%3E%3C/svg%3E')`,
        }}
    ></div>
);

// Auth Page Component
interface AuthPageProps {
    onLogin: (u: string, p: string) => boolean;
    onRegister: (bn: string, u: string, p: string) => boolean;
    onDevLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onDevLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    
    // Login state
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Register state
    const [regBusinessName, setRegBusinessName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regError, setRegError] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        const success = onLogin(loginUsername, loginPassword);
        if (!success) {
            setLoginError('Invalid username or password.');
        }
    };

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setRegError('');
        if (regPassword !== regConfirmPassword) {
            setRegError('Passwords do not match.');
            return;
        }
        if (!regBusinessName || !regUsername || !regPassword) {
            setRegError('All fields are required.');
            return;
        }
        const success = onRegister(regBusinessName, regUsername, regPassword);
        if (!success) {
            setRegError('Username already exists.');
        }
    };

    const InputField = ({ label, type = 'text', value, onChange, placeholder, children }: { label: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, children?: React.ReactNode }) => (
        <div>
            <label className="block text-xs text-brand-muted mb-2 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-b border-brand-border py-2 text-brand-text text-base outline-none focus:border-brand-accent transition-colors pr-8"
                    required
                />
                {children}
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-brand-bg">
            <div className="text-center mb-8">
                <FaInfinity className="text-4xl text-brand-accent mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-serif text-brand-accent">Pay Loop</h1>
                <p className="text-brand-muted mt-2 text-sm italic max-w-xs mx-auto">"Every payment begins a new relationship, not just a receipt."</p>
            </div>

            <div className="w-full max-w-sm p-8 border border-brand-border bg-brand-card shadow-2xl animate-fade-slide-up">
                <div className="flex mb-6 border-b border-brand-border">
                    <button onClick={() => setIsLoginView(true)} className={`flex-1 pb-2 text-sm uppercase tracking-wider ${isLoginView ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-brand-muted'}`}>Login</button>
                    <button onClick={() => setIsLoginView(false)} className={`flex-1 pb-2 text-sm uppercase tracking-wider ${!isLoginView ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-brand-muted'}`}>Register</button>
                </div>

                {isLoginView ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <InputField label="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Enter username" />
                        <InputField label="Password" type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••">
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-2 text-brand-muted p-1 hover:text-brand-text">
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </InputField>
                        <button type="submit" className="w-full mt-2 bg-brand-accent text-white border border-brand-accent py-3 font-semibold transition-all hover:opacity-90">
                            Authenticate
                        </button>
                        {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} className="space-y-6">
                         <InputField label="Business Name" value={regBusinessName} onChange={e => setRegBusinessName(e.target.value)} placeholder="e.g., John's Cafe" />
                         <InputField label="Username" value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Create a username" />
                         <InputField label="Password" type={showPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create a secure password">
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-2 text-brand-muted p-1 hover:text-brand-text">
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                         </InputField>
                         <InputField label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} placeholder="Confirm your password">
                             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 top-2 text-brand-muted p-1 hover:text-brand-text">
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                         </InputField>
                        <button type="submit" className="w-full mt-2 bg-brand-accent text-white border border-brand-accent py-3 font-semibold transition-all hover:opacity-90">
                            Create Account
                        </button>
                        {regError && <p className="text-red-500 text-xs text-center">{regError}</p>}
                    </form>
                )}
            </div>

            <button onClick={onDevLogin} className="mt-6 text-xs text-brand-muted border border-brand-border px-3 py-1 rounded-full hover:border-brand-accent hover:text-brand-accent transition-colors">
                Dev Login
            </button>
        </div>
    );
};


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Admin | null>(null);
    const [admins, setAdmins] = useLocalStorage<Admin[]>('adminsDB', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('loyaltyDB', []);
    const [tierSettings, setTierSettings] = useLocalStorage<TierSettings>('loyaltySettings', DEFAULT_TIER_SETTINGS);
    const [discountSettings, setDiscountSettings] = useLocalStorage<DiscountSettings>('loyaltyDiscounts', DEFAULT_DISCOUNT_SETTINGS);
    const [deadlineSettings, setDeadlineSettings] = useLocalStorage<DeadlineSettings>('loyaltyDeadlines', DEFAULT_DEADLINE_SETTINGS);
    const [smsLogs, setSmsLogs] = useLocalStorage<SmsLog[]>('smsLogsDB', []);

    const handleLogin = useCallback((username: string, password: string): boolean => {
        const admin = admins.find(a => a.username === username && a.password === password);
        if (admin) {
            setCurrentUser(admin);
            return true;
        }
        return false;
    }, [admins]);

    const handleRegister = useCallback((businessName: string, username: string, password: string): boolean => {
        if (admins.some(a => a.username === username)) {
            return false; // Username exists
        }
        const newAdmin: Admin = { businessName, username, password };
        setAdmins(prevAdmins => [...prevAdmins, newAdmin]);
        setCurrentUser(newAdmin);
        return true;
    }, [admins, setAdmins]);

    const handleDevLogin = useCallback(() => {
        if (customers.length === 0) {
            setCustomers(SAMPLE_CUSTOMERS);
        }
        setCurrentUser({ businessName: "Dev Mode", username: "developer", password: "" });
    }, [customers, setCustomers]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
    }, []);
    
    return (
        <>
            <NoiseOverlay />
            <main className="min-h-screen">
                {currentUser ? (
                     <Dashboard 
                        currentUser={currentUser}
                        customers={customers} 
                        setCustomers={setCustomers} 
                        tierSettings={tierSettings}
                        setTierSettings={setTierSettings}
                        discountSettings={discountSettings}
                        setDiscountSettings={setDiscountSettings}
                        deadlineSettings={deadlineSettings}
                        setDeadlineSettings={setDeadlineSettings}
                        smsLogs={smsLogs}
                        setSmsLogs={setSmsLogs}
                        handleLogout={handleLogout} 
                     />
                ) : (
                    <AuthPage onLogin={handleLogin} onRegister={handleRegister} onDevLogin={handleDevLogin} />
                )}
            </main>
        </>
    );
};

export default App;
