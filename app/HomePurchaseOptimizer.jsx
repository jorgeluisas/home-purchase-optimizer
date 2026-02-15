'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, ReferenceLine, Label } from 'recharts';
import {
  SF, URL_PARAM_MAP, REVERSE_URL_MAP,
  fmt$, fmtPct, fmtPctWhole, fmtNum,
  calcCAStateTax, calcFedTax, getFedRate, getCARate,
  calcMonthly, genAmort, calcPMI, calcTxCosts,
  calcScenario, runOptimization, calcAffordability
} from './calculations';

// Info Box Component
const InfoBox = ({ title, children, recommendation, isOpen, onToggle }) => (
  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: 'rgba(59,130,246,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: '600', fontSize: '0.9rem' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>i</div>
        {title}
      </div>
      <span style={{ color: '#60a5fa', fontSize: '0.8rem' }}>{isOpen ? '▼' : '▶'}</span>
    </div>
    {isOpen && (
      <div style={{ padding: '18px' }}>
        <div style={{ color: '#c0c0d0', fontSize: '0.88rem', lineHeight: '1.7' }}>{children}</div>
        {recommendation && (
          <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '500',
            background: recommendation.type === 'yes' ? 'rgba(74,222,128,0.12)' : recommendation.type === 'no' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)',
            border: recommendation.type === 'yes' ? '1px solid rgba(74,222,128,0.3)' : recommendation.type === 'no' ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(251,191,36,0.3)',
            color: recommendation.type === 'yes' ? '#4ade80' : recommendation.type === 'no' ? '#f87171' : '#fbbf24'
          }}>
            <strong>Recommendation:</strong> {recommendation.text}
          </div>
        )}
      </div>
    )}
  </div>
);

// All constants, tax functions, scenario calculations, optimization engine,
// affordability calculator, and format helpers are imported from ./calculations.js

// Input components (UI-only, remain in main file)
const CurrencyInput = ({ value, onChange, label, min = 0, max = Infinity, style, error, onValidate }) => {
  const [focused, setFocused] = React.useState(false);
  const [tempValue, setTempValue] = React.useState('');
  const [localError, setLocalError] = React.useState('');

  const handleFocus = () => {
    setFocused(true);
    setTempValue(value.toString());
    setLocalError('');
  };

  const handleBlur = () => {
    setFocused(false);
    const cleanedValue = tempValue.replace(/[^0-9.-]/g, '');
    const parsed = parseInt(cleanedValue, 10);
    
    if (cleanedValue === '' || isNaN(parsed)) {
      setLocalError('Please enter a valid number');
      if (onValidate) onValidate(false, 'Please enter a valid number');
      return;
    }
    
    if (parsed < min) {
      setLocalError(`Value cannot be less than ${fmtNum(min)}`);
      if (onValidate) onValidate(false, `Value cannot be less than ${fmtNum(min)}`);
      onChange(min); // Clamp to min
      return;
    }
    
    if (parsed > max) {
      setLocalError(`Value cannot exceed ${fmtNum(max)}`);
      if (onValidate) onValidate(false, `Value cannot exceed ${fmtNum(max)}`);
      onChange(max); // Clamp to max
      return;
    }
    
    setLocalError('');
    if (onValidate) onValidate(true, '');
    onChange(parsed);
  };

  const handleChange = (e) => {
    setTempValue(e.target.value);
    // Clear error while typing
    if (localError) setLocalError('');
  };

  const displayError = error || localError;
  const hasError = !!displayError;

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        inputMode="decimal"
        style={{
          ...style,
          borderColor: hasError ? '#f87171' : style?.borderColor || 'rgba(255,255,255,0.1)',
          boxShadow: hasError ? '0 0 0 2px rgba(248,113,113,0.2)' : 'none'
        }}
        value={focused ? tempValue : '$' + fmtNum(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {hasError && (
        <div style={{ 
          color: '#f87171', 
          fontSize: '0.75rem', 
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⚠</span> {displayError}
        </div>
      )}
    </div>
  );
};

// Number input component with validation (for rates/percentages)
const NumberInput = ({ value, onChange, min = 0, max = Infinity, step = 1, style, error, onValidate }) => {
  const [localError, setLocalError] = React.useState('');

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    if (newValue === '') {
      onChange(0);
      return;
    }
    
    const parsed = parseFloat(newValue);
    
    if (isNaN(parsed)) {
      setLocalError('Please enter a valid number');
      if (onValidate) onValidate(false, 'Please enter a valid number');
      return;
    }
    
    if (parsed < min) {
      setLocalError(`Value cannot be less than ${min}`);
      if (onValidate) onValidate(false, `Value cannot be less than ${min}`);
      onChange(min);
      return;
    }
    
    if (parsed > max) {
      setLocalError(`Value cannot exceed ${max}`);
      if (onValidate) onValidate(false, `Value cannot exceed ${max}`);
      onChange(max);
      return;
    }
    
    setLocalError('');
    if (onValidate) onValidate(true, '');
    onChange(parsed);
  };

  const displayError = error || localError;
  const hasError = !!displayError;

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        style={{
          ...style,
          borderColor: hasError ? '#f87171' : style?.borderColor || 'rgba(255,255,255,0.1)',
          boxShadow: hasError ? '0 0 0 2px rgba(248,113,113,0.2)' : 'none'
        }}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
      />
      {hasError && (
        <div style={{ 
          color: '#f87171', 
          fontSize: '0.75rem', 
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⚠</span> {displayError}
        </div>
      )}
    </div>
  );
};

// Scenario Presets
const SCENARIO_PRESETS = {
  conservative: {
    name: 'Conservative',
    emoji: '🛡️',
    description: 'Lower leverage, higher safety margins, traditional financing',
    color: '#4ade80',
    settings: {
      manualDpPct: 30,
      manualMarginPct: 0,
      manualHelocPct: 0,
      mortgageRate: 7.0,    // Assume slightly higher rate
      marginRate: 7.0,
      helocRate: 9.0,
      investmentReturn: 6,  // Conservative returns
      homeAppreciation: 3,  // Conservative appreciation
      rentGrowth: 3,
    }
  },
  balanced: {
    name: 'Balanced',
    emoji: '⚖️',
    description: 'Moderate leverage, realistic assumptions, some optimization',
    color: '#60a5fa',
    settings: {
      manualDpPct: 25,
      manualMarginPct: 10,
      manualHelocPct: 0,
      mortgageRate: 6.5,
      marginRate: 6.5,
      helocRate: 8.5,
      investmentReturn: 8,
      homeAppreciation: 5,
      rentGrowth: 3,
    }
  },
  aggressive: {
    name: 'Aggressive',
    emoji: '🚀',
    description: 'Maximum tax optimization, higher leverage, all tools utilized',
    color: '#f97316',
    settings: {
      manualDpPct: 20,
      manualMarginPct: 20,
      manualHelocPct: 50,   // Only applies if buying with cash
      mortgageRate: 6.5,
      marginRate: 6.0,      // Assume better rates
      helocRate: 8.0,
      investmentReturn: 10, // Optimistic returns
      homeAppreciation: 6,  // Optimistic appreciation
      rentGrowth: 4,
    }
  }
};

// Preset Selector Component
const PresetSelector = ({ onSelect, activePreset }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8b8ba7', marginBottom: '10px', fontWeight: '600' }}>
        Quick Start Presets
      </div>
      <div className="hpo-preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {Object.entries(SCENARIO_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              padding: '12px 8px',
              borderRadius: '10px',
              border: activePreset === key ? `2px solid ${preset.color}` : '1px solid rgba(255,255,255,0.1)',
              background: activePreset === key ? `${preset.color}20` : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{preset.emoji}</div>
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: '600', 
              color: activePreset === key ? preset.color : '#d0d0e0',
              marginBottom: '2px' 
            }}>
              {preset.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', lineHeight: '1.3' }}>
              {preset.description.split(',')[0]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function HomePurchaseOptimizer() {
  const [homePrice, setHomePrice] = useState(2000000);
  const [totalSavings, setTotalSavings] = useState(1000000);
  const [stockPortfolio, setStockPortfolio] = useState(1500000);
  const [grossIncome, setGrossIncome] = useState(1500000);
  const [monthlyRent, setMonthlyRent] = useState(8000);
  const [rentGrowth, setRentGrowth] = useState(3); // Annual rent increase %
  const [filingStatus, setFilingStatus] = useState('married');
  const [mortgageRate, setMortgageRate] = useState(6.5);
  const [marginRate, setMarginRate] = useState(6.5);
  const [helocRate, setHelocRate] = useState(8.5);
  const [cashOutRefiRate, setCashOutRefiRate] = useState(6.75); // Cash-out refinance rate (typically slightly higher than purchase rate)
  const [investmentReturn, setInvestmentReturn] = useState(8);
  const [dividendYield, setDividendYield] = useState(2); // Actual income (dividends, interest) - for investment interest deduction
  const [homeAppreciation, setHomeAppreciation] = useState(5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [minBuffer, setMinBuffer] = useState(300000);
  
  // Manual mode inputs
  const [manualDpPct, setManualDpPct] = useState(30);
  const [manualMarginPct, setManualMarginPct] = useState(0);
  const [manualHelocPct, setManualHelocPct] = useState(0);

  // Affordability tab state
  const [affMonthlyHOA, setAffMonthlyHOA] = useState(0);
  const [affMonthlyOtherDebt, setAffMonthlyOtherDebt] = useState(0);
  const [affSelectedDpPct, setAffSelectedDpPct] = useState(0.20);
  const [affTargetComfort, setAffTargetComfort] = useState(null); // null = max, or 0.20/0.30/0.40/0.50/0.75

  const [activeTab, setActiveTab] = useState('afford');
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [openInfoBoxes, setOpenInfoBoxes] = useState({});
  const [showOptimizeDetails, setShowOptimizeDetails] = useState(false);
  
  // CTA-related state
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [whatIfAppreciation, setWhatIfAppreciation] = useState(null); // null = use default

  // Preset state
  const [activePreset, setActivePreset] = useState(null);

  // Expert/Quick Mode state
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);

  // Custom assumptions state (editable SF constants)
  const [customAssumptions, setCustomAssumptions] = useState({
    propTaxRate: 1.18,      // % (SF default)
    transferTax: 0.68,      // % (SF default)
    parcelTax: 350,         // $ annual
    realtorComm: 5,         // %
    closeBuy: 1.5,          // %
    closeSell: 1,           // %
    insuranceRate: 0.35,    // %
    maintenanceRate: 1,     // %
    pmiRate: 0.5,           // %
  });
  const [showAssumptions, setShowAssumptions] = useState(false);
  
  // Check if assumptions have been modified from defaults
  const assumptionsModified = useMemo(() => {
    const defaults = {
      propTaxRate: 1.18, transferTax: 0.68, parcelTax: 350,
      realtorComm: 5, closeBuy: 1.5, closeSell: 1,
      insuranceRate: 0.35, maintenanceRate: 1, pmiRate: 0.5
    };
    return Object.keys(defaults).some(k => customAssumptions[k] !== defaults[k]);
  }, [customAssumptions]);

  // Reset assumptions to defaults
  const resetAssumptions = useCallback(() => {
    setCustomAssumptions({
      propTaxRate: 1.18, transferTax: 0.68, parcelTax: 350,
      realtorComm: 5, closeBuy: 1.5, closeSell: 1,
      insuranceRate: 0.35, maintenanceRate: 1, pmiRate: 0.5
    });
  }, []);

  // Apply preset function
  const applyPreset = useCallback((presetKey) => {
    const preset = SCENARIO_PRESETS[presetKey];
    if (!preset) return;
    
    const { settings } = preset;
    
    // Apply manual mode settings
    if (settings.manualDpPct !== undefined) setManualDpPct(settings.manualDpPct);
    if (settings.manualMarginPct !== undefined) setManualMarginPct(settings.manualMarginPct);
    if (settings.manualHelocPct !== undefined) setManualHelocPct(settings.manualHelocPct);
    
    // Apply rate settings
    if (settings.mortgageRate !== undefined) setMortgageRate(settings.mortgageRate);
    if (settings.marginRate !== undefined) setMarginRate(settings.marginRate);
    if (settings.helocRate !== undefined) setHelocRate(settings.helocRate);
    
    // Apply assumption settings
    if (settings.investmentReturn !== undefined) setInvestmentReturn(settings.investmentReturn);
    if (settings.homeAppreciation !== undefined) setHomeAppreciation(settings.homeAppreciation);
    if (settings.rentGrowth !== undefined) setRentGrowth(settings.rentGrowth);
    
    // Track the active preset
    setActivePreset(presetKey);
    
    // Navigate to Build Your Own tab to show the settings
    setActiveTab('manual');
  }, []);

  // Scenario comparison state
  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Scenario A', dpPct: 20, mortgageRate: 6.5, marginPct: 0, helocPct: 0 },
    { id: 2, name: 'Scenario B', dpPct: 30, mortgageRate: 6.5, marginPct: 15, helocPct: 0 },
  ]);

  // Input validation state
  const [validationErrors, setValidationErrors] = useState({});
  
  // Check if form is valid (no errors and all required fields have positive values where needed)
  const isFormValid = useMemo(() => {
    const hasErrors = Object.values(validationErrors).some(err => !!err);
    if (hasErrors) return false;
    
    // Check that critical values are positive
    if (homePrice <= 0) return false;
    if (grossIncome <= 0) return false;
    if (mortgageRate <= 0 || mortgageRate > 20) return false;
    
    return true;
  }, [validationErrors, homePrice, grossIncome, mortgageRate]);

  // Validation helper
  const setFieldError = useCallback((field, error) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  // URL state persistence
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasHydrated = useRef(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [affordCopied, setAffordCopied] = useState(false);

  // State setters map for hydration
  const stateSetters = useMemo(() => ({
    homePrice: setHomePrice,
    totalSavings: setTotalSavings,
    stockPortfolio: setStockPortfolio,
    grossIncome: setGrossIncome,
    monthlyRent: setMonthlyRent,
    rentGrowth: setRentGrowth,
    filingStatus: setFilingStatus,
    mortgageRate: setMortgageRate,
    marginRate: setMarginRate,
    helocRate: setHelocRate,
    cashOutRefiRate: setCashOutRefiRate,
    investmentReturn: setInvestmentReturn,
    dividendYield: setDividendYield,
    homeAppreciation: setHomeAppreciation,
    loanTerm: setLoanTerm,
    minBuffer: setMinBuffer,
    manualDpPct: setManualDpPct,
    manualMarginPct: setManualMarginPct,
    manualHelocPct: setManualHelocPct,
    activeTab: setActiveTab,
  }), []);

  // Hydrate state from URL on mount
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;

    params.forEach((value, shortKey) => {
      const stateKey = REVERSE_URL_MAP[shortKey];
      if (!stateKey || !stateSetters[stateKey]) return;

      if (stateKey === 'filingStatus' || stateKey === 'activeTab') {
        stateSetters[stateKey](value);
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) stateSetters[stateKey](num);
      }
    });
  }, [searchParams, stateSetters]);

  // Current state values for URL sync
  const currentState = useMemo(() => ({
    homePrice, totalSavings, stockPortfolio, grossIncome, monthlyRent, rentGrowth,
    filingStatus, mortgageRate, marginRate, helocRate, cashOutRefiRate,
    investmentReturn, dividendYield, homeAppreciation, loanTerm, minBuffer,
    manualDpPct, manualMarginPct, manualHelocPct, activeTab
  }), [homePrice, totalSavings, stockPortfolio, grossIncome, monthlyRent, rentGrowth,
      filingStatus, mortgageRate, marginRate, helocRate, cashOutRefiRate,
      investmentReturn, dividendYield, homeAppreciation, loanTerm, minBuffer,
      manualDpPct, manualMarginPct, manualHelocPct, activeTab]);

  // Default values for comparison (only include non-default in URL)
  const defaults = useMemo(() => ({
    homePrice: 2000000, totalSavings: 1000000, stockPortfolio: 1500000,
    grossIncome: 1500000, monthlyRent: 8000, rentGrowth: 3,
    filingStatus: 'married', mortgageRate: 6.5, marginRate: 6.5,
    helocRate: 8.5, cashOutRefiRate: 6.75, investmentReturn: 8,
    dividendYield: 2, homeAppreciation: 5, loanTerm: 30, minBuffer: 300000,
    manualDpPct: 30, manualMarginPct: 0, manualHelocPct: 0, activeTab: 'optimize'
  }), []);

  // Update URL when state changes (debounced)
  useEffect(() => {
    if (!hasHydrated.current) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      
      Object.entries(currentState).forEach(([key, value]) => {
        const shortKey = URL_PARAM_MAP[key];
        if (shortKey && value !== defaults[key]) {
          params.set(shortKey, String(value));
        }
      });

      const newUrl = params.size > 0 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      
      window.history.replaceState({}, '', newUrl);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentState, defaults]);

  // Copy shareable link
  const copyShareLink = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(currentState).forEach(([key, value]) => {
      const shortKey = URL_PARAM_MAP[key];
      if (shortKey && value !== defaults[key]) {
        params.set(shortKey, String(value));
      }
    });

    const shareUrl = params.size > 0
      ? `${window.location.origin}${window.location.pathname}?${params.toString()}`
      : `${window.location.origin}${window.location.pathname}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [currentState, defaults]);


  const toggleInfo = (id) => setOpenInfoBoxes(p => ({ ...p, [id]: !p[id] }));
  
  const stateTax = useMemo(() => calcCAStateTax(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const fedRate = useMemo(() => getFedRate(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const caRate = useMemo(() => getCARate(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const combRate = fedRate + caRate;
  const stdDeduction = filingStatus === 'married' ? 29200 : 14600;
  
  const handleOptimize = useCallback(() => {
    const result = runOptimization({
      homePrice, totalSavings, stockPortfolio, mortgageRate: mortgageRate/100, cashOutRefiRate: cashOutRefiRate/100, loanTerm,
      appreciationRate: homeAppreciation/100, investmentReturn: investmentReturn/100,
      dividendYield: dividendYield/100, monthlyRent, rentGrowthRate: rentGrowth/100, marginRate: marginRate/100, helocRate: helocRate/100,
      fedRate, caRate, stateTax, stdDeduction, minBuffer, filingStatus, grossIncome
    });
    setOptimizationResult(result);
    setActiveTab('optimize');
  }, [homePrice, totalSavings, stockPortfolio, mortgageRate, loanTerm, homeAppreciation, investmentReturn, monthlyRent, rentGrowth, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, minBuffer, grossIncome, filingStatus]);

  // Apply a scenario to Manual tab settings and navigate there
  const applyScenarioToManual = useCallback((scenario) => {
    if (!scenario) return;
    
    // Calculate percentages from absolute values
    const dpPct = scenario.homePrice > 0 ? Math.round((scenario.totalDown / scenario.homePrice) * 100) : 20;
    const marginPct = stockPortfolio > 0 ? Math.round((scenario.marginLoan / stockPortfolio) * 100) : 0;
    const helocPct = scenario.homePrice > 0 ? Math.round((scenario.helocAmount / scenario.homePrice) * 100) : 0;
    
    setManualDpPct(Math.min(100, Math.max(10, dpPct)));
    setManualMarginPct(Math.min(30, Math.max(0, marginPct)));
    setManualHelocPct(Math.min(80, Math.max(0, helocPct)));
    setActiveTab('manual');
  }, [stockPortfolio]);

  // Manual scenario calculation
  const manualScenario = useMemo(() => {
    const marginLoan = stockPortfolio * (manualMarginPct / 100);
    const totalDown = homePrice * (manualDpPct / 100);
    const cashDown = Math.max(0, totalDown - marginLoan);
    
    // HELOC only viable if buying outright (100% down)
    const canHELOC = manualDpPct >= 100 || (cashDown + marginLoan >= homePrice);
    const helocAmount = canHELOC && manualHelocPct > 0 ? homePrice * (manualHelocPct / 100) : 0;
    
    return calcScenario({
      homePrice,
      cashDown: manualDpPct >= 100 ? homePrice - marginLoan : cashDown,
      marginLoan,
      helocAmount,
      mortgageRate: mortgageRate / 100,
      loanTerm,
      appreciationRate: homeAppreciation / 100,
      investmentReturn: investmentReturn / 100,
      dividendYield: dividendYield / 100,
      monthlyRent,
      rentGrowthRate: rentGrowth / 100,
      marginRate: marginRate / 100,
      helocRate: helocRate / 100,
      fedRate,
      caRate,
      stateTax,
      stdDeduction,
      filingStatus,
      grossIncome
    });
  }, [homePrice, manualDpPct, manualMarginPct, manualHelocPct, stockPortfolio, mortgageRate, loanTerm, homeAppreciation, investmentReturn, dividendYield, monthlyRent, rentGrowth, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome]);
  
  const manualRemaining = totalSavings - manualScenario.cashDown - manualScenario.txCosts.buy + manualScenario.helocAmount;
  const canManualHELOC = manualScenario.cashDown + (stockPortfolio * manualMarginPct / 100) >= homePrice;

  // Affordability calculation (memoized)
  // Estimate effective tax rate: state tax (actual $) + approximate federal + FICA
  const estEffectiveTaxRate = useMemo(() => {
    if (grossIncome <= 0) return 0;
    const fedTax = calcFedTax(grossIncome, filingStatus);
    const fica = Math.min(grossIncome, 168600) * 0.062 // Social Security
      + grossIncome * 0.0145                             // Medicare
      + Math.max(0, grossIncome - 200000) * 0.009;       // Additional Medicare
    const caSdi = grossIncome * 0.011;                    // CA SDI (no cap since 2024)
    return Math.min(0.55, (stateTax + fedTax + fica + caSdi) / grossIncome);
  }, [grossIncome, filingStatus, stateTax]);

  const affordability = useMemo(() => calcAffordability({
    grossIncome,
    totalSavings,
    mortgageRate,
    loanTerm,
    minBuffer,
    monthlyHOA: affMonthlyHOA,
    monthlyOtherDebt: affMonthlyOtherDebt,
    monthlyRent,
    effectiveTaxRate: estEffectiveTaxRate,
    targetTakeHomePct: affTargetComfort,
  }), [grossIncome, totalSavings, mortgageRate, loanTerm, minBuffer, affMonthlyHOA, affMonthlyOtherDebt, monthlyRent, estEffectiveTaxRate, affTargetComfort]);

  const s = {
    container: { fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: 'linear-gradient(135deg, #0c1220 0%, #1a1a2e 50%, #16213e 100%)', minHeight: '100vh', color: '#e0e0e0', padding: '24px', overflowX: 'hidden', boxSizing: 'border-box' },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '2.5rem', fontWeight: '300', background: 'linear-gradient(90deg, #f97316, #eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
    grid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', maxWidth: '1800px', margin: '0 auto' },
    panel: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', height: 'fit-content', maxHeight: '90vh', overflowY: 'auto' },
    section: { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f97316', marginBottom: '16px', fontWeight: '600', marginTop: '24px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '0.85rem', color: '#b0b0c0', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' },
    select: { width: '100%', padding: '12px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' },
    slider: { width: '100%', marginTop: '8px', accentColor: '#f97316' },
    btn: { width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: '600', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '20px', background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff' },
    auto: { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    tab: { padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s ease' },
    tabActive: { background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' },
    tabInactive: { background: 'rgba(255,255,255,0.05)', color: '#8b8ba7' },
    card: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px', transition: 'border-color 0.2s ease' },
    planCard: { background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,179,8,0.1))', borderRadius: '20px', padding: '32px', border: '2px solid rgba(249,115,22,0.4)', marginBottom: '24px' },
    metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    metric: { background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '18px', textAlign: 'center' },
    metricVal: { fontSize: '1.5rem', fontWeight: '600', color: '#fff', marginBottom: '4px' },
    metricLbl: { fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase' },
    step: { display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '12px' },
    stepNum: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #eab308)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
    th: { background: 'rgba(0,0,0,0.3)', padding: '12px', textAlign: 'left', color: '#8b8ba7', fontSize: '0.7rem', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
    highlight: { background: 'rgba(249,115,22,0.1)', borderLeft: '3px solid #f97316' },
    badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', marginLeft: '8px' },
    badgeGreen: { background: 'rgba(74,222,128,0.2)', color: '#4ade80' },
    badgeYellow: { background: 'rgba(251,191,36,0.2)', color: '#fbbf24' },
    badgeRed: { background: 'rgba(248,113,113,0.2)', color: '#f87171' },
    badgePurple: { background: 'rgba(167,139,250,0.2)', color: '#a78bfa' },
    chart: { height: '320px', marginTop: '20px' },
    divider: { height: '1px', background: 'rgba(255,255,255,0.08)', margin: '20px 0' },
    costLine: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' },
    rentCompare: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', marginTop: '16px' },
    warning: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', color: '#fbbf24' },
    error: { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', color: '#f87171' }
  };

  const renderNonRecovBreakdown = (nr, rent) => (
    <div style={s.rentCompare}>
      <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '16px', marginTop: 0 }}>📊 Monthly Non-Recoverable Cost vs. Rent</h4>
      
      <div className="hpo-cost-table" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '4px 16px', fontSize: '0.85rem' }}>
        <div style={{ color: '#8b8ba7', fontWeight: '600', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Component</div>
        <div style={{ color: '#8b8ba7', fontWeight: '600', textAlign: 'right', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Annual</div>
        <div style={{ color: '#8b8ba7', fontWeight: '600', textAlign: 'right', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Monthly</div>
        
        {nr.mortgageInterest > 0 && <>
          <div style={{ color: '#f87171', padding: '6px 0' }}>🏦 Mortgage Interest</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.mortgageInterest)}</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.mortgageInterest/12)}</div>
        </>}
        
        {nr.marginInterest > 0 && <>
          <div style={{ color: '#a78bfa', padding: '6px 0' }}>📈 Margin Interest</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.marginInterest)}</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.marginInterest/12)}</div>
        </>}
        
        {nr.helocInterest > 0 && <>
          <div style={{ color: '#60a5fa', padding: '6px 0' }}>🏠 HELOC Interest</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.helocInterest)}</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.helocInterest/12)}</div>
        </>}

        {nr.cashOutInterest > 0 && <>
          <div style={{ color: '#22d3ee', padding: '6px 0' }}>💵 Cash-Out Refi Interest</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.cashOutInterest)}</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.cashOutInterest/12)}</div>
        </>}
        
        {nr.pmi > 0 && <>
          <div style={{ color: '#fbbf24', padding: '6px 0' }}>🛡️ PMI</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.pmi)}</div>
          <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.pmi/12)}</div>
        </>}
        
        <div style={{ color: '#fb923c', padding: '6px 0' }}>🏛️ Property Tax</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.propertyTax)}</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.propertyTax/12)}</div>
        
        <div style={{ color: '#ec4899', padding: '6px 0' }}>🔒 Insurance</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.insurance)}</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.insurance/12)}</div>
        
        <div style={{ color: '#14b8a6', padding: '6px 0' }}>🔧 Maintenance (1%)</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.maintenance)}</div>
        <div style={{ textAlign: 'right', padding: '6px 0' }}>{fmt$(nr.maintenance/12)}</div>
        
        <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.15)', margin: '8px 0' }} />
        
        <div style={{ fontWeight: '600', padding: '6px 0' }}>Subtotal (Gross)</div>
        <div style={{ textAlign: 'right', fontWeight: '600', padding: '6px 0' }}>{fmt$(nr.grossTotal)}</div>
        <div style={{ textAlign: 'right', fontWeight: '600', padding: '6px 0' }}>{fmt$(nr.grossTotal/12)}</div>
        
        <div style={{ color: '#4ade80', padding: '6px 0' }}>💰 Mortgage Tax Benefit</div>
        <div style={{ textAlign: 'right', color: '#4ade80', padding: '6px 0' }}>({fmt$(-nr.mortgageTaxBenefit)})</div>
        <div style={{ textAlign: 'right', color: '#4ade80', padding: '6px 0' }}>({fmt$(-nr.mortgageTaxBenefit/12)})</div>
        
        <div style={{ color: '#4ade80', padding: '6px 0' }}>💰 Investment Interest Benefit</div>
        <div style={{ textAlign: 'right', color: '#4ade80', padding: '6px 0' }}>({fmt$(-nr.investInterestTaxBenefit)})</div>
        <div style={{ textAlign: 'right', color: '#4ade80', padding: '6px 0' }}>({fmt$(-nr.investInterestTaxBenefit/12)})</div>
        
        <div style={{ gridColumn: '1 / -1', height: '2px', background: 'rgba(255,255,255,0.2)', margin: '8px 0' }} />
        
        <div style={{ fontWeight: '700', fontSize: '1rem', padding: '8px 0' }}>NET NON-RECOVERABLE</div>
        <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '1rem', padding: '8px 0' }}>{fmt$(nr.netTotal)}</div>
        <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '1rem', padding: '8px 0', color: '#fff' }}>{fmt$(nr.netTotal/12)}</div>
      </div>
      
      <div style={{ marginTop: '20px', padding: '16px', background: nr.netTotal/12 > rent ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)', borderRadius: '8px', border: nr.netTotal/12 > rent ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.3)' }}>
        <div className="hpo-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>YOUR RENT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '600' }}>{fmt$(rent)}/mo</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>OWNERSHIP COST</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '600' }}>{fmt$(nr.netTotal/12)}/mo</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>DIFFERENCE</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: nr.netTotal/12 > rent ? '#f87171' : '#4ade80' }}>
              {nr.netTotal/12 > rent ? '+' : ''}{fmt$(nr.netTotal/12 - rent)}/mo
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#b0b0c0', textAlign: 'center' }}>
          {nr.netTotal/12 > rent 
            ? `Ownership costs ${fmt$(nr.netTotal/12 - rent)} more monthly, but you build equity + get appreciation.`
            : `You pay LESS than rent AND build equity!`}
        </div>
      </div>
    </div>
  );

  // Calculate estimated monthly take-home
  const estimatedTakeHome = useMemo(() => {
    return Math.round(grossIncome * (1 - estEffectiveTaxRate) / 12);
  }, [grossIncome, estEffectiveTaxRate]);

  // Copy formatted results summary to clipboard
  const copyResultsSummary = useCallback(() => {
    const opt = optimizationResult?.optimal;
    if (!opt) return;

    const nr = opt.nonRecovBreakdown;
    const monthlyNetCost = nr.netTotal / 12;
    const takeHome = estimatedTakeHome;
    const housingPct = takeHome > 0 ? (monthlyNetCost / takeHome * 100).toFixed(0) : '?';
    const advantage10 = opt.ownerWealth10 - opt.renterWealth10;
    const comfortLabel = (pct) => {
      if (pct <= 20) return 'Excellent';
      if (pct <= 30) return 'Comfortable';
      if (pct <= 40) return 'Stretched';
      if (pct <= 50) return 'Heavy';
      return 'Extreme';
    };

    const lines = [
      `HOME PURCHASE ANALYSIS`,
      `═══════════════════════`,
      ``,
      `Home Price: ${fmt$(homePrice)}`,
      `Strategy: ${opt.strategy} (${fmtPctWhole(opt.dpPct)} down)`,
      `Down Payment: ${fmt$(opt.downPayment)}`,
      ``,
      `VERDICT: ${advantage10 > 500000 ? 'Strong Buy' : advantage10 > 100000 ? 'Buy' : advantage10 > -100000 ? 'Close Call' : advantage10 > -500000 ? 'Consider Renting' : 'Rent'}`,
      `10-Year Advantage vs Renting: ${advantage10 >= 0 ? '+' : ''}${fmt$(advantage10)}`,
      `Break-Even: ${opt.breakEvenYear === 'Never' ? 'Never' : `Year ${opt.breakEvenYear}`}`,
      ``,
      `MONTHLY COST`,
      `Net Housing Cost: ${fmt$(monthlyNetCost)}/mo`,
      `Current Rent: ${fmt$(monthlyRent)}/mo`,
      `Housing as % of Take-Home: ${housingPct}% (${comfortLabel(Number(housingPct))})`,
      ``,
      `TAX BENEFITS`,
      `Annual Tax Savings: ${fmt$(opt.totalTaxBenefit)}/yr`,
      `Effective Tax Rate: ${fmtPct(estEffectiveTaxRate)}`,
      ``,
      `ASSUMPTIONS`,
      `Mortgage Rate: ${mortgageRate}%  |  Home Appreciation: ${homeAppreciation}%`,
      `Investment Return: ${investmentReturn}%  |  Loan Term: ${loanTerm} years`,
      ``,
      `Generated by Home Purchase Optimizer`,
      typeof window !== 'undefined' ? window.location.href : '',
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    });
  }, [optimizationResult, homePrice, monthlyRent, estimatedTakeHome, estEffectiveTaxRate, mortgageRate, homeAppreciation, investmentReturn, loanTerm]);

  // Copy affordability summary to clipboard
  const copyAffordabilitySummary = useCallback(() => {
    const { options, monthlyTakeHome: mth } = affordability;
    const best = options.find(o => o.dpPct === 0.20 && o.remaining >= 0 && o.maxPrice > 0)
      || options.find(o => o.remaining >= 0 && o.maxPrice > 0);
    if (!best) return;
    const comfortLabel = (pct) => {
      if (pct <= 0.20) return 'Excellent';
      if (pct <= 0.30) return 'Comfortable';
      if (pct <= 0.40) return 'Stretched';
      if (pct <= 0.50) return 'Heavy';
      return 'Unsustainable';
    };
    const lines = [
      `HOME AFFORDABILITY ANALYSIS`,
      `═══════════════════════════`,
      ``,
      `Recommended Price: ${fmt$(best.maxPrice)} (${fmtPctWhole(best.dpPct * 100)} down)`,
      `Monthly Payment: ${fmt$(best.monthlyPITI)}/mo`,
      `Comfort Level: ${comfortLabel(best.takeHomePct)} (${fmtPctWhole(best.takeHomePct * 100)} of take-home)`,
      `Cash Needed: ${fmt$(best.cashNeeded)}  |  Remaining: ${fmt$(best.remaining)}`,
      `Limited By: ${best.limitedBy === 'income' ? 'Income (DTI)' : 'Savings'}`,
      ``,
      `ALL OPTIONS`,
      ...options.filter(o => o.maxPrice > 0).map(o =>
        `  ${fmtPctWhole(o.dpPct * 100)} down → ${fmt$(o.maxPrice)} (${fmt$(o.monthlyPITI)}/mo, ${comfortLabel(o.takeHomePct)})`
      ),
      ``,
      `YOUR NUMBERS`,
      `Gross Income: ${fmt$(grossIncome)}  |  Take-Home: ~${fmt$(mth)}/mo`,
      `Savings: ${fmt$(totalSavings)}  |  Mortgage Rate: ${mortgageRate}%`,
      ``,
      `Generated by Home Purchase Optimizer`,
      typeof window !== 'undefined' ? window.location.href : '',
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setAffordCopied(true);
      setTimeout(() => setAffordCopied(false), 2000);
    });
  }, [affordability, grossIncome, totalSavings, mortgageRate]);

  // Feature 1: Total Wealth Impact Summary
  const renderWealthImpactSummary = (opt) => {
    if (!opt?.yearlyAnalysis) return null;

    const years = [10, 20, 30];
    const yearData = years.map(y => {
      const data = opt.yearlyAnalysis[y - 1];
      if (!data) return null;
      return {
        year: y,
        ownerWealth: data.ownerWealth,
        renterWealth: data.renterWealth,
        advantage: data.advantage,
        buyWins: data.ownerWealth >= data.renterWealth
      };
    }).filter(Boolean);

    if (yearData.length === 0) return null;

    // Get the interpretation text
    const getInterpretation = () => {
      const y10 = yearData.find(d => d.year === 10);
      if (!y10) return null;

      if (y10.buyWins) {
        return `At year 10, buying this home puts you ${fmt$(Math.abs(y10.advantage))} ahead compared to renting and investing your down payment.`;
      } else {
        return `At year 10, renting and investing would leave you ${fmt$(Math.abs(y10.advantage))} ahead. See the Holding Period tab for what would change this.`;
      }
    };

    return (
      <div className="hpo-card" style={{ ...s.card, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.08))', border: '2px solid rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '1.5rem' }}>📊</div>
          <div>
            <h3 style={{ ...s.section, marginTop: 0, marginBottom: '4px' }}>Total Wealth Impact</h3>
            <p style={{ margin: 0, color: '#8b8ba7', fontSize: '0.85rem' }}>Buy vs. Rent + Invest Comparison</p>
          </div>
        </div>

        {/* Year 10/20/30 Comparison Cards */}
        <div className="hpo-three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          {yearData.map(d => (
            <div
              key={d.year}
              style={{
                background: d.buyWins ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                border: d.buyWins ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(248,113,113,0.3)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '12px' }}>Year {d.year}</div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginBottom: '2px' }}>If You Buy</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{fmt$(d.ownerWealth)}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginBottom: '2px' }}>If You Rent + Invest</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{fmt$(d.renterWealth)}</div>
              </div>

              <div style={{
                background: d.buyWins ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)',
                borderRadius: '8px',
                padding: '8px',
                marginTop: '8px'
              }}>
                <div style={{ fontSize: '0.7rem', color: d.buyWins ? '#4ade80' : '#f87171', marginBottom: '2px' }}>
                  {d.buyWins ? 'Buying Ahead By' : 'Renting Ahead By'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: d.buyWins ? '#4ade80' : '#f87171' }}>
                  {fmt$(Math.abs(d.advantage))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plain English Interpretation */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <p style={{ margin: 0, color: '#d0d0e0', fontSize: '0.9rem', lineHeight: '1.6' }}>
            💡 {getInterpretation()}
          </p>
        </div>

        {/* Expandable Methodology Info */}
        <InfoBox
          title="How is this calculated?"
          isOpen={openInfoBoxes['wealthMethodology']}
          onToggle={() => toggleInfo('wealthMethodology')}
        >
          <p><strong>Owner wealth:</strong> Home equity (home value minus remaining mortgage) minus estimated selling costs (realtor fees, transfer taxes, closing costs ~5-6%).</p>
          <p style={{marginTop: '10px'}}><strong>Renter wealth:</strong> What you'd have if you invested the down payment + closing costs instead of buying. Compounds at {investmentReturn}% annually{opt.breakEvenSensitivity?.subjectToNIIT ? ', reduced by 3.8% NIIT' : ''}. If renting is cheaper than owning each year, those savings are added to the portfolio.</p>
          <p style={{marginTop: '10px'}}><strong>Key assumptions:</strong> {homeAppreciation}% home appreciation, {investmentReturn}% investment returns, 3% annual rent increases, Prop 13 property tax growth cap.</p>
        </InfoBox>
      </div>
    );
  };

  // Feature 2: Monthly Cash Flow Impact with Payment Timing
  const renderMonthlyCashFlow = (opt) => {
    if (!opt) return null;

    const nr = opt.nonRecovBreakdown;
    const takeHome = estimatedTakeHome;

    // Monthly housing cost breakdown
    const monthlyPI = opt.monthlyPayment || 0; // P&I + PMI
    const monthlyPropTax = nr.propertyTax / 12;
    const monthlyInsurance = nr.insurance / 12;
    const monthlyMaintenance = nr.maintenance / 12;
    const monthlyMarginInt = nr.marginInterest / 12;
    const monthlyHelocInt = nr.helocInterest / 12;
    const monthlyCashOutInt = nr.cashOutInterest / 12;
    const monthlyTaxBenefit = opt.totalTaxBenefit / 12;

    const grossMonthlyHousing = monthlyPI + monthlyPropTax + monthlyInsurance + monthlyMaintenance + monthlyMarginInt + monthlyHelocInt + monthlyCashOutInt;
    const netMonthlyHousing = grossMonthlyHousing - monthlyTaxBenefit;

    // Cash flow comparison
    const currentCashFlow = takeHome - monthlyRent;
    const afterPurchaseCashFlow = takeHome - netMonthlyHousing;
    const cashFlowChange = afterPurchaseCashFlow - currentCashFlow;

    // Warning threshold: less than 20% of take-home remaining
    const remainingPct = afterPurchaseCashFlow / takeHome;
    const showWarning = remainingPct < 0.20;

    // Annual amounts for timing calendar
    const annualPropTax = nr.propertyTax;
    const annualInsurance = nr.insurance;
    const annualTaxBenefit = opt.totalTaxBenefit;

    return (
      <div className="hpo-card" style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '1.5rem' }}>💵</div>
          <div>
            <h3 style={{ ...s.section, marginTop: 0, marginBottom: '4px' }}>Monthly Cash Flow Impact</h3>
            <p style={{ margin: 0, color: '#8b8ba7', fontSize: '0.85rem' }}>How this purchase affects your family budget</p>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="hpo-cash-flow-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Current Situation */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '12px' }}>Current (Renting)</div>
            <div style={s.costLine}><span>Monthly Take-Home</span><span>{fmt$(takeHome)}</span></div>
            <div style={s.costLine}><span style={{ color: '#f87171' }}>- Monthly Rent</span><span style={{ color: '#f87171' }}>({fmt$(monthlyRent)})</span></div>
            <div style={{ ...s.costLine, fontWeight: '600', borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: '10px', marginTop: '8px' }}>
              <span>Remaining Cash Flow</span>
              <span style={{ color: '#4ade80' }}>{fmt$(currentCashFlow)}</span>
            </div>
          </div>

          {/* After Purchase */}
          <div style={{ background: 'rgba(249,115,22,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(249,115,22,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#fb923c', textTransform: 'uppercase', marginBottom: '12px' }}>After Purchase</div>
            <div style={s.costLine}><span>Monthly Take-Home</span><span>{fmt$(takeHome)}</span></div>
            <div style={s.costLine}><span style={{ color: '#f87171' }}>- Net Housing Cost</span><span style={{ color: '#f87171' }}>({fmt$(netMonthlyHousing)})</span></div>
            <div style={{ ...s.costLine, fontWeight: '600', borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: '10px', marginTop: '8px' }}>
              <span>Remaining Cash Flow</span>
              <span style={{ color: afterPurchaseCashFlow > 0 ? '#4ade80' : '#f87171' }}>{fmt$(afterPurchaseCashFlow)}</span>
            </div>
          </div>
        </div>

        {/* Cash Flow Change Callout */}
        <div style={{
          background: cashFlowChange >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
          border: cashFlowChange >= 0 ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(248,113,113,0.3)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '4px' }}>
            Your monthly free cash flow {cashFlowChange >= 0 ? 'increases' : 'decreases'} by
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: cashFlowChange >= 0 ? '#4ade80' : '#f87171' }}>
            {fmt$(Math.abs(cashFlowChange))}/month
          </div>
          <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '4px' }}>
            ({fmt$(Math.abs(cashFlowChange) * 12)}/year)
          </div>
        </div>

        {/* Opportunity Cost Note */}
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '1.2rem' }}>💰</div>
          <div style={{ fontSize: '0.82rem', color: '#d0d0e0', lineHeight: '1.5' }}>
            <strong style={{ color: '#fb923c' }}>Hidden cost:</strong> Your {fmt$(opt.totalDown)} down payment could earn ~{fmt$(opt.totalDown * (investmentReturn / 100))}/yr ({investmentReturn}% return) if invested instead. The optimizer accounts for this when comparing buying vs renting.
          </div>
        </div>

        {/* Payment Timing Calendar */}
        <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(139,92,246,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <div style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: '600' }}>Payment Timing Calendar</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginBottom: '16px' }}>
            Plan your family budget around when each expense actually hits your bank account
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {/* Monthly Payments */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#4ade80', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Every Month</span>
                </div>
                <span style={{ color: '#4ade80', fontWeight: '700' }}>{fmt$(monthlyPI)}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', paddingLeft: '16px' }}>
                Mortgage P&I{opt.pmi?.monthly > 0 ? ' + PMI' : ''} - due 1st of each month
              </div>
            </div>

            {/* Semi-Annual: Property Tax (SF pays twice per year) */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#fbbf24', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Twice Per Year</span>
                </div>
                <span style={{ color: '#fbbf24', fontWeight: '700' }}>{fmt$(annualPropTax / 2)} each</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', paddingLeft: '16px' }}>
                Property Tax - due <strong>Dec 10</strong> (1st installment) and <strong>Apr 10</strong> (2nd installment)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingLeft: '16px', marginTop: '4px' }}>
                Total annual: {fmt$(annualPropTax)} | Monthly reserve needed: {fmt$(annualPropTax / 12)}
              </div>
            </div>

            {/* Annual: Insurance */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#60a5fa', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Once Per Year</span>
                </div>
                <span style={{ color: '#60a5fa', fontWeight: '700' }}>{fmt$(annualInsurance)}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', paddingLeft: '16px' }}>
                Homeowners Insurance - typically due on purchase anniversary
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingLeft: '16px', marginTop: '4px' }}>
                Monthly reserve needed: {fmt$(annualInsurance / 12)}
              </div>
            </div>

            {/* Tax Refund */}
            <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#22c55e', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Tax Season (April)</span>
                </div>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>+{fmt$(annualTaxBenefit)}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', paddingLeft: '16px' }}>
                Tax savings from mortgage interest & property tax deductions
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingLeft: '16px', marginTop: '4px' }}>
                Tip: Adjust W-4 withholding to get this monthly instead of waiting for refund
              </div>
            </div>
          </div>

          {/* High-expense months warning */}
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600', marginBottom: '6px' }}>
              High-Expense Months to Plan For
            </div>
            <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#d0d0e0' }}>
              <div><strong>December:</strong> P&I + Property Tax = {fmt$(monthlyPI + annualPropTax / 2)}</div>
              <div><strong>April:</strong> P&I + Property Tax = {fmt$(monthlyPI + annualPropTax / 2)}</div>
            </div>
          </div>
        </div>

        {/* Detailed Monthly Breakdown */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#8b8ba7', fontWeight: '600', marginBottom: '12px' }}>Monthly Housing Cost Breakdown (Averaged)</div>

          <div style={s.costLine}><span>Principal & Interest (+ PMI)</span><span>{fmt$(monthlyPI)}</span></div>
          <div style={s.costLine}><span>Property Tax (averaged)</span><span>{fmt$(monthlyPropTax)}</span></div>
          <div style={s.costLine}><span>Homeowners Insurance (averaged)</span><span>{fmt$(monthlyInsurance)}</span></div>
          <div style={s.costLine}><span>Maintenance Reserve (1%/yr)</span><span>{fmt$(monthlyMaintenance)}</span></div>
          {monthlyMarginInt > 0 && <div style={s.costLine}><span>Margin Interest</span><span>{fmt$(monthlyMarginInt)}</span></div>}
          {monthlyHelocInt > 0 && <div style={s.costLine}><span>HELOC Interest</span><span>{fmt$(monthlyHelocInt)}</span></div>}
          {monthlyCashOutInt > 0 && <div style={s.costLine}><span>Cash-Out Refi Interest</span><span>{fmt$(monthlyCashOutInt)}</span></div>}

          <div style={{ ...s.costLine, fontWeight: '600', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
            <span>Gross Monthly Housing</span><span>{fmt$(grossMonthlyHousing)}</span>
          </div>

          <div style={s.costLine}><span style={{ color: '#4ade80' }}>Tax Benefit (averaged)</span><span style={{ color: '#4ade80' }}>-{fmt$(monthlyTaxBenefit)}</span></div>

          <div style={{ ...s.costLine, fontWeight: '700', fontSize: '1rem', borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: '10px', marginTop: '8px' }}>
            <span>Net Monthly Housing Cost</span><span style={{ color: '#fff' }}>{fmt$(netMonthlyHousing)}</span>
          </div>
        </div>

        {/* Warning if cash flow is tight */}
        {showWarning && (
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <div style={{ color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>Cash Flow Warning</div>
                <div style={{ color: '#d0d0e0', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  After this purchase, only {fmtPctWhole(remainingPct * 100)} of your take-home pay remains for other expenses.
                  Financial advisors typically recommend keeping at least 20% for savings and unexpected costs.
                  Consider a lower purchase price or higher down payment for more breathing room.
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#8b8ba7', fontStyle: 'italic' }}>
          * Take-home pay estimated from gross income at ~{fmtPctWhole((1 - combRate * 0.7) * 100)} take-home rate
        </div>
      </div>
    );
  };

  const renderOptimize = () => {
    const opt = optimizationResult?.optimal;
    const top5 = optimizationResult?.topFive || [];
    const diag = optimizationResult?.diagnostics;
    
    if (!opt) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div className="hpo-verdict-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>🏠</div>
          <h2 className="hpo-section-title" style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: '16px', color: '#fff' }}>Find Your Best Purchase Strategy</h2>
          <p style={{ color: '#c0c0d0', marginBottom: '24px', maxWidth: '550px', margin: '0 auto 24px', lineHeight: '1.7' }}>
            The optimizer tests hundreds of combinations of down payment amounts, margin loans, HELOCs, and mortgage structures to find the strategy that <strong style={{ color: '#4ade80' }}>maximizes your 10-year wealth</strong> while managing risk.
          </p>
          <div className="hpo-preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '500px', margin: '0 auto 28px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>Home Price</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{fmt$(homePrice)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>Available Cash</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{fmt$(totalSavings)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Rent</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{fmt$(monthlyRent)}/mo</div>
            </div>
          </div>
          <button style={{ ...s.btn, width: 'auto', padding: '16px 48px' }} onClick={handleOptimize}>🚀 Run Optimization</button>
          <p style={{ color: '#8b8ba7', fontSize: '0.78rem', marginTop: '12px' }}>
            Not sure about the home price? Start with the <button onClick={() => setActiveTab('afford')} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}>What Can I Buy?</button> tab first.
          </p>
        </div>
      );
    }
    
    // Generate recommendation explanation
    const getRecommendationExplanation = () => {
      const reasons = [];
      const risks = [];
      const deductionNotes = [];

      if (opt.strategy === 'Traditional') {
        reasons.push('Simple, low-risk approach with predictable payments');
        reasons.push(`Your ${fmtPctWhole(opt.dpPct)} down payment avoids PMI concerns`);
        // Be specific about mortgage deduction limits
        if (opt.shouldItemize) {
          if (opt.acquisitionDebt > 750000) {
            reasons.push(`Mortgage interest deduction: Only ${fmt$(750000)} of your ${fmt$(opt.acquisitionDebt)} mortgage is federally deductible (CA allows ${fmt$(Math.min(opt.acquisitionDebt, 1000000))})`);
            deductionNotes.push(`You lose ${fmt$(opt.nonDeductibleMortgageInterest)}/yr in non-deductible interest (federal)`);
          } else {
            reasons.push('Full mortgage interest is deductible (under $750K limit)');
          }
        }
        risks.push('Opportunity cost: cash tied up in home equity could earn returns elsewhere');
      } else if (opt.strategy.includes('Margin')) {
        reasons.push('Preserves cash liquidity while achieving desired down payment');
        // Clarify margin deductibility
        if (opt.deductibleMarginInterest > 0) {
          reasons.push(`Margin interest (${fmt$(opt.marginInterestAnnual)}/yr) deductible up to ${fmt$(opt.totalDeductibleInvestmentIncome)} investment income`);
        } else {
          deductionNotes.push('Margin interest for home purchase is NOT deductible (interest tracing rules)');
        }
        reasons.push(`Effective margin rate after tax: ${fmtPct(opt.marginEffectiveRate)}`);
        risks.push(`Margin call risk if portfolio drops significantly (keep utilization under 25%)`);
        risks.push('Variable margin rates could increase');
      } else if (opt.strategy.includes('HELOC')) {
        reasons.push('Interest tracing: HELOC proceeds invested = investment interest (deductible)');
        reasons.push(`Blended effective rate ${fmtPct(opt.blendedEffectiveRate)} is lower than mortgage rate`);
        reasons.push('Extracted equity can compound in investments');
        // Deduction limit note
        if (opt.deductibleHELOCInterest < opt.helocInterestAnnual) {
          deductionNotes.push(`Only ${fmt$(opt.deductibleHELOCInterest)} of ${fmt$(opt.helocInterestAnnual)} HELOC interest deductible (limited by investment income)`);
        }
        risks.push('HELOC has variable rate - could increase over time');
        risks.push('Requires disciplined investing of HELOC proceeds');
      } else if (opt.strategy.includes('Cash-Out Refi')) {
        reasons.push('Fixed rate cash-out refi is more stable than variable HELOC');
        reasons.push('Extracted equity portion qualifies for investment interest deduction');
        reasons.push(`Cash-out proceeds can be invested to potentially outpace the ${fmtPct(cashOutRefiRate/100)} rate`);
        // Be specific about which portion is deductible
        deductionNotes.push(`Original mortgage (${fmt$(opt.acquisitionDebt)}): up to $750K federally deductible`);
        deductionNotes.push(`Cash-out portion (${fmt$(opt.cashOutRefiAmount)}): deductible as investment interest if invested`);
        risks.push('Higher closing costs than HELOC');
        risks.push('Entire loan is at refi rate (no benefit from lower original mortgage)');
      }

      // Common reasons based on metrics
      if (opt.breakEvenYear !== 'Never' && opt.breakEvenYear <= 5) {
        reasons.push(`Quick break-even in year ${opt.breakEvenYear} vs renting`);
      }
      if (opt.nonRecovBreakdown.netTotal/12 < monthlyRent) {
        reasons.push(`Monthly cost (${fmt$(opt.nonRecovBreakdown.netTotal/12)}) is LESS than rent (${fmt$(monthlyRent)})`);
      }

      // NIIT warning
      if (opt.breakEvenSensitivity?.subjectToNIIT) {
        deductionNotes.push(`Subject to 3.8% NIIT on investment income (reduces renter's effective returns)`);
      }

      return { reasons, risks, deductionNotes };
    };

    const { reasons, risks, deductionNotes } = getRecommendationExplanation();

    // Quick verdict calculations
    const advantage10 = opt.yearlyAnalysis?.[9]?.advantage || 0;
    const advantage20 = opt.yearlyAnalysis?.[19]?.advantage || 0;
    const buyWins = advantage10 > 0;
    const monthlyNetCost = opt.nonRecovBreakdown.netTotal / 12;
    const monthlyVsRent = monthlyNetCost - monthlyRent;

    // Affordability relative to take-home
    const housingPctOfTakeHome = estimatedTakeHome > 0 ? monthlyNetCost / estimatedTakeHome : 0;
    const getComfort = (pct) => {
      if (pct <= 0.20) return { label: 'Excellent', color: '#4ade80', desc: 'Well below guidelines — ample savings room' };
      if (pct <= 0.30) return { label: 'Comfortable', color: '#60a5fa', desc: 'Within guidelines — solid financial balance' };
      if (pct <= 0.40) return { label: 'Stretched', color: '#fbbf24', desc: 'Manageable but limits other financial goals' };
      if (pct <= 0.50) return { label: 'Heavy', color: '#f97316', desc: 'Housing-burdened — most budgets feel tight here' };
      return { label: 'Unsustainable', color: '#f87171', desc: 'Majority of paycheck to housing — high financial stress' };
    };
    const comfort = getComfort(housingPctOfTakeHome);

    // Opportunity cost of down payment
    const annualOpportunityCost = opt.totalDown * (investmentReturn / 100);

    // Generate verdict
    const getVerdict = () => {
      if (advantage10 > 500000) return { emoji: '🎯', verdict: 'Strong Buy', color: '#22c55e', desc: 'Buying clearly wins financially' };
      if (advantage10 > 100000) return { emoji: '✅', verdict: 'Buy', color: '#4ade80', desc: 'Buying is the better choice' };
      if (advantage10 > -100000) return { emoji: '⚖️', verdict: 'Close Call', color: '#fbbf24', desc: 'Similar outcomes either way' };
      if (advantage10 > -500000) return { emoji: '🤔', verdict: 'Consider Renting', color: '#fb923c', desc: 'Renting may be better financially' };
      return { emoji: '🏃', verdict: 'Rent', color: '#f87171', desc: 'Renting is significantly better' };
    };

    const verdict = getVerdict();

    return (
      <>
        {/* QUICK VERDICT - The Answer at a Glance */}
        <div style={{
          background: `linear-gradient(135deg, ${verdict.color}15, ${verdict.color}08)`,
          borderRadius: '20px',
          padding: '24px',
          border: `2px solid ${verdict.color}50`,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div className="hpo-verdict-emoji" style={{ fontSize: '3rem', marginBottom: '8px' }}>{verdict.emoji}</div>
          <div className="hpo-verdict-text" style={{ fontSize: '2rem', fontWeight: '700', color: verdict.color, marginBottom: '4px' }}>{verdict.verdict}</div>
          <div style={{ fontSize: '1rem', color: '#c0c0d0', marginBottom: '16px' }}>{verdict.desc}</div>

          <div className="hpo-verdict-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>10-Year Advantage</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: advantage10 >= 0 ? '#4ade80' : '#f87171' }}>
                {advantage10 >= 0 ? '+' : ''}{fmt$(advantage10)}
              </div>
              <div style={{ fontSize: '0.55rem', color: '#666', marginTop: '3px' }}>Wealth gap: buying vs renting</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>Monthly vs Rent</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: monthlyVsRent <= 0 ? '#4ade80' : '#f87171' }}>
                {monthlyVsRent > 0 ? '+' : ''}{fmt$(monthlyVsRent)}
              </div>
              <div style={{ fontSize: '0.55rem', color: '#666', marginTop: '3px' }}>{monthlyVsRent > 0 ? 'More' : 'Less'} than current rent</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>Break-Even</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                {opt.breakEvenYear === 'Never' ? 'Never' : `Year ${opt.breakEvenYear}`}
              </div>
              <div style={{ fontSize: '0.55rem', color: '#666', marginTop: '3px' }}>When buying beats renting</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>Tax Savings</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#4ade80' }}>
                {fmt$(opt.totalTaxBenefit)}/yr
              </div>
              <div style={{ fontSize: '0.55rem', color: '#666', marginTop: '3px' }}>From mortgage deductions</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>Opportunity Cost</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fb923c' }}>
                {fmt$(annualOpportunityCost)}/yr
              </div>
              <div style={{ fontSize: '0.55rem', color: '#666', marginTop: '3px' }}>{fmt$(opt.totalDown)} if invested</div>
            </div>
          </div>
          
          {/* CTA: Use This Strategy */}
          <button
            className="hpo-cta-btn"
            onClick={() => applyScenarioToManual(opt)}
            style={{
              marginTop: '20px',
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            ✨ Use This Strategy → Customize in Manual Tab
          </button>

          {/* Share buttons */}
          <div className="hpo-share-btns" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
            <button
              onClick={copyResultsSummary}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: '500', transition: 'all 0.2s',
                background: summaryCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
                color: summaryCopied ? '#4ade80' : '#8b8ba7',
                border: summaryCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {summaryCopied ? '✓ Copied!' : '📋 Copy Summary'}
            </button>
            <button
              onClick={copyShareLink}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: '500', transition: 'all 0.2s',
                background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
                color: linkCopied ? '#4ade80' : '#8b8ba7',
                border: linkCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {linkCopied ? '✓ Copied!' : '🔗 Share Link'}
            </button>
          </div>
        </div>

        {/* AFFORDABILITY INDICATOR */}
        <div className="hpo-affordability-indicator" style={{
          background: `linear-gradient(135deg, ${comfort.color}15, ${comfort.color}08)`,
          borderRadius: '16px', padding: '20px 24px', border: `2px solid ${comfort.color}40`, marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '20px',
        }}>
          <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: '80px' }}>
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Housing Cost</div>
            <div className="hpo-hero-price" style={{ fontSize: '2.2rem', fontWeight: '700', color: comfort.color }}>{fmtPctWhole(housingPctOfTakeHome * 100)}</div>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7' }}>of take-home</div>
          </div>
          <div style={{ flex: '1 1 auto', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ padding: '4px 12px', borderRadius: '6px', background: `${comfort.color}30`, border: `1px solid ${comfort.color}`, fontSize: '0.85rem', fontWeight: '700', color: comfort.color }}>{comfort.label}</div>
              <span style={{ fontSize: '0.82rem', color: '#c0c0d0' }}>{comfort.desc}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#8b8ba7', lineHeight: '1.6' }}>
              {fmt$(monthlyNetCost)}/mo housing vs {fmt$(estimatedTakeHome)}/mo take-home.
              {housingPctOfTakeHome <= 0.30 && ' You have good financial flexibility beyond housing.'}
              {housingPctOfTakeHome > 0.30 && housingPctOfTakeHome <= 0.50 && ' Consider how this fits with your other financial goals.'}
              {housingPctOfTakeHome > 0.50 && ' This is a significant portion of your budget.'}
            </div>
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <div style={{ height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, housingPctOfTakeHome * 100)}%`, borderRadius: '6px', background: comfort.color, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.55rem', color: '#666' }}>0%</span>
              <span style={{ fontSize: '0.55rem', color: '#666' }}>50%</span>
              <span style={{ fontSize: '0.55rem', color: '#666' }}>100%</span>
            </div>
          </div>
        </div>

        {/* Cross-tab navigation */}
        {isExpertMode ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('holding')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}>
              See year-by-year breakdown →
            </button>
            <button onClick={() => setActiveTab('sensitivity')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}>
              Test sensitivity to assumptions →
            </button>
            <button onClick={() => setActiveTab('tax')} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}>
              View tax details →
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => setIsExpertMode(true)}
              style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
            >
              Switch to Expert Mode for year-by-year analysis, sensitivity testing, and tax breakdown →
            </button>
          </div>
        )}

        {/* Diagnostics - why certain strategies may not appear */}
        {diag && !optimizationResult.canBuyCash && (
          <div style={s.warning}>
            <strong>⚠️ HELOC strategies not viable:</strong> You need {fmt$(homePrice)} to buy cash, but only have {fmt$(diag.totalAvailable)} (savings + max margin). Gap: {fmt$(diag.gap)}
          </div>
        )}

        {/* Show/Hide Details Toggle */}
        <button
          onClick={() => setShowOptimizeDetails(!showOptimizeDetails)}
          style={{
            width: '100%',
            padding: '16px 24px',
            marginBottom: '24px',
            background: showOptimizeDetails ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(168,85,247,0.2))',
            border: '2px solid rgba(139,92,246,0.5)',
            borderRadius: '12px',
            color: '#a78bfa',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
          }}
        >
          {showOptimizeDetails ? '📊 Hide Full Analysis' : '📊 Show Full Analysis'}
          <span style={{ fontSize: '0.8rem', color: '#8b8ba7' }}>
            {showOptimizeDetails ? '▲' : '▼'} Strategy details, action plan, wealth projections
          </span>
        </button>

        {/* Detailed Analysis Section - Collapsed by Default */}
        {showOptimizeDetails && (
        <>
        {/* Recommendation Summary Box */}
        <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))', borderRadius: '20px', padding: '28px', border: '2px solid rgba(34,197,94,0.4)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '2rem' }}>✨</div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>Recommended Strategy</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', margin: '4px 0 0 0' }}>{opt.strategy}</h2>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '600', marginBottom: '10px' }}>Why This Strategy?</div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d0e0', fontSize: '0.9rem', lineHeight: '1.8' }}>
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          {risks.length > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '16px', marginBottom: deductionNotes.length > 0 ? '16px' : 0 }}>
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600', marginBottom: '8px' }}>⚠️ Risk Factors to Consider</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d0e0', fontSize: '0.85rem', lineHeight: '1.7' }}>
                {risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {deductionNotes.length > 0 && (
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: '600', marginBottom: '8px' }}>📋 Deduction Limits & Tax Notes</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d0e0', fontSize: '0.85rem', lineHeight: '1.7' }}>
                {deductionNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* DOWNSIDE RISK VISUALIZATION */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(248,113,113,0.1), rgba(239,68,68,0.05))',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid rgba(248,113,113,0.3)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ color: '#f87171', fontWeight: '600', fontSize: '1rem' }}>Downside Scenario Analysis</div>
              <div style={{ color: '#8b8ba7', fontSize: '0.8rem' }}>What if things go wrong?</div>
            </div>
          </div>

          <div className="hpo-risk-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.7rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '6px' }}>Portfolio -20%</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f87171' }}>{fmt$(stockPortfolio * 0.8)}</div>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginTop: '4px' }}>Loss: {fmt$(stockPortfolio * 0.2)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.7rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '6px' }}>Home 0% Growth (5yr)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fbbf24' }}>{fmt$(homePrice)}</div>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginTop: '4px' }}>vs {fmt$(homePrice * Math.pow(1.05, 5))} at 5%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.7rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '6px' }}>Rates +200bps</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fb923c' }}>{(mortgageRate + 2).toFixed(1)}%</div>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginTop: '4px' }}>HELOC: {(helocRate + 2).toFixed(1)}%</div>
            </div>
          </div>

          {opt.marginLoan > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid rgba(248,113,113,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>📉</span>
                <span style={{ color: '#f87171', fontWeight: '600', fontSize: '0.9rem' }}>Margin Call Risk</span>
              </div>
              <div className="hpo-margin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#8b8ba7', marginBottom: '2px' }}>Current Margin Used</div>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{fmtPctWhole((opt.marginLoan / stockPortfolio) * 100)} ({fmt$(opt.marginLoan)})</div>
                </div>
                <div>
                  <div style={{ color: '#8b8ba7', marginBottom: '2px' }}>Margin Call Threshold</div>
                  <div style={{ color: '#fbbf24', fontWeight: '500' }}>~30% of portfolio</div>
                </div>
                <div>
                  <div style={{ color: '#8b8ba7', marginBottom: '2px' }}>Portfolio Drop to Trigger</div>
                  <div style={{ color: '#f87171', fontWeight: '500' }}>
                    {stockPortfolio * 0.3 > opt.marginLoan
                      ? `>${fmtPctWhole(((stockPortfolio - (opt.marginLoan / 0.3)) / stockPortfolio) * 100)} drop`
                      : 'Already at risk!'
                    }
                  </div>
                </div>
              </div>
              {stockPortfolio * 0.3 > opt.marginLoan && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#d0d0e0' }}>
                  Keep ~{fmt$(opt.marginLoan * 0.3)} in cash reserves to cover potential margin calls
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.85rem', color: '#8b8ba7', fontWeight: '600', marginBottom: '10px' }}>Downside Comparison: Buy vs Rent</div>
            <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: '#f87171', fontWeight: '500', marginBottom: '6px' }}>If You Buy (Downside)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#c0c0d0', fontSize: '0.8rem', lineHeight: '1.6' }}>
                  <li>Underwater mortgage if home drops 20%+</li>
                  <li>Can't easily move for job opportunities</li>
                  <li>Maintenance costs don't go away</li>
                  {opt.marginLoan > 0 && <li>Margin call risk if market tanks</li>}
                </ul>
              </div>
              <div>
                <div style={{ color: '#60a5fa', fontWeight: '500', marginBottom: '6px' }}>If You Rent (Downside)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#c0c0d0', fontSize: '0.8rem', lineHeight: '1.6' }}>
                  <li>Portfolio drops 20% = {fmt$(stockPortfolio * 0.2)} loss</li>
                  <li>Rent increases ({rentGrowth}%/yr compounds)</li>
                  <li>Landlord could sell/evict you</li>
                  <li>No equity building</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#8b8ba7', fontStyle: 'italic' }}>
            Both paths have risks. Buying locks in housing costs but ties up capital. Renting maintains flexibility but exposes you to rent increases.
          </div>
        </div>

        <div className="hpo-plan-card" style={s.planCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Recommended Strategy</div>
              <h2 className="hpo-section-title" style={{ fontSize: '1.8rem', fontWeight: '600', color: '#fff', margin: 0 }}>{opt.strategy}</h2>
              <p style={{ color: '#d0d0e0', marginTop: '8px', fontSize: '0.95rem' }}>{opt.strategyDesc}</p>
            </div>
            <div style={{ ...s.badge, ...(opt.riskLevel === 'Low' ? s.badgeGreen : opt.riskLevel === 'Medium' ? s.badgeYellow : s.badgeRed), fontSize: '0.8rem', padding: '6px 14px' }}>
              {opt.riskLevel} Risk
            </div>
          </div>
          
          <div className="hpo-metrics" style={s.metrics}>
            <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.totalDown)}</div><div style={s.metricLbl}>Total Down ({fmtPctWhole(opt.dpPct)})</div></div>
            <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.monthlyPayment)}</div><div style={s.metricLbl}>Monthly P&I + PMI</div></div>
            <div style={s.metric}><div style={{ ...s.metricVal, color: '#4ade80' }}>{fmtPct(opt.blendedEffectiveRate)}</div><div style={s.metricLbl}>Blended Eff. Rate</div></div>
            <div style={s.metric}><div style={s.metricVal}>{opt.breakEvenYear}</div><div style={s.metricLbl}>Break-even Year</div></div>
          </div>
          
          <div style={s.divider} />
          
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>📋 Action Plan</h3>
          
          {opt.cashDown > 0 && (
            <div style={s.step}>
              <div style={s.stepNum}>1</div>
              <div>
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Use {fmt$(opt.cashDown)} from savings</div>
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>Leaves {fmt$(opt.remaining)} buffer ({(opt.remaining / (grossIncome / 12)).toFixed(1)} months income)</div>
              </div>
            </div>
          )}
          
          {opt.marginLoan > 0 && (
            <div style={s.step}>
              <div style={s.stepNum}>{opt.cashDown > 0 ? '2' : '1'}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Borrow {fmt$(opt.marginLoan)} via margin loan</div>
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>
                  {fmtPct(opt.marginLoan / stockPortfolio)} of portfolio at {marginRate}%. 
                  Effective rate after tax: {fmtPct(opt.marginEffectiveRate)}
                </div>
              </div>
            </div>
          )}
          
          {opt.mortgageLoan > 0 && (
            <div style={s.step}>
              <div style={s.stepNum}>{(opt.cashDown > 0 ? 1 : 0) + (opt.marginLoan > 0 ? 1 : 0) + 1}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Get {fmt$(opt.mortgageLoan)} mortgage at {mortgageRate}%</div>
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>
                  Effective rate: {fmtPct(opt.mortgageEffectiveRate)}. 
                  {opt.mortgageLoan > 750000 ? ` Only $750K qualifies for deduction.` : ''}
                </div>
              </div>
            </div>
          )}
          
          {opt.helocAmount > 0 && (
            <div style={s.step}>
              <div style={s.stepNum}>{(opt.cashDown > 0 ? 1 : 0) + (opt.marginLoan > 0 ? 1 : 0) + (opt.mortgageLoan > 0 ? 1 : 0) + 1}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Take {fmt$(opt.helocAmount)} HELOC → invest proceeds</div>
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>
                  Effective rate after tax: {fmtPct(opt.helocEffectiveRate)}. 
                  Interest deductible as investment interest.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total Wealth Impact Summary - Feature 1 */}
        {renderWealthImpactSummary(opt)}

        {/* Monthly Cash Flow Impact - Feature 2 */}
        {renderMonthlyCashFlow(opt)}

        {/* Interest deductibility breakdown */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Interest Deductibility Analysis</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Interest Type</th>
                <th style={s.th}>Annual Interest</th>
                <th style={s.th}>Deductible</th>
                <th style={s.th}>Non-Deductible</th>
                <th style={s.th}>Effective Rate</th>
              </tr>
            </thead>
            <tbody>
              {opt.mortgageLoan > 0 && (
                <tr>
                  <td style={s.td}>Mortgage ({fmt$(opt.mortgageLoan)})</td>
                  <td style={s.td}>{fmt$(opt.mortgageInterestAnnual)}</td>
                  <td style={{ ...s.td, color: '#4ade80' }}>{fmt$(opt.deductibleMortgageInterest)}</td>
                  <td style={{ ...s.td, color: opt.nonDeductibleMortgageInterest > 0 ? '#f87171' : '#4ade80' }}>{fmt$(opt.nonDeductibleMortgageInterest)}</td>
                  <td style={s.td}>{fmtPct(opt.mortgageEffectiveRate)}</td>
                </tr>
              )}
              {opt.marginLoan > 0 && (
                <tr>
                  <td style={s.td}>Margin ({fmt$(opt.marginLoan)})</td>
                  <td style={s.td}>{fmt$(opt.marginInterestAnnual)}</td>
                  <td style={{ ...s.td, color: '#4ade80' }}>{fmt$(opt.deductibleMarginInterest)}</td>
                  <td style={{ ...s.td, color: opt.nonDeductibleMarginInterest > 0 ? '#f87171' : '#4ade80' }}>{fmt$(opt.nonDeductibleMarginInterest)}</td>
                  <td style={s.td}>{fmtPct(opt.marginEffectiveRate)}</td>
                </tr>
              )}
              {opt.helocAmount > 0 && (
                <tr>
                  <td style={s.td}>HELOC ({fmt$(opt.helocAmount)})</td>
                  <td style={s.td}>{fmt$(opt.helocInterestAnnual)}</td>
                  <td style={{ ...s.td, color: '#4ade80' }}>{fmt$(opt.deductibleHELOCInterest)}</td>
                  <td style={{ ...s.td, color: opt.nonDeductibleHELOCInterest > 0 ? '#f87171' : '#4ade80' }}>{fmt$(opt.nonDeductibleHELOCInterest)}</td>
                  <td style={s.td}>{fmtPct(opt.helocEffectiveRate)}</td>
                </tr>
              )}
              <tr style={s.highlight}>
                <td style={{ ...s.td, fontWeight: '600' }}>TOTAL / BLENDED</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{fmt$(opt.totalInterestAnnual)}</td>
                <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{fmt$(opt.deductibleMortgageInterest + opt.deductibleMarginInterest + opt.deductibleHELOCInterest)}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{fmt$(opt.nonDeductibleMortgageInterest + opt.nonDeductibleMarginInterest + opt.nonDeductibleHELOCInterest)}</td>
                <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{fmtPct(opt.blendedEffectiveRate)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#8b8ba7' }}>
            Total investment return: {fmt$(opt.totalInvestmentIncome)}/yr | Deductible income (dividends/interest): {fmt$(opt.totalDeductibleInvestmentIncome)}/yr
          </div>
        </div>
        
        {/* Non-recoverable breakdown */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>True Cost of Ownership vs. Rent</h3>
          {renderNonRecovBreakdown(opt.nonRecovBreakdown, monthlyRent)}
        </div>
        
        {/* Top strategies comparison */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Top 5 Strategies Compared</h3>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Strategy</th>
              <th style={s.th}>Down</th>
              <th style={s.th}>Monthly</th>
              <th style={s.th}>Eff. Rate</th>
              <th style={s.th}>Break-even</th>
              <th style={s.th}>20-Yr Wealth</th>
            </tr></thead>
            <tbody>{top5.map((r, i) => (
              <tr key={i} style={i === 0 ? s.highlight : {}}>
                <td style={s.td}>
                  {r.strategyDesc}
                  {i === 0 && <span style={{ ...s.badge, ...s.badgeGreen }}>Best</span>}
                  {r.helocAmount > 0 && <span style={{ ...s.badge, ...s.badgePurple }}>HELOC</span>}
                </td>
                <td style={s.td}>{fmt$(r.totalDown)}</td>
                <td style={s.td}>{fmt$(r.monthlyPayment)}</td>
                <td style={s.td}>{fmtPct(r.blendedEffectiveRate)}</td>
                <td style={s.td}>{r.breakEvenYear}</td>
                <td style={s.td}>{fmt$(r.ownerWealth20)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        
        {/* Unlock threshold */}
        {!optimizationResult.canBuyCash && optimizationResult.additionalNeeded > 0 && (
          <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#a78bfa', marginBottom: '12px', marginTop: 0 }}>🔓 Unlock Full Cash + HELOC Strategy</h3>
            <p style={{ color: '#c0c0d0', fontSize: '0.9rem', marginBottom: '12px' }}>
              Buy with cash + margin, then HELOC to invest. ALL interest becomes investment interest (deductible at {fmtPct(combRate)}).
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ color: '#8b8ba7' }}>Additional savings needed:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#a78bfa' }}>{fmt$(optimizationResult.additionalNeeded)}</span>
            </div>
          </div>
        )}
        </>
        )}
      </>
    );
  };

  const renderManual = () => {
    const sc = manualScenario;
    
    return (
      <>
        {/* Scenario Presets */}
        <div className="hpo-card" style={s.card}>
          <PresetSelector onSelect={applyPreset} activePreset={activePreset} />
          
          {activePreset && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: `${SCENARIO_PRESETS[activePreset].color}15`,
              border: `1px solid ${SCENARIO_PRESETS[activePreset].color}40`,
              fontSize: '0.85rem',
              color: '#d0d0e0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span>{SCENARIO_PRESETS[activePreset].emoji}</span>
                <span style={{ fontWeight: '600', color: SCENARIO_PRESETS[activePreset].color }}>
                  {SCENARIO_PRESETS[activePreset].name} Preset Applied
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7' }}>
                {SCENARIO_PRESETS[activePreset].description}
              </div>
            </div>
          )}
        </div>

        <InfoBox title="Build Your Own Strategy" isOpen={openInfoBoxes['manual']} onToggle={() => toggleInfo('manual')}>
          <p>Use sliders to test any combination. Start with a preset above, then customize as needed. HELOC requires buying outright (set down payment to 100% or ensure cash + margin ≥ home price).</p>
        </InfoBox>

        {/* Educational Info Boxes */}
        <InfoBox title="What is a Margin Loan?" isOpen={openInfoBoxes['marginInfo']} onToggle={() => toggleInfo('marginInfo')}
          recommendation={{ type: 'maybe', text: 'Good for high-income investors with diversified portfolios who want to preserve cash flow.' }}>
          <p><strong>How it works:</strong> Borrow against your stock portfolio without selling. Your broker lends you cash using your securities as collateral.</p>
          <p style={{marginTop: '10px'}}><strong>Interest tracing:</strong> If you use margin proceeds for home purchase, the interest is generally NOT deductible. However, if you use margin to stay invested while using cash for the home, the interest on your existing margin (for investment purposes) remains deductible against investment income.</p>
          <p style={{marginTop: '10px'}}><strong>Margin call risk:</strong> If your portfolio drops significantly (typically 25-30%), you may need to deposit more cash or sell securities. Keep utilization under 25% for safety.</p>
          <p style={{marginTop: '10px'}}><strong>Rates:</strong> Usually variable, tied to broker call rate or SOFR. Currently around {marginRate}%.</p>
        </InfoBox>

        <InfoBox title="What is a HELOC?" isOpen={openInfoBoxes['helocInfo']} onToggle={() => toggleInfo('helocInfo')}
          recommendation={{ type: 'yes', text: 'Best strategy for high earners who can buy outright and want maximum tax efficiency.' }}>
          <p><strong>How it works:</strong> Home Equity Line of Credit - borrow against your home equity after purchase. Like a credit card secured by your home.</p>
          <p style={{marginTop: '10px'}}><strong>Interest tracing for investment:</strong> If you buy the home with cash, then take a HELOC and invest the proceeds, the interest is classified as INVESTMENT interest (not mortgage interest). This is deductible against your investment income at your full marginal rate ({fmtPct(combRate)}).</p>
          <p style={{marginTop: '10px'}}><strong>Variable rate risk:</strong> HELOC rates are typically variable (currently ~{helocRate}%). They can increase over time, unlike fixed mortgage rates.</p>
          <p style={{marginTop: '10px'}}><strong>Requires equity:</strong> You must own the home outright (or have significant equity) to get a HELOC. Most lenders allow up to 80% LTV.</p>
        </InfoBox>

        <InfoBox title="What is Cash-Out Refinance?" isOpen={openInfoBoxes['cashOutInfo']} onToggle={() => toggleInfo('cashOutInfo')}
          recommendation={{ type: 'maybe', text: 'Consider if you want fixed-rate borrowing and HELOC rates are high or rising.' }}>
          <p><strong>How it works:</strong> Replace your existing mortgage with a new, larger mortgage and pocket the difference as cash.</p>
          <p style={{marginTop: '10px'}}><strong>Pros vs HELOC:</strong> Fixed rate (predictable payments), potentially lower rate than HELOC, single payment instead of two loans.</p>
          <p style={{marginTop: '10px'}}><strong>Cons vs HELOC:</strong> Higher closing costs (2-5% of loan), replaces your entire mortgage (bad if you had a low rate), less flexible than a line of credit.</p>
          <p style={{marginTop: '10px'}}><strong>Interest tracing:</strong> The cash-out portion can qualify as investment interest if proceeds are invested. The original loan portion remains mortgage interest.</p>
        </InfoBox>

        <InfoBox title="Investment Interest Deduction Rules" isOpen={openInfoBoxes['investIntInfo']} onToggle={() => toggleInfo('investIntInfo')}
          recommendation={{ type: 'no', text: 'Only actual income counts - appreciation does not. Plan your dividend yield carefully.' }}>
          <p><strong>The limit:</strong> Investment interest expense is deductible only up to your net investment income for the year.</p>
          <p style={{marginTop: '10px'}}><strong>What counts as investment income:</strong> Dividends, interest, short-term capital gains, and other realized investment income. Long-term capital gains only count if you elect to treat them as ordinary income (losing the lower LTCG rate).</p>
          <p style={{marginTop: '10px'}}><strong>What does NOT count:</strong> Unrealized appreciation (paper gains). If your portfolio is mostly growth stocks with low dividends, you may have limited deduction capacity.</p>
          <p style={{marginTop: '10px'}}><strong>Carryforward:</strong> Excess investment interest expense can be carried forward to future years indefinitely.</p>
        </InfoBox>

        <InfoBox title="$750K Federal vs $1M California Limit" isOpen={openInfoBoxes['mortgageLimitInfo']} onToggle={() => toggleInfo('mortgageLimitInfo')}
          recommendation={{ type: 'yes', text: 'California provides extra deduction benefit on mortgages between $750K-$1M.' }}>
          <p><strong>Federal ($750K limit):</strong> Under TCJA (2017), mortgage interest is only deductible on the first $750,000 of acquisition debt for federal taxes. Interest on debt above this is NOT federally deductible.</p>
          <p style={{marginTop: '10px'}}><strong>California ($1M limit):</strong> California did NOT conform to TCJA. The state still allows mortgage interest deduction on up to $1,000,000 of acquisition debt.</p>
          <p style={{marginTop: '10px'}}><strong>What this means:</strong> For a $1M+ mortgage, you get federal deduction on the first $750K and CA deduction on the first $1M. The $750K-$1M portion is only deductible for state taxes.</p>
          <p style={{marginTop: '10px'}}><strong>Example:</strong> $900K mortgage at 6.5% = $58,500/yr interest. Federal deduction: $48,750 (on $750K). CA deduction: $58,500 (full amount). You save an extra {fmtPct(caRate)} on the $9,750 difference = {fmt$(9750 * caRate)}/yr.</p>
        </InfoBox>

        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Configure Your Scenario</h3>
          
          <div style={s.inputGroup}>
            <label style={s.label}>Down Payment: {manualDpPct}% ({fmt$(homePrice * manualDpPct / 100)})</label>
            <input type="range" min="10" max="100" value={manualDpPct} onChange={e => { setManualDpPct(Number(e.target.value)); setActivePreset(null); }} style={s.slider} />
          </div>
          
          <div style={s.inputGroup}>
            <label style={s.label}>Margin Loan: {manualMarginPct}% of portfolio ({fmt$(stockPortfolio * manualMarginPct / 100)})</label>
            <input type="range" min="0" max="30" value={manualMarginPct} onChange={e => { setManualMarginPct(Number(e.target.value)); setActivePreset(null); }} style={s.slider} />
            {manualMarginPct > 25 && <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ High margin ({'>'}25%) increases margin call risk</div>}
          </div>
          
          <div style={s.inputGroup}>
            <label style={s.label}>HELOC: {manualHelocPct}% of home ({fmt$(homePrice * manualHelocPct / 100)})</label>
            <input type="range" min="0" max="80" value={manualHelocPct} onChange={e => { setManualHelocPct(Number(e.target.value)); setActivePreset(null); }} style={s.slider} disabled={!canManualHELOC} />
            {!canManualHELOC && manualHelocPct === 0 && (
              <div style={{ color: '#8b8ba7', fontSize: '0.8rem', marginTop: '4px' }}>
                HELOC requires cash + margin ≥ home price. Currently: {fmt$(manualScenario.cashDown + (stockPortfolio * manualMarginPct / 100))} vs {fmt$(homePrice)} needed
              </div>
            )}
            {sc.helocAmount > 0 && (
              <div style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: '4px' }}>✓ HELOC active: {fmt$(sc.helocAmount)}</div>
            )}
          </div>
        </div>
        
        {manualRemaining < minBuffer && (
          <div style={s.error}>
            <strong>⚠️ Below minimum buffer!</strong> Only {fmt$(manualRemaining)} remaining (wanted {fmt$(minBuffer)})
          </div>
        )}
        
        <div className="hpo-metrics" style={s.metrics}>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(sc.totalDown)}</div><div style={s.metricLbl}>Total Down</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(sc.monthlyPayment)}</div><div style={s.metricLbl}>Monthly P&I</div></div>
          <div style={s.metric}><div style={{ ...s.metricVal, color: '#4ade80' }}>{fmtPct(sc.blendedEffectiveRate)}</div><div style={s.metricLbl}>Blended Eff. Rate</div></div>
          <div style={s.metric}><div style={{ ...s.metricVal, color: manualRemaining < minBuffer ? '#f87171' : '#4ade80' }}>{fmt$(manualRemaining)}</div><div style={s.metricLbl}>Remaining</div></div>
        </div>
        
        {/* Financing structure */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Financing Structure</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Cash from savings:</span><span>{fmt$(sc.cashDown)}</span></div>
              <div style={s.costLine}><span style={{ color: '#a78bfa' }}>Margin loan:</span><span>{fmt$(sc.marginLoan)}</span></div>
              <div style={s.costLine}><span style={{ color: '#f87171' }}>Mortgage:</span><span>{fmt$(sc.mortgageLoan)}</span></div>
              <div style={s.costLine}><span style={{ color: '#60a5fa' }}>HELOC (proceeds back):</span><span style={{ color: '#4ade80' }}>+{fmt$(sc.helocAmount)}</span></div>
            </div>
            <div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Mortgage eff. rate:</span><span>{fmtPct(sc.mortgageEffectiveRate)}</span></div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Margin eff. rate:</span><span>{fmtPct(sc.marginEffectiveRate)}</span></div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>HELOC eff. rate:</span><span>{fmtPct(sc.helocEffectiveRate)}</span></div>
              <div style={{ ...s.costLine, fontWeight: '600' }}><span>Blended:</span><span style={{ color: '#4ade80' }}>{fmtPct(sc.blendedEffectiveRate)}</span></div>
            </div>
          </div>
        </div>
        
        {/* Non-recoverable */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>True Cost vs. Rent</h3>
          {renderNonRecovBreakdown(sc.nonRecovBreakdown, monthlyRent)}
        </div>
        
        {/* Tax analysis */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Tax Analysis</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Itemized deductions:</span><span>{fmt$(sc.itemizedTotal)}</span></div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Standard deduction:</span><span>{fmt$(sc.stdDeduction)}</span></div>
              <div style={s.costLine}><span style={{ color: '#8b8ba7' }}>Should itemize?</span><span style={{ color: sc.shouldItemize ? '#4ade80' : '#f87171' }}>{sc.shouldItemize ? 'YES' : 'NO'}</span></div>
            </div>
            <div>
              <div style={s.costLine}><span style={{ color: '#4ade80' }}>Mortgage tax benefit:</span><span style={{ color: '#4ade80' }}>{fmt$(sc.mortgageTaxBenefit)}/yr</span></div>
              <div style={s.costLine}><span style={{ color: '#4ade80' }}>Investment int. benefit:</span><span style={{ color: '#4ade80' }}>{fmt$(sc.investInterestTaxBenefit)}/yr</span></div>
              <div style={{ ...s.costLine, fontWeight: '600' }}><span>Total tax benefit:</span><span style={{ color: '#4ade80' }}>{fmt$(sc.totalTaxBenefit)}/yr</span></div>
            </div>
          </div>
        </div>
        
        {/* Edit Assumptions Section */}
        <div style={{
          ...s.card,
          background: assumptionsModified ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)',
          border: assumptionsModified ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.06)'
        }}>
          <div 
            onClick={() => setShowAssumptions(!showAssumptions)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              cursor: 'pointer',
              padding: '4px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚙️</span>
              <div>
                <h3 style={{ ...s.section, marginTop: 0, marginBottom: '4px' }}>Edit Assumptions</h3>
                <div style={{ fontSize: '0.8rem', color: assumptionsModified ? '#fbbf24' : '#8b8ba7' }}>
                  {assumptionsModified ? '⚠️ Custom values active' : 'SF defaults (click to customize)'}
                </div>
              </div>
            </div>
            <span style={{ color: '#8b8ba7', fontSize: '1.2rem' }}>{showAssumptions ? '▼' : '▶'}</span>
          </div>
          
          {showAssumptions && (
            <div style={{ marginTop: '20px' }}>
              {/* Reset Button */}
              {assumptionsModified && (
                <button
                  onClick={resetAssumptions}
                  style={{
                    marginBottom: '16px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(251,191,36,0.4)',
                    background: 'rgba(251,191,36,0.1)',
                    color: '#fbbf24',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🔄 Reset to SF Defaults
                </button>
              )}
              
              <div className="hpo-assumptions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {/* Property Tax Rate */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Property Tax Rate (%)
                    {customAssumptions.propTaxRate !== 1.18 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.propTaxRate}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, propTaxRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>SF default: 1.18%</div>
                </div>

                {/* Transfer Tax */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Transfer Tax (%)
                    {customAssumptions.transferTax !== 0.68 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.transferTax}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, transferTax: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>SF default: 0.68%</div>
                </div>

                {/* Parcel Tax */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Annual Parcel Tax ($)
                    {customAssumptions.parcelTax !== 350 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="10"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.parcelTax}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, parcelTax: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>SF default: $350</div>
                </div>

                {/* Realtor Commission */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Realtor Commission (%)
                    {customAssumptions.realtorComm !== 5 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.realtorComm}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, realtorComm: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 5% (seller pays)</div>
                </div>

                {/* Closing Costs - Buy */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Buyer Closing Costs (%)
                    {customAssumptions.closeBuy !== 1.5 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.closeBuy}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, closeBuy: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 1.5%</div>
                </div>

                {/* Closing Costs - Sell */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Seller Closing Costs (%)
                    {customAssumptions.closeSell !== 1 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.closeSell}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, closeSell: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 1%</div>
                </div>

                {/* Insurance Rate */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Insurance Rate (%)
                    {customAssumptions.insuranceRate !== 0.35 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.insuranceRate}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, insuranceRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 0.35%</div>
                </div>

                {/* Maintenance Rate */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    Maintenance Rate (%)
                    {customAssumptions.maintenanceRate !== 1 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.maintenanceRate}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, maintenanceRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 1% of home value/yr</div>
                </div>

                {/* PMI Rate */}
                <div style={s.inputGroup}>
                  <label style={{ ...s.label, fontSize: '0.75rem' }}>
                    PMI Rate (%)
                    {customAssumptions.pmiRate !== 0.5 && <span style={{ color: '#fbbf24' }}> ★</span>}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    style={{ ...s.input, fontSize: '0.9rem', padding: '10px' }}
                    value={customAssumptions.pmiRate}
                    onChange={e => setCustomAssumptions(prev => ({ ...prev, pmiRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Default: 0.5% (if LTV &gt; 80%)</div>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(59,130,246,0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(59,130,246,0.2)',
                fontSize: '0.8rem',
                color: '#8b8ba7'
              }}>
                <strong style={{ color: '#60a5fa' }}>💡 Tip:</strong> These assumptions are specific to San Francisco. 
                If you're looking at other markets, adjust property tax rates, transfer taxes, etc. accordingly.
                {assumptionsModified && (
                  <div style={{ marginTop: '8px', color: '#fbbf24' }}>
                    ⚠️ Custom assumptions are currently active. Calculations use your modified values.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* CTA: Optimize & Compare */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid rgba(59,130,246,0.4)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1rem', color: '#c0c0d0', marginBottom: '16px' }}>
            Happy with this setup? Run the optimizer to see how it compares to other strategies.
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                handleOptimize();
                setActiveTab('scenarios');
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🚀 Optimize & Compare Strategies
            </button>
            <button
              onClick={() => {
                // Add current manual scenario to comparison scenarios
                const newScenario = {
                  id: Math.max(...scenarios.map(s => s.id), 0) + 1,
                  name: 'My Custom',
                  dpPct: manualDpPct,
                  mortgageRate: mortgageRate,
                  marginPct: manualMarginPct,
                  helocPct: manualHelocPct,
                };
                setScenarios(prev => [...prev.filter(s => s.name !== 'My Custom'), newScenario]);
                setActiveTab('scenarios');
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: '1px solid rgba(59,130,246,0.4)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'rgba(59,130,246,0.1)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📊 Add to Compare Tab
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderHolding = () => {
    const opt = optimizationResult?.optimal;
    if (!opt) return <div style={{ textAlign: 'center', padding: '40px', color: '#8b8ba7' }}>Run optimization first</div>;

    const sens = opt.breakEvenSensitivity || {};
    
    // Determine verdict
    const buyWins = opt.breakEvenYear !== 'Never' && opt.breakEvenYear <= 10;
    const year10Data = opt.yearlyAnalysis?.[9];
    const advantage10 = year10Data ? year10Data.ownerWealth - year10Data.renterWealth : 0;
    
    const getHoldingVerdict = () => {
      if (opt.breakEvenYear === 'Never') {
        return { emoji: '🏃', verdict: 'Renting Wins Long-Term', color: '#f87171', desc: 'Based on current assumptions, renting + investing beats buying over 30 years.' };
      }
      if (opt.breakEvenYear <= 3) {
        return { emoji: '🏠', verdict: `Buying Wins Fast (Year ${opt.breakEvenYear})`, color: '#22c55e', desc: 'Quick break-even — buying is clearly favorable if you stay.' };
      }
      if (opt.breakEvenYear <= 7) {
        return { emoji: '✅', verdict: `Buying Wins at Year ${opt.breakEvenYear}`, color: '#4ade80', desc: 'Reasonable break-even horizon for a home purchase.' };
      }
      if (opt.breakEvenYear <= 15) {
        return { emoji: '⚖️', verdict: `Break-Even at Year ${opt.breakEvenYear}`, color: '#fbbf24', desc: 'Longer horizon — make sure you plan to stay.' };
      }
      return { emoji: '🤔', verdict: `Long Break-Even (Year ${opt.breakEvenYear})`, color: '#fb923c', desc: 'You need to stay a long time for buying to make sense financially.' };
    };
    
    const holdingVerdict = getHoldingVerdict();

    return (
      <>
        {/* Verdict Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${holdingVerdict.color}20, ${holdingVerdict.color}10)`,
          borderRadius: '20px',
          padding: '24px',
          border: `2px solid ${holdingVerdict.color}60`,
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <div className="hpo-verdict-emoji" style={{ fontSize: '3rem', marginBottom: '8px' }}>{holdingVerdict.emoji}</div>
          <div className="hpo-verdict-text" style={{ fontSize: '1.8rem', fontWeight: '700', color: holdingVerdict.color, marginBottom: '8px' }}>{holdingVerdict.verdict}</div>
          <div style={{ fontSize: '1rem', color: '#c0c0d0', marginBottom: '16px', maxWidth: '500px', margin: '0 auto' }}>{holdingVerdict.desc}</div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSensitivity(!showSensitivity)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${showSensitivity ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`,
                background: showSensitivity ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                color: showSensitivity ? '#a78bfa' : '#8b8ba7',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              {showSensitivity ? '📊 Hide Sensitivity' : '📊 See Sensitivity Analysis'}
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              Compare Other Scenarios →
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#8b8ba7',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              ← Back to Strategy
            </button>
          </div>
        </div>

        {/* Sensitivity Analysis Panel */}
        {showSensitivity && (
          <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ color: '#a78bfa', margin: '0 0 16px 0', fontSize: '1rem' }}>📊 What Would Change the Outcome?</h4>
            <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px' }}>If Home Appreciation Were Higher</div>
                <div style={{ fontSize: '1rem', color: '#fff' }}>
                  At {(homeAppreciation + 2).toFixed(0)}% instead of {homeAppreciation}%, break-even comes ~{Math.max(1, Math.floor((opt.breakEvenYear === 'Never' ? 30 : opt.breakEvenYear) * 0.7))} years sooner
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px' }}>If Rent Were Higher</div>
                <div style={{ fontSize: '1rem', color: '#fff' }}>
                  At {fmt$(monthlyRent * 1.25)}/mo (+25%), owning becomes more attractive
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px' }}>If Investment Returns Were Lower</div>
                <div style={{ fontSize: '1rem', color: '#fff' }}>
                  At {(investmentReturn - 2).toFixed(0)}% instead of {investmentReturn}%, renting looks less appealing
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px' }}>If You Got a Better Rate</div>
                <div style={{ fontSize: '1rem', color: '#fff' }}>
                  At {(mortgageRate - 1).toFixed(1)}% instead of {mortgageRate}%, monthly costs drop ~{fmt$((homePrice * 0.8 * 0.01) / 12)}/mo
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '12px', marginBottom: 0, fontStyle: 'italic' }}>
              Try adjusting these inputs in the sidebar to see exact impacts.
            </p>
          </div>
        )}
        
        <InfoBox title="How the Comparison Works" isOpen={openInfoBoxes['holdingExplain']} onToggle={() => toggleInfo('holdingExplain')}>
          <p><strong>Owner scenario:</strong> Buys home, pays mortgage/costs from income, builds equity through appreciation + principal paydown. Wealth = home equity minus selling costs if sold.</p>
          <p style={{marginTop: '10px'}}><strong>Renter scenario:</strong> Invests the down payment + closing costs that owner spent. Portfolio compounds at {investmentReturn}% annually{sens.subjectToNIIT ? ` (reduced by 3.8% NIIT)` : ''}. If renting is cheaper than owning, the savings also get invested.</p>
          <p style={{marginTop: '10px'}}><strong>Break-even:</strong> The year when owner's net equity exceeds renter's portfolio value. Before this, you'd be wealthier renting. After this, owning pulls ahead.</p>
          {sens.subjectToNIIT && <p style={{marginTop: '10px', color: '#a78bfa'}}><strong>NIIT Impact:</strong> At your income level, renter's investment returns are reduced by Net Investment Income Tax (3.8%), making ownership comparatively more attractive.</p>}
        </InfoBox>

        {/* Break-Even Explanation when "Never" */}
        {opt.breakEvenYear === 'Never' && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ color: '#f87171', margin: '0 0 12px 0', fontSize: '1rem' }}>📊 Why Break-Even Shows "Never"</h4>
            <p style={{ color: '#d0d0e0', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
              Based on current assumptions, renting and investing the difference would leave you wealthier than owning over a 30-year period. Here's why:
            </p>
            <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>Year 1 Cost Difference</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: sens.year1CostDiff > 0 ? '#f87171' : '#4ade80' }}>
                  {sens.year1CostDiff > 0 ? `+${fmt$(sens.year1CostDiff)}` : fmt$(sens.year1CostDiff)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7' }}>
                  {sens.year1CostDiff > 0 ? 'Owning costs more annually' : 'Owning is cheaper'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>Year 30 Wealth Gap</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: sens.ownerAdvantageYear30 >= 0 ? '#4ade80' : '#f87171' }}>
                  {sens.ownerAdvantageYear30 >= 0 ? `+${fmt$(sens.ownerAdvantageYear30)}` : fmt$(sens.ownerAdvantageYear30)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7' }}>
                  {sens.ownerAdvantageYear30 >= 0 ? 'Owner ahead' : 'Renter ahead'}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600', marginBottom: '8px' }}>What Would Make Owning Win?</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#c0c0d0', fontSize: '0.85rem', lineHeight: '1.8' }}>
                {sens.appreciationNeeded && <li>Higher appreciation: ~{sens.appreciationNeeded.toFixed(1)}% annually (vs current {homeAppreciation}%)</li>}
                {sens.rentNeeded && <li>Higher rent: ~{fmt$(sens.rentNeeded)}/month (vs current {fmt$(monthlyRent)})</li>}
                <li>Lower purchase price (reduces down payment opportunity cost)</li>
                <li>Lower mortgage rates (reduces carrying costs)</li>
                <li>Lower investment returns assumed for renter</li>
              </ul>
            </div>

            <p style={{ color: '#8b8ba7', fontSize: '0.8rem', marginTop: '12px', marginBottom: 0 }}>
              <strong>Note:</strong> This is a financial comparison only. Non-financial benefits of ownership (stability, customization, pride) are not captured in this model.
            </p>
          </div>
        )}

        <div className="hpo-metrics" style={{ ...s.metrics, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div style={s.metric}><div style={{ ...s.metricVal, color: '#f97316' }}>{opt.breakEvenYear}</div><div style={s.metricLbl}>Break-Even Year</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.txCosts.total)}</div><div style={s.metricLbl}>Transaction Costs</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.yearlyAnalysis[0]?.ownerOutflow || 0)}</div><div style={s.metricLbl}>Year 1 Owner Cost</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.yearlyAnalysis[0]?.yearlyRent || 0)}</div><div style={s.metricLbl}>Year 1 Rent</div></div>
        </div>
        
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Wealth: Own vs. Rent + Invest</h3>
          
          {/* Chart Legend with Annotations */}
          <div className="hpo-chart-legend" style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            {opt.breakEvenYear !== 'Never' && opt.breakEvenYear <= 30 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '20px', height: '2px', background: '#22c55e', display: 'inline-block' }}></span>
                <span style={{ color: '#22c55e' }}>Break-even Year {opt.breakEvenYear}</span>
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '20px', height: '2px', background: 'rgba(167,139,250,0.5)', borderStyle: 'dashed', display: 'inline-block' }}></span>
              <span style={{ color: '#a78bfa' }}>Milestones (10/20/30 yr)</span>
            </span>
          </div>
          
          <div className="hpo-chart" style={{ ...s.chart, height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={opt.yearlyAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="year" stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
                <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} labelFormatter={l=>`Year ${l}`} />
                <Legend />
                
                {/* Break-even vertical line */}
                {opt.breakEvenYear !== 'Never' && opt.breakEvenYear <= 30 && (
                  <ReferenceLine 
                    x={opt.breakEvenYear} 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  >
                    <Label 
                      value={`Break-even: Year ${opt.breakEvenYear}`} 
                      position="top" 
                      fill="#22c55e"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </ReferenceLine>
                )}
                
                {/* 10-year milestone */}
                <ReferenceLine 
                  x={10} 
                  stroke="rgba(167,139,250,0.4)" 
                  strokeDasharray="3 3"
                >
                  <Label value="10yr" position="bottom" fill="#a78bfa" fontSize={10} />
                </ReferenceLine>
                
                {/* 20-year milestone */}
                <ReferenceLine 
                  x={20} 
                  stroke="rgba(167,139,250,0.4)" 
                  strokeDasharray="3 3"
                >
                  <Label value="20yr" position="bottom" fill="#a78bfa" fontSize={10} />
                </ReferenceLine>
                
                {/* 30-year milestone */}
                <ReferenceLine 
                  x={30} 
                  stroke="rgba(167,139,250,0.4)" 
                  strokeDasharray="3 3"
                >
                  <Label value="30yr" position="bottom" fill="#a78bfa" fontSize={10} />
                </ReferenceLine>
                
                <Line type="monotone" dataKey="ownerWealth" name="Own (equity - sell costs)" stroke="#f97316" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="renterWealth" name="Rent + Invest" stroke="#60a5fa" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Break-even callout */}
          {opt.breakEvenYear !== 'Never' && opt.breakEvenYear <= 30 && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <div>
                <div style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.9rem' }}>
                  Break-even at Year {opt.breakEvenYear}
                </div>
                <div style={{ color: '#8b8ba7', fontSize: '0.8rem' }}>
                  After this point, buying puts you ahead of renting + investing
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Year-by-Year Comparison</h3>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Year</th>
              <th style={s.th}>Home Value</th>
              <th style={s.th}>Owner Wealth</th>
              <th style={s.th}>Renter Wealth</th>
              <th style={s.th}>Owner Cost</th>
              <th style={s.th}>Rent</th>
              <th style={s.th}>Δ Wealth</th>
            </tr></thead>
            <tbody>{[1,2,3,5,7,10,15,20,30].map(y => { const d = opt.yearlyAnalysis[y-1]; if(!d) return null; return (
              <tr key={y} style={d.breakEven ? s.highlight : {}}>
                <td style={s.td}>{y}</td>
                <td style={s.td}>{fmt$(d.homeValue)}</td>
                <td style={s.td}>{fmt$(d.ownerWealth)}</td>
                <td style={s.td}>{fmt$(d.renterWealth)}</td>
                <td style={s.td}>{fmt$(d.ownerOutflow)}</td>
                <td style={s.td}>{fmt$(d.yearlyRent)}</td>
                <td style={{ ...s.td, color: d.advantage >= 0 ? '#4ade80' : '#f87171', fontWeight: '600' }}>{d.advantage >= 0 ? '+' : ''}{fmt$(d.advantage)}</td>
              </tr>
            );})}</tbody>
          </table>
        </div>
        
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Prop 13 Savings Over Time</h3>
          <p style={{ color: '#8b8ba7', fontSize: '0.85rem', marginBottom: '16px' }}>
            Annual savings compared to what a new buyer would pay in property taxes (your basis grows at 2% vs market appreciation of {homeAppreciation}%)
          </p>
          <div className="hpo-chart" style={s.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={opt.yearlyAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="year" stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
                <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} />
                <Area type="monotone" dataKey="prop13Savings" name="Annual Prop 13 Savings" stroke="#4ade80" fill="rgba(74,222,128,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };

  // Scenario comparison calculations
  const scenarioResults = useMemo(() => {
    return scenarios.map(sc => {
      const marginLoan = stockPortfolio * (sc.marginPct / 100);
      const totalDown = homePrice * (sc.dpPct / 100);
      const cashDown = Math.max(0, totalDown - marginLoan);
      const canHELOC = sc.dpPct >= 100 || (cashDown + marginLoan >= homePrice);
      const helocAmount = canHELOC && sc.helocPct > 0 ? homePrice * (sc.helocPct / 100) : 0;

      const result = calcScenario({
        homePrice,
        cashDown: sc.dpPct >= 100 ? homePrice - marginLoan : cashDown,
        marginLoan,
        helocAmount,
        mortgageRate: sc.mortgageRate / 100,
        loanTerm,
        appreciationRate: homeAppreciation / 100,
        investmentReturn: investmentReturn / 100,
        dividendYield: dividendYield / 100,
        monthlyRent,
        rentGrowthRate: rentGrowth / 100,
        marginRate: marginRate / 100,
        helocRate: helocRate / 100,
        fedRate,
        caRate,
        stateTax,
        stdDeduction,
        filingStatus,
        grossIncome
      });

      const remaining = totalSavings - result.cashDown - result.txCosts.buy + result.helocAmount;
      return { ...sc, ...result, remaining };
    });
  }, [scenarios, homePrice, stockPortfolio, loanTerm, homeAppreciation, investmentReturn, dividendYield, monthlyRent, rentGrowth, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, totalSavings, grossIncome]);

  const updateScenario = (id, field, value) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    const newId = Math.max(...scenarios.map(s => s.id)) + 1;
    setScenarios(prev => [...prev, {
      id: newId,
      name: `Scenario ${String.fromCharCode(64 + newId)}`,
      dpPct: 20,
      mortgageRate: 6.5,
      marginPct: 0,
      helocPct: 0
    }]);
  };

  const removeScenario = (id) => {
    if (scenarios.length > 1) {
      setScenarios(prev => prev.filter(s => s.id !== id));
    }
  };

  const renderScenarios = () => {
    const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];
    
    // Find the winning scenario based on 20-year advantage
    const winner = scenarioResults.length > 0 
      ? scenarioResults.reduce((best, sc) => {
          const scAdvantage = sc.ownerWealth20 - sc.renterWealth20;
          const bestAdvantage = best.ownerWealth20 - best.renterWealth20;
          return scAdvantage > bestAdvantage ? sc : best;
        })
      : null;
    const winnerIdx = winner ? scenarioResults.findIndex(s => s.id === winner.id) : -1;
    const winnerAdvantage = winner ? winner.ownerWealth20 - winner.renterWealth20 : 0;

    return (
      <>
        {/* Winner Banner */}
        {winner && scenarioResults.length > 1 && (
          <div style={{
            background: `linear-gradient(135deg, ${colors[winnerIdx % colors.length]}20, ${colors[winnerIdx % colors.length]}10)`,
            borderRadius: '16px',
            padding: '20px 24px',
            border: `2px solid ${colors[winnerIdx % colors.length]}`,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Best Scenario</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: colors[winnerIdx % colors.length] }}>{winner.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#c0c0d0', marginTop: '4px' }}>
                  {fmtPctWhole(winner.dpPct)} down · {fmt$(winner.monthlyPayment)}/mo · {fmtPct(winner.blendedEffectiveRate)} effective rate
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>20-Year Advantage</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: winnerAdvantage >= 0 ? '#4ade80' : '#f87171' }}>
                  {winnerAdvantage >= 0 ? '+' : ''}{fmt$(winnerAdvantage)}
                </div>
              </div>
              <button
                onClick={() => applyScenarioToManual(winner)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  background: `linear-gradient(135deg, ${colors[winnerIdx % colors.length]}, ${colors[winnerIdx % colors.length]}cc)`,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                Use This →
              </button>
            </div>
          </div>
        )}
        
        <InfoBox title="Scenario Comparison" isOpen={openInfoBoxes['scenarioInfo']} onToggle={() => toggleInfo('scenarioInfo')}>
          <p>Create and compare different financing scenarios side-by-side. Adjust rates, down payment, and leverage to see how they affect your costs and long-term wealth.</p>
        </InfoBox>

        {/* Scenario Cards */}
        <div className="hpo-scenario-cards" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(scenarios.length, 3)}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
          {scenarioResults.map((sc, idx) => (
            <div key={sc.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: `2px solid ${colors[idx % colors.length]}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={sc.name}
                  onChange={e => updateScenario(sc.id, 'name', e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: colors[idx % colors.length], fontSize: '1.1rem', fontWeight: '600', maxWidth: '120px', width: '100%', WebkitAppearance: 'none' }}
                />
                {scenarios.length > 1 && (
                  <button onClick={() => removeScenario(sc.id)} style={{ background: 'rgba(248,113,113,0.2)', border: 'none', color: '#f87171', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8b8ba7', display: 'block', marginBottom: '4px' }}>Down Payment: {sc.dpPct}%</label>
                <input type="range" min="10" max="100" value={sc.dpPct} onChange={e => updateScenario(sc.id, 'dpPct', Number(e.target.value))} style={{ ...s.slider, accentColor: colors[idx % colors.length] }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8b8ba7', display: 'block', marginBottom: '4px' }}>Mortgage Rate: {sc.mortgageRate}%</label>
                <input type="range" min="4" max="9" step="0.125" value={sc.mortgageRate} onChange={e => updateScenario(sc.id, 'mortgageRate', Number(e.target.value))} style={{ ...s.slider, accentColor: colors[idx % colors.length] }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8b8ba7', display: 'block', marginBottom: '4px' }}>Margin Loan: {sc.marginPct}% of portfolio</label>
                <input type="range" min="0" max="30" value={sc.marginPct} onChange={e => updateScenario(sc.id, 'marginPct', Number(e.target.value))} style={{ ...s.slider, accentColor: colors[idx % colors.length] }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8b8ba7', display: 'block', marginBottom: '4px' }}>HELOC: {sc.helocPct}% of home</label>
                <input type="range" min="0" max="80" value={sc.helocPct} onChange={e => updateScenario(sc.id, 'helocPct', Number(e.target.value))} style={{ ...s.slider, accentColor: colors[idx % colors.length] }} disabled={sc.dpPct < 100 && (sc.cashDown + stockPortfolio * sc.marginPct / 100) < homePrice} />
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#8b8ba7' }}>Monthly P&I</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{fmt$(sc.monthlyPayment)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#8b8ba7' }}>Effective Rate</span>
                  <span style={{ color: '#4ade80', fontWeight: '600' }}>{fmtPct(sc.blendedEffectiveRate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#8b8ba7' }}>Break-even</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>Year {sc.breakEvenYear}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#8b8ba7' }}>20-Yr Advantage</span>
                  <span style={{ color: (sc.ownerWealth20 - sc.renterWealth20) >= 0 ? '#4ade80' : '#f87171', fontWeight: '600' }}>
                    {(sc.ownerWealth20 - sc.renterWealth20) >= 0 ? '+' : ''}{fmt$(sc.ownerWealth20 - sc.renterWealth20)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {scenarios.length < 4 && (
            <div
              onClick={addScenario}
              style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '20px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '300px' }}
            >
              <div style={{ textAlign: 'center', color: '#8b8ba7' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>+</div>
                <div>Add Scenario</div>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Side-by-Side Comparison</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Metric</th>
                {scenarioResults.map((sc, idx) => (
                  <th key={sc.id} style={{ ...s.th, color: colors[idx % colors.length] }}>{sc.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Total Down Payment</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.totalDown)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Mortgage Amount</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.mortgageLoan || sc.acquisitionDebt || 0)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Margin Loan</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.marginLoan)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>HELOC Amount</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.helocAmount)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <td style={{ ...s.td, fontWeight: '600' }}>Monthly Payment</td>
                {scenarioResults.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600' }}>{fmt$(sc.monthlyPayment)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Annual Interest (Total)</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.totalInterestAnnual)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Tax Benefit (Annual)</td>
                {scenarioResults.map(sc => <td key={sc.id} style={{ ...s.td, color: '#4ade80' }}>{fmt$(sc.totalTaxBenefit)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(74,222,128,0.1)' }}>
                <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>Blended Effective Rate</td>
                {scenarioResults.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{fmtPct(sc.blendedEffectiveRate)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Net Non-Recoverable (Monthly)</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.nonRecovBreakdown.netTotal / 12)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Cash Remaining</td>
                {scenarioResults.map(sc => <td key={sc.id} style={{ ...s.td, color: sc.remaining < minBuffer ? '#f87171' : '#4ade80' }}>{fmt$(sc.remaining)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(249,115,22,0.1)' }}>
                <td style={{ ...s.td, fontWeight: '600' }}>Break-Even Year</td>
                {scenarioResults.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600' }}>{sc.breakEvenYear}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Home Equity (Year 20)</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.ownerWealth20)}</td>)}
              </tr>
              <tr>
                <td style={s.td}>Renter Wealth (Year 20)</td>
                {scenarioResults.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.renterWealth20)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <td style={{ ...s.td, fontWeight: '700', fontSize: '0.95rem' }}>Buy vs Rent Advantage</td>
                {scenarioResults.map((sc, idx) => {
                  const advantage = sc.ownerWealth20 - sc.renterWealth20;
                  return (
                    <td key={sc.id} style={{ ...s.td, fontWeight: '700', fontSize: '0.95rem', color: advantage >= 0 ? '#4ade80' : '#f87171' }}>
                      {advantage >= 0 ? '+' : ''}{fmt$(advantage)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Wealth Comparison Chart */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Wealth Over Time</h3>
          <div className="hpo-chart" style={s.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="year" type="number" domain={[1, 30]} stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
                <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} labelFormatter={l=>`Year ${l}`} />
                <Legend />
                {scenarioResults.map((sc, idx) => (
                  <Line
                    key={sc.id}
                    data={sc.yearlyAnalysis}
                    type="monotone"
                    dataKey="ownerWealth"
                    name={sc.name}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };

  // Tax breakdown calculations for Tax tab
  // Display-only bracket data for the Taxes tab table. Actual tax computation uses calcFedTax / calcCAStateTax.
  const taxBreakdown = useMemo(() => {
    const fedTaxBrackets = filingStatus === 'married'
      ? [{min:0,max:23200,r:0.10},{min:23200,max:94300,r:0.12},{min:94300,max:201050,r:0.22},{min:201050,max:383900,r:0.24},{min:383900,max:487450,r:0.32},{min:487450,max:731200,r:0.35},{min:731200,max:Infinity,r:0.37}]
      : [{min:0,max:11600,r:0.10},{min:11600,max:47150,r:0.12},{min:47150,max:100525,r:0.22},{min:100525,max:191950,r:0.24},{min:191950,max:243725,r:0.32},{min:243725,max:609350,r:0.35},{min:609350,max:Infinity,r:0.37}];

    const caTaxBrackets = filingStatus === 'married'
      ? [{min:0,max:20824,r:0.01},{min:20824,max:49368,r:0.02},{min:49368,max:77918,r:0.04},{min:77918,max:108162,r:0.06},{min:108162,max:136700,r:0.08},{min:136700,max:698274,r:0.093},{min:698274,max:837922,r:0.103},{min:837922,max:1396542,r:0.113},{min:1396542,max:Infinity,r:0.123}]
      : [{min:0,max:10412,r:0.01},{min:10412,max:24684,r:0.02},{min:24684,max:38959,r:0.04},{min:38959,max:54081,r:0.06},{min:54081,max:68350,r:0.08},{min:68350,max:349137,r:0.093},{min:349137,max:418961,r:0.103},{min:418961,max:698271,r:0.113},{min:698271,max:Infinity,r:0.123}];

    const mentalHealthThreshold = 1000000; // $1M for ALL filers (not doubled for married)
    const hasMentalHealthTax = grossIncome > mentalHealthThreshold;

    // Property tax estimate
    const annualPropTax = homePrice * SF.propTaxRate + SF.parcelTax;

    // SALT calculations
    const totalSALT = stateTax + annualPropTax;
    const federalSALTDeduction = Math.min(totalSALT, 10000);
    const saltLost = Math.max(0, totalSALT - 10000);
    const caSALTDeduction = totalSALT; // CA has no cap

    // Mortgage scenarios for comparison
    const mortgageAmount = homePrice * 0.8; // Assume 20% down
    const annualMortgageInterest = mortgageAmount * (mortgageRate / 100);
    const fedDeductibleMortgageInt = Math.min(mortgageAmount, 750000) * (mortgageRate / 100);
    const caDeductibleMortgageInt = Math.min(mortgageAmount, 1000000) * (mortgageRate / 100);
    const mortgageIntLostFederal = annualMortgageInterest - fedDeductibleMortgageInt;

    // Itemization analysis
    const fedItemized = fedDeductibleMortgageInt + federalSALTDeduction;
    // For CA: you CANNOT deduct CA state tax from CA state taxes - only mortgage interest + property tax
    const caItemized = caDeductibleMortgageInt + annualPropTax; // Only property tax, not state income tax
    const shouldItemizeFed = fedItemized > stdDeduction;
    const caStd = filingStatus === 'married' ? 10726 : 5363;
    const shouldItemizeCA = caItemized > caStd;

    // Tax savings from homeownership
    const fedTaxSavings = shouldItemizeFed ? (fedItemized - stdDeduction) * fedRate : 0;
    const caTaxSavings = shouldItemizeCA ? (caItemized - caStd) * caRate : 0;
    const totalTaxSavings = fedTaxSavings + caTaxSavings;

    return {
      fedTaxBrackets,
      caTaxBrackets,
      fedRate,
      caRate,
      hasMentalHealthTax,
      mentalHealthThreshold,
      annualPropTax,
      totalSALT,
      federalSALTDeduction,
      saltLost,
      caSALTDeduction,
      mortgageAmount,
      annualMortgageInterest,
      fedDeductibleMortgageInt,
      caDeductibleMortgageInt,
      mortgageIntLostFederal,
      fedItemized,
      caItemized,
      shouldItemizeFed,
      shouldItemizeCA,
      caStd,
      fedTaxSavings,
      caTaxSavings,
      totalTaxSavings
    };
  }, [grossIncome, filingStatus, homePrice, mortgageRate, stateTax, fedRate, caRate, stdDeduction]);

  const renderTax = () => {
    const tb = taxBreakdown;

    return (
      <>
        {/* Tax Rate Breakdown */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Your Marginal Tax Rates</h3>
          <div className="hpo-tax-rates" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '8px' }}>Federal</div>
              <div className="hpo-tax-rate-val" style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{fmtPct(fedRate)}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '4px' }}>Top bracket for {fmt$(grossIncome)}</div>
            </div>
            <div style={{ background: 'rgba(234,179,8,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(234,179,8,0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#eab308', textTransform: 'uppercase', marginBottom: '8px' }}>California</div>
              <div className="hpo-tax-rate-val" style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{fmtPct(caRate)}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '4px' }}>
                {tb.hasMentalHealthTax ? 'Includes 1% Mental Health Tax' : `Top bracket for ${fmt$(grossIncome)}`}
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,179,8,0.1))', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid rgba(249,115,22,0.4)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f97316', textTransform: 'uppercase', marginBottom: '8px' }}>Combined</div>
              <div className="hpo-tax-rate-val" style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{fmtPct(combRate)}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '4px' }}>Marginal rate on next $1</div>
            </div>
          </div>

          {tb.hasMentalHealthTax && (
            <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#eab308', marginBottom: '12px' }}>
              <strong>CA Mental Health Services Tax:</strong> You pay an additional 1% on income over {fmt$(tb.mentalHealthThreshold)} (same for all filing statuses).
            </div>
          )}

          {/* AMT Warning */}
          {grossIncome > 500000 && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#fbbf24', marginBottom: '12px' }}>
              <strong>⚠️ AMT Consideration:</strong> At your income level ({fmt$(grossIncome)}), you may be subject to Alternative Minimum Tax (AMT). AMT can disallow certain deductions including some investment interest and state tax deductions. Consult a tax professional for personalized advice.
            </div>
          )}

          {/* NIIT Warning */}
          {grossIncome > (filingStatus === 'married' ? 250000 : 200000) && (
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#a78bfa' }}>
              <strong>💰 Net Investment Income Tax (NIIT):</strong> You're subject to a 3.8% additional tax on investment income above {fmt$(filingStatus === 'married' ? 250000 : 200000)}. This affects returns on HELOC/margin proceeds if invested, reducing effective after-tax returns.
            </div>
          )}
        </div>

        {/* SALT Deduction */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>SALT Deduction (State & Local Taxes)</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '12px' }}>Your SALT Components</div>
              <div style={s.costLine}><span>CA State Income Tax:</span><span>{fmt$(stateTax)}</span></div>
              <div style={s.costLine}><span>Property Tax (estimated):</span><span>{fmt$(tb.annualPropTax)}</span></div>
              <div style={{ ...s.costLine, fontWeight: '600', borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: '12px', marginTop: '8px' }}>
                <span>Total SALT:</span><span>{fmt$(tb.totalSALT)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '12px' }}>Deductibility</div>
              <div style={s.costLine}>
                <span style={{ color: '#60a5fa' }}>Federal (capped at $10K):</span>
                <span style={{ color: '#60a5fa' }}>{fmt$(tb.federalSALTDeduction)}</span>
              </div>
              <div style={s.costLine}>
                <span style={{ color: '#f87171' }}>Lost to SALT cap:</span>
                <span style={{ color: '#f87171' }}>{fmt$(tb.saltLost)}</span>
              </div>
              <div style={s.costLine}>
                <span style={{ color: '#4ade80' }}>California (no cap):</span>
                <span style={{ color: '#4ade80' }}>{fmt$(tb.caSALTDeduction)}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#f87171' }}>
            <strong>SALT Cap Impact:</strong> You lose {fmt$(tb.saltLost)} in federal deductions due to the $10,000 TCJA cap. This costs you approximately {fmt$(tb.saltLost * fedRate)} in additional federal taxes annually.
          </div>
        </div>

        {/* Mortgage Interest Deduction */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Mortgage Interest Deduction</h3>
          <p style={{ color: '#8b8ba7', fontSize: '0.85rem', marginBottom: '16px' }}>Based on {fmt$(tb.mortgageAmount)} mortgage (80% LTV) at {mortgageRate}%</p>

          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600', marginBottom: '12px' }}>Federal Rules ($750K Limit)</div>
              <div style={s.costLine}><span>Annual Interest:</span><span>{fmt$(tb.annualMortgageInterest)}</span></div>
              <div style={s.costLine}><span style={{ color: '#4ade80' }}>Deductible:</span><span style={{ color: '#4ade80' }}>{fmt$(tb.fedDeductibleMortgageInt)}</span></div>
              {tb.mortgageIntLostFederal > 0 && (
                <div style={s.costLine}><span style={{ color: '#f87171' }}>Not Deductible:</span><span style={{ color: '#f87171' }}>{fmt$(tb.mortgageIntLostFederal)}</span></div>
              )}
            </div>
            <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(74,222,128,0.3)' }}>
              <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '600', marginBottom: '12px' }}>California Rules ($1M Limit)</div>
              <div style={s.costLine}><span>Annual Interest:</span><span>{fmt$(tb.annualMortgageInterest)}</span></div>
              <div style={s.costLine}><span style={{ color: '#4ade80' }}>Deductible:</span><span style={{ color: '#4ade80' }}>{fmt$(tb.caDeductibleMortgageInt)}</span></div>
              <div style={{ fontSize: '0.8rem', color: '#8b8ba7', marginTop: '8px' }}>CA did not conform to TCJA</div>
            </div>
          </div>
        </div>

        {/* Itemized vs Standard */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Should You Itemize?</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Federal Breakdown */}
            <div>
              <div style={{ fontSize: '0.9rem', color: '#60a5fa', fontWeight: '600', marginBottom: '12px' }}>Federal</div>

              {/* Itemized Components Breakdown */}
              <div style={{ background: 'rgba(59,130,246,0.05)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px', textTransform: 'uppercase' }}>Itemized Deduction Breakdown</div>
                <div style={s.costLine}><span>Mortgage Interest:</span><span>{fmt$(tb.fedDeductibleMortgageInt)}</span></div>
                <div style={s.costLine}><span>SALT (capped at $10K):</span><span>{fmt$(tb.federalSALTDeduction)}</span></div>
                <div style={{ ...s.costLine, fontWeight: '600', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '6px' }}>
                  <span>Total Itemized:</span><span style={{ color: '#60a5fa' }}>{fmt$(tb.fedItemized)}</span>
                </div>
              </div>

              <div style={s.costLine}><span>vs Standard Deduction:</span><span>{fmt$(stdDeduction)}</span></div>
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', textAlign: 'center',
                background: tb.shouldItemizeFed ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                border: tb.shouldItemizeFed ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(248,113,113,0.4)',
                color: tb.shouldItemizeFed ? '#4ade80' : '#f87171'
              }}>
                {tb.shouldItemizeFed ? '✓ Itemize (+' + fmt$(tb.fedItemized - stdDeduction) + ' extra deductions)' : '✗ Take Standard Deduction'}
              </div>
            </div>

            {/* California Breakdown */}
            <div>
              <div style={{ fontSize: '0.9rem', color: '#eab308', fontWeight: '600', marginBottom: '12px' }}>California</div>

              {/* Itemized Components Breakdown */}
              <div style={{ background: 'rgba(234,179,8,0.05)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '8px', textTransform: 'uppercase' }}>Itemized Deduction Breakdown</div>
                <div style={s.costLine}><span>Mortgage Interest:</span><span>{fmt$(tb.caDeductibleMortgageInt)}</span></div>
                <div style={s.costLine}><span>Property Tax (no cap):</span><span>{fmt$(tb.annualPropTax)}</span></div>
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px', fontStyle: 'italic' }}>Note: CA state tax not deductible from CA taxes</div>
                <div style={{ ...s.costLine, fontWeight: '600', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '6px' }}>
                  <span>Total Itemized:</span><span style={{ color: '#eab308' }}>{fmt$(tb.caItemized)}</span>
                </div>
              </div>

              <div style={s.costLine}><span>vs Standard Deduction:</span><span>{fmt$(tb.caStd)}</span></div>
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', textAlign: 'center',
                background: tb.shouldItemizeCA ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                border: tb.shouldItemizeCA ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(248,113,113,0.4)',
                color: tb.shouldItemizeCA ? '#4ade80' : '#f87171'
              }}>
                {tb.shouldItemizeCA ? '✓ Itemize (+' + fmt$(tb.caItemized - tb.caStd) + ' extra deductions)' : '✗ Take Standard Deduction'}
              </div>
            </div>
          </div>
        </div>

        {/* Annual Tax Savings Summary with Calculation Breakdown */}
        <div style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.1))', borderRadius: '20px', padding: '28px', border: '2px solid rgba(74,222,128,0.4)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#4ade80', marginTop: 0, marginBottom: '20px' }}>💰 Estimated Annual Tax Savings from Homeownership</h3>

          {/* Summary Row */}
          <div className="hpo-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>Federal Savings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4ade80' }}>{fmt$(tb.fedTaxSavings)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>California Savings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4ade80' }}>{fmt$(tb.caTaxSavings)}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginBottom: '4px' }}>Total Annual Savings</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{fmt$(tb.totalTaxSavings)}</div>
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(74,222,128,0.3)', paddingTop: '20px' }}>
            {/* Federal Calculation */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '600' }}>Federal Savings Breakdown</div>
              {tb.shouldItemizeFed ? (
                <>
                  <div style={{ ...s.costLine, fontSize: '0.85rem' }}><span>Itemized total:</span><span>{fmt$(tb.fedItemized)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', color: '#f87171' }}><span>Minus standard deduction:</span><span>-{fmt$(stdDeduction)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', fontWeight: '600', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '6px' }}>
                    <span>Extra deductions:</span><span>{fmt$(Math.max(0, tb.fedItemized - stdDeduction))}</span>
                  </div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', color: '#fb923c' }}><span>Times marginal rate:</span><span>× {fmtPct(tb.fedRate)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.95rem', fontWeight: '700', color: '#4ade80', borderTop: '1px solid rgba(74,222,128,0.3)', paddingTop: '8px', marginTop: '6px' }}>
                    <span>Federal tax savings:</span><span>{fmt$(tb.fedTaxSavings)}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7', fontStyle: 'italic' }}>
                  Standard deduction ({fmt$(stdDeduction)}) exceeds itemized ({fmt$(tb.fedItemized)}). No additional federal savings from homeownership deductions.
                </div>
              )}
            </div>

            {/* California Calculation */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#eab308', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '600' }}>California Savings Breakdown</div>
              {tb.shouldItemizeCA ? (
                <>
                  <div style={{ ...s.costLine, fontSize: '0.85rem' }}><span>Itemized total:</span><span>{fmt$(tb.caItemized)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', color: '#f87171' }}><span>Minus standard deduction:</span><span>-{fmt$(tb.caStd)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', fontWeight: '600', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '6px' }}>
                    <span>Extra deductions:</span><span>{fmt$(Math.max(0, tb.caItemized - tb.caStd))}</span>
                  </div>
                  <div style={{ ...s.costLine, fontSize: '0.85rem', color: '#fb923c' }}><span>Times marginal rate:</span><span>× {fmtPct(tb.caRate)}</span></div>
                  <div style={{ ...s.costLine, fontSize: '0.95rem', fontWeight: '700', color: '#4ade80', borderTop: '1px solid rgba(74,222,128,0.3)', paddingTop: '8px', marginTop: '6px' }}>
                    <span>California tax savings:</span><span>{fmt$(tb.caTaxSavings)}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#8b8ba7', fontStyle: 'italic' }}>
                  Standard deduction ({fmt$(tb.caStd)}) exceeds itemized ({fmt$(tb.caItemized)}). No additional CA savings from homeownership deductions.
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#8b8ba7', textAlign: 'center' }}>
            Compared to renting (taking standard deduction) • {fmt$(tb.totalTaxSavings / 12)}/month effective savings
          </div>
          
          {/* CTA: Factor Into Budget */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('optimize')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              💵 See Full Cost Analysis
            </button>
            <button
              onClick={() => setActiveTab('afford')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid rgba(74,222,128,0.4)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                background: 'rgba(74,222,128,0.1)',
                color: '#4ade80',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📊 Factor Into Affordability
            </button>
          </div>
        </div>

        {/* Investment Interest Rules */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Investment Interest Deduction Rules</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: '600', marginBottom: '12px' }}>✓ What IS Deductible</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#c0c0d0', fontSize: '0.85rem', lineHeight: '1.8' }}>
                <li>Interest on margin loans (if used for investments)</li>
                <li>HELOC interest (if proceeds invested)</li>
                <li>Cash-out refi interest (cash-out portion only)</li>
                <li>Limited to your net investment income</li>
              </ul>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#f87171', fontWeight: '600', marginBottom: '12px' }}>✗ What Counts as Investment Income</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#c0c0d0', fontSize: '0.85rem', lineHeight: '1.8' }}>
                <li>Dividends (ordinary and qualified)</li>
                <li>Interest income</li>
                <li>Short-term capital gains</li>
                <li><strong>NOT</strong> unrealized appreciation</li>
                <li><strong>NOT</strong> long-term gains (unless you elect)</li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#a78bfa' }}>
            <strong>Your Deduction Limit:</strong> Based on {dividendYield}% dividend yield, you can deduct up to {fmt$((stockPortfolio + homePrice * 0.5) * dividendYield / 100)} in investment interest annually.
          </div>
        </div>

        {/* Quick Reference */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Quick Reference: Key Tax Numbers</h3>
          <table style={s.table}>
            <tbody>
              <tr><td style={s.td}>Federal Standard Deduction ({filingStatus})</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(stdDeduction)}</td></tr>
              <tr><td style={s.td}>California Standard Deduction ({filingStatus})</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(tb.caStd)}</td></tr>
              <tr><td style={s.td}>SALT Cap (Federal)</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(10000)}</td></tr>
              <tr><td style={s.td}>Mortgage Interest Limit (Federal)</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(750000)}</td></tr>
              <tr><td style={s.td}>Mortgage Interest Limit (California)</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(1000000)}</td></tr>
              <tr><td style={s.td}>CA Mental Health Tax Threshold (all filers)</td><td style={{ ...s.td, textAlign: 'right' }}>{fmt$(tb.mentalHealthThreshold)}</td></tr>
              <tr style={{ background: 'rgba(249,115,22,0.1)' }}><td style={{ ...s.td, fontWeight: '600' }}>Your Combined Marginal Rate</td><td style={{ ...s.td, textAlign: 'right', fontWeight: '600', color: '#f97316' }}>{fmtPct(combRate)}</td></tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // Sensitivity Analysis Tab
  const renderSensitivity = () => {
    const opt = optimizationResult?.optimal;
    if (!opt) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div className="hpo-verdict-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
          <h2 className="hpo-section-title" style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: '16px', color: '#fff' }}>Run Optimization First</h2>
          <p style={{ color: '#8b8ba7', marginBottom: '32px' }}>
            Sensitivity analysis shows how changes in assumptions affect your break-even year.
          </p>
          <button style={{ ...s.btn, width: 'auto', padding: '16px 48px' }} onClick={handleOptimize}>🚀 Run Optimization</button>
        </div>
      );
    }

    // Interactive "What If?" slider
    const whatIfRate = whatIfAppreciation !== null ? whatIfAppreciation : homeAppreciation;
    const whatIfBreakEven = (() => {
      if (whatIfAppreciation === null) return opt.breakEvenYear;
      const scenario = calcScenario({
        homePrice, cashDown: opt.cashDown, marginLoan: opt.marginLoan, helocAmount: opt.helocAmount,
        mortgageRate: mortgageRate / 100, loanTerm, appreciationRate: whatIfAppreciation / 100,
        investmentReturn: investmentReturn / 100, dividendYield: dividendYield / 100,
        monthlyRent, rentGrowthRate: rentGrowth / 100, marginRate: marginRate / 100,
        helocRate: helocRate / 100, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
      });
      return scenario.breakEvenYear;
    })();
    const whatIfAdvantage = (() => {
      if (whatIfAppreciation === null) return opt.yearlyAnalysis?.[9]?.advantage || 0;
      const scenario = calcScenario({
        homePrice, cashDown: opt.cashDown, marginLoan: opt.marginLoan, helocAmount: opt.helocAmount,
        mortgageRate: mortgageRate / 100, loanTerm, appreciationRate: whatIfAppreciation / 100,
        investmentReturn: investmentReturn / 100, dividendYield: dividendYield / 100,
        monthlyRent, rentGrowthRate: rentGrowth / 100, marginRate: marginRate / 100,
        helocRate: helocRate / 100, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
      });
      return scenario.yearlyAnalysis?.[9]?.advantage || 0;
    })();

    // Calculate sensitivity scenarios
    const baseBreakEven = opt.breakEvenYear === 'Never' ? 31 : opt.breakEvenYear;
    
    // Generate scenarios for 3x3 matrix (Home Appreciation vs Investment Return)
    const appreciationRange = [homeAppreciation - 2, homeAppreciation, homeAppreciation + 2];
    const returnRange = [investmentReturn - 2, investmentReturn, investmentReturn + 2];
    
    // Calculate break-even for each scenario
    const calculateBreakEven = (appRate, invReturn) => {
      const scenario = calcScenario({
        homePrice,
        cashDown: opt.cashDown,
        marginLoan: opt.marginLoan,
        helocAmount: opt.helocAmount,
        mortgageRate: mortgageRate / 100,
        loanTerm,
        appreciationRate: appRate / 100,
        investmentReturn: invReturn / 100,
        dividendYield: dividendYield / 100,
        monthlyRent,
        rentGrowthRate: rentGrowth / 100,
        marginRate: marginRate / 100,
        helocRate: helocRate / 100,
        fedRate,
        caRate,
        stateTax,
        stdDeduction,
        filingStatus,
        grossIncome
      });
      return scenario.breakEvenYear === 'Never' ? 31 : scenario.breakEvenYear;
    };

    // Generate matrix data
    const matrix = appreciationRange.map(appRate => 
      returnRange.map(invReturn => ({
        appRate,
        invReturn,
        breakEven: calculateBreakEven(appRate, invReturn)
      }))
    );

    // Calculate sensitivity (impact of each variable)
    const sensitivities = [
      {
        variable: 'Home Appreciation',
        icon: '🏠',
        lowValue: homeAppreciation - 2,
        baseValue: homeAppreciation,
        highValue: homeAppreciation + 2,
        lowBreakEven: calculateBreakEven(homeAppreciation - 2, investmentReturn),
        highBreakEven: calculateBreakEven(homeAppreciation + 2, investmentReturn),
        unit: '%'
      },
      {
        variable: 'Investment Return',
        icon: '📈',
        lowValue: investmentReturn - 2,
        baseValue: investmentReturn,
        highValue: investmentReturn + 2,
        lowBreakEven: calculateBreakEven(homeAppreciation, investmentReturn - 2),
        highBreakEven: calculateBreakEven(homeAppreciation, investmentReturn + 2),
        unit: '%'
      },
      {
        variable: 'Mortgage Rate',
        icon: '🏦',
        lowValue: mortgageRate - 1,
        baseValue: mortgageRate,
        highValue: mortgageRate + 1,
        lowBreakEven: (() => {
          const scenario = calcScenario({
            ...opt,
            homePrice,
            cashDown: opt.cashDown,
            marginLoan: opt.marginLoan,
            helocAmount: opt.helocAmount,
            mortgageRate: (mortgageRate - 1) / 100,
            loanTerm,
            appreciationRate: homeAppreciation / 100,
            investmentReturn: investmentReturn / 100,
            dividendYield: dividendYield / 100,
            monthlyRent,
            rentGrowthRate: rentGrowth / 100,
            marginRate: marginRate / 100,
            helocRate: helocRate / 100,
            fedRate,
            caRate,
            stateTax,
            stdDeduction,
            filingStatus,
            grossIncome
          });
          return scenario.breakEvenYear === 'Never' ? 31 : scenario.breakEvenYear;
        })(),
        highBreakEven: (() => {
          const scenario = calcScenario({
            ...opt,
            homePrice,
            cashDown: opt.cashDown,
            marginLoan: opt.marginLoan,
            helocAmount: opt.helocAmount,
            mortgageRate: (mortgageRate + 1) / 100,
            loanTerm,
            appreciationRate: homeAppreciation / 100,
            investmentReturn: investmentReturn / 100,
            dividendYield: dividendYield / 100,
            monthlyRent,
            rentGrowthRate: rentGrowth / 100,
            marginRate: marginRate / 100,
            helocRate: helocRate / 100,
            fedRate,
            caRate,
            stateTax,
            stdDeduction,
            filingStatus,
            grossIncome
          });
          return scenario.breakEvenYear === 'Never' ? 31 : scenario.breakEvenYear;
        })(),
        unit: '%'
      },
      {
        variable: 'Rent Growth',
        icon: '📊',
        lowValue: rentGrowth - 1,
        baseValue: rentGrowth,
        highValue: rentGrowth + 1,
        lowBreakEven: (() => {
          const scenario = calcScenario({
            homePrice,
            cashDown: opt.cashDown,
            marginLoan: opt.marginLoan,
            helocAmount: opt.helocAmount,
            mortgageRate: mortgageRate / 100,
            loanTerm,
            appreciationRate: homeAppreciation / 100,
            investmentReturn: investmentReturn / 100,
            dividendYield: dividendYield / 100,
            monthlyRent,
            rentGrowthRate: (rentGrowth - 1) / 100,
            marginRate: marginRate / 100,
            helocRate: helocRate / 100,
            fedRate,
            caRate,
            stateTax,
            stdDeduction,
            filingStatus,
            grossIncome
          });
          return scenario.breakEvenYear === 'Never' ? 31 : scenario.breakEvenYear;
        })(),
        highBreakEven: (() => {
          const scenario = calcScenario({
            homePrice,
            cashDown: opt.cashDown,
            marginLoan: opt.marginLoan,
            helocAmount: opt.helocAmount,
            mortgageRate: mortgageRate / 100,
            loanTerm,
            appreciationRate: homeAppreciation / 100,
            investmentReturn: investmentReturn / 100,
            dividendYield: dividendYield / 100,
            monthlyRent,
            rentGrowthRate: (rentGrowth + 1) / 100,
            marginRate: marginRate / 100,
            helocRate: helocRate / 100,
            fedRate,
            caRate,
            stateTax,
            stdDeduction,
            filingStatus,
            grossIncome
          });
          return scenario.breakEvenYear === 'Never' ? 31 : scenario.breakEvenYear;
        })(),
        unit: '%/yr'
      }
    ].map(s => ({
      ...s,
      impact: Math.abs(s.highBreakEven - s.lowBreakEven),
      direction: s.highBreakEven > s.lowBreakEven ? 'negative' : 'positive'
    })).sort((a, b) => b.impact - a.impact);

    // Find load-bearing assumptions
    const loadBearing = sensitivities.filter(s => s.impact >= 3);

    return (
      <>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
          borderRadius: '20px',
          padding: '24px',
          border: '2px solid rgba(139,92,246,0.4)',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div className="hpo-verdict-emoji" style={{ fontSize: '3rem', marginBottom: '8px' }}>📊</div>
          <h2 className="hpo-section-title" style={{ fontSize: '1.8rem', fontWeight: '700', color: '#a78bfa', marginBottom: '8px' }}>Sensitivity Analysis</h2>
          <p style={{ color: '#c0c0d0', margin: 0 }}>
            How changes in assumptions affect your break-even year
          </p>
        </div>

        {/* Interactive What If? Slider */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.3rem' }}>🎛️</span>
            <div>
              <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>What If? — Home Appreciation</div>
              <div style={{ fontSize: '0.78rem', color: '#8b8ba7' }}>Drag the slider to see how appreciation affects your outcome</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#8b8ba7', minWidth: '20px' }}>0%</span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={whatIfRate}
              onChange={(e) => setWhatIfAppreciation(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#a78bfa' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#8b8ba7', minWidth: '25px' }}>10%</span>
            <div style={{
              background: 'rgba(167,139,250,0.2)',
              border: '1px solid rgba(167,139,250,0.4)',
              borderRadius: '8px',
              padding: '6px 14px',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#a78bfa' }}>{whatIfRate.toFixed(1)}%</div>
              <div style={{ fontSize: '0.6rem', color: '#8b8ba7' }}>per year</div>
            </div>
          </div>

          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>Break-Even</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: whatIfBreakEven === 'Never' ? '#f87171' : whatIfBreakEven <= 7 ? '#4ade80' : '#fbbf24' }}>
                {whatIfBreakEven === 'Never' ? 'Never' : `Year ${whatIfBreakEven}`}
              </div>
              {whatIfAppreciation !== null && opt.breakEvenYear !== whatIfBreakEven && (
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px' }}>
                  was: {opt.breakEvenYear === 'Never' ? 'Never' : `Year ${opt.breakEvenYear}`} at {homeAppreciation}%
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginBottom: '4px' }}>10-Year Advantage</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: whatIfAdvantage >= 0 ? '#4ade80' : '#f87171' }}>
                {whatIfAdvantage >= 0 ? '+' : ''}{fmt$(whatIfAdvantage)}
              </div>
              {whatIfAppreciation !== null && (
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px' }}>
                  vs renting over 10 years
                </div>
              )}
            </div>
          </div>

          {whatIfAppreciation !== null && (
            <button
              onClick={() => setWhatIfAppreciation(null)}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: '#8b8ba7', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
            >
              Reset to default ({homeAppreciation}%)
            </button>
          )}
        </div>

        {/* Load-Bearing Assumptions Alert */}
        {loadBearing.length > 0 && (
          <div style={{
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '1rem' }}>Load-Bearing Assumptions</span>
            </div>
            <p style={{ color: '#d0d0e0', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
              These assumptions have the biggest impact on your break-even. Small changes could shift the verdict:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {loadBearing.map((s, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(251,191,36,0.2)',
                  border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  {s.icon} {s.variable} ({s.impact} year impact)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tornado Chart */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>🌪️ Tornado Chart - Variable Impact</h3>
          <p style={{ color: '#8b8ba7', fontSize: '0.85rem', marginBottom: '20px' }}>
            Shows how each variable affects break-even year. Base case: Year {baseBreakEven > 30 ? 'Never' : baseBreakEven}
          </p>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {sensitivities.map((s, i) => {
              const maxImpact = Math.max(...sensitivities.map(x => x.impact));
              const barWidth = maxImpact > 0 ? (s.impact / maxImpact) * 100 : 0;
              
              return (
                <div key={i} className="hpo-tornado-row" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>{s.icon} {s.variable}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8ba7' }}>{s.lowValue}{s.unit} → {s.highValue}{s.unit}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    {/* Center line (base case) */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '50%', 
                      top: 0, 
                      bottom: 0, 
                      width: '2px', 
                      background: 'rgba(255,255,255,0.3)',
                      zIndex: 1 
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                      {/* Low scenario bar (left) */}
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '4px' }}>
                        <div style={{
                          height: '28px',
                          width: `${barWidth / 2}%`,
                          background: s.lowBreakEven < baseBreakEven ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #f87171, #ef4444)',
                          borderRadius: '4px 0 0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          paddingLeft: '8px',
                          minWidth: barWidth > 0 ? '40px' : '0'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '600' }}>
                            {s.lowBreakEven > 30 ? '∞' : `Y${s.lowBreakEven}`}
                          </span>
                        </div>
                      </div>
                      
                      {/* High scenario bar (right) */}
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', paddingLeft: '4px' }}>
                        <div style={{
                          height: '28px',
                          width: `${barWidth / 2}%`,
                          background: s.highBreakEven < baseBreakEven ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                          borderRadius: '0 4px 4px 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '8px',
                          minWidth: barWidth > 0 ? '40px' : '0'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '600' }}>
                            {s.highBreakEven > 30 ? '∞' : `Y${s.highBreakEven}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#8b8ba7' }}>{s.lowValue}{s.unit}</span>
                      <span style={{ fontSize: '0.65rem', color: '#f97316' }}>Base: Y{baseBreakEven > 30 ? '∞' : baseBreakEven}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8b8ba7' }}>{s.highValue}{s.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div className="hpo-tornado-legend" style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4ade80' }}></span>
                Earlier break-even (better for buying)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f87171' }}></span>
                Later break-even (worse for buying)
              </span>
            </div>
          </div>
        </div>

        {/* 3x3 Matrix */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>📋 Break-Even Matrix: Home Appreciation vs Investment Return</h3>
          <p style={{ color: '#8b8ba7', fontSize: '0.85rem', marginBottom: '20px' }}>
            Break-even year for different combinations of home appreciation and investment returns
          </p>
          
          <div className="hpo-matrix-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ ...s.table, textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, textAlign: 'center' }}></th>
                  {returnRange.map((r, i) => (
                    <th key={i} style={{ ...s.th, textAlign: 'center' }}>
                      📈 {r}% Return
                      {r === investmentReturn && <span style={{ color: '#f97316' }}> (base)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td style={{ ...s.td, fontWeight: '600', textAlign: 'left' }}>
                      🏠 {appreciationRange[rowIdx]}% Appreciation
                      {appreciationRange[rowIdx] === homeAppreciation && <span style={{ color: '#f97316' }}> (base)</span>}
                    </td>
                    {row.map((cell, colIdx) => {
                      const isBase = cell.appRate === homeAppreciation && cell.invReturn === investmentReturn;
                      const isBetter = cell.breakEven < baseBreakEven;
                      const isWorse = cell.breakEven > baseBreakEven;
                      
                      return (
                        <td 
                          key={colIdx} 
                          style={{ 
                            ...s.td, 
                            textAlign: 'center',
                            background: isBase ? 'rgba(249,115,22,0.2)' : isBetter ? 'rgba(74,222,128,0.1)' : isWorse ? 'rgba(248,113,113,0.1)' : 'transparent',
                            border: isBase ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.05)',
                            fontWeight: isBase ? '700' : '500'
                          }}
                        >
                          <div style={{ 
                            fontSize: '1.1rem', 
                            color: cell.breakEven > 30 ? '#f87171' : isBetter ? '#4ade80' : isWorse ? '#f87171' : '#fff' 
                          }}>
                            {cell.breakEven > 30 ? 'Never' : `Year ${cell.breakEven}`}
                          </div>
                          {!isBase && (
                            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '2px' }}>
                              {cell.breakEven < baseBreakEven ? `${baseBreakEven - cell.breakEven}yr sooner` : cell.breakEven > baseBreakEven ? `${cell.breakEven - baseBreakEven}yr later` : 'same'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interpretation */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>💡 Interpretation</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'rgba(74,222,128,0.1)', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ color: '#4ade80', fontWeight: '600', marginBottom: '6px' }}>When Buying Wins</div>
              <div style={{ color: '#d0d0e0', fontSize: '0.9rem' }}>
                Higher home appreciation ({homeAppreciation + 2}%+) or lower investment returns ({investmentReturn - 2}% or less) favor buying. 
                {loadBearing.length > 0 && ` Your most sensitive variable is ${loadBearing[0].variable}.`}
              </div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(248,113,113,0.1)', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.2)' }}>
              <div style={{ color: '#f87171', fontWeight: '600', marginBottom: '6px' }}>When Renting Wins</div>
              <div style={{ color: '#d0d0e0', fontSize: '0.9rem' }}>
                Lower home appreciation ({homeAppreciation - 2}% or less) or higher investment returns ({investmentReturn + 2}%+) favor renting + investing.
              </div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ color: '#a78bfa', fontWeight: '600', marginBottom: '6px' }}>Key Insight</div>
              <div style={{ color: '#d0d0e0', fontSize: '0.9rem' }}>
                The {sensitivities[0].variable.toLowerCase()} assumption has the biggest impact on your decision ({sensitivities[0].impact} years between best and worst case).
                {baseBreakEven <= 7 && ' Even with unfavorable assumptions, buying may still make sense given your relatively quick base-case break-even.'}
                {baseBreakEven > 15 && ' Consider stress-testing with more conservative assumptions before committing.'}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAffordability = () => {
    const { options, monthlyTakeHome } = affordability;

    const leverageLabels = {
      0.50: { name: 'Play it Safe', desc: 'Large down payment, low monthly costs, instant equity' },
      0.30: { name: 'Solid', desc: 'Strong equity from day one with manageable payments' },
      0.20: { name: 'Sweet Spot', desc: 'Avoids PMI, balances buying power with financial flexibility' },
      0.10: { name: 'Stretch', desc: 'More house, but PMI applies until you hit 20% equity' },
      0.05: { name: 'Go Big', desc: 'Maximum buying power — PMI and higher monthly costs' },
    };

    // Reverse so cards go from least leverage (50%) to most (5%)
    const displayOptions = [...options].reverse().map(opt => ({
      ...opt,
      ...(leverageLabels[opt.dpPct] || { name: `${(opt.dpPct * 100).toFixed(0)}% Down`, desc: '' }),
    }));

    // Recommendation: prefer 20% (no PMI), fall back to 30%, then whatever works
    const recommended = displayOptions.find(o => o.dpPct === 0.20 && o.remaining >= 0 && o.maxPrice > 0)
      || displayOptions.find(o => o.dpPct === 0.30 && o.remaining >= 0 && o.maxPrice > 0)
      || displayOptions.find(o => o.remaining >= 0 && o.maxPrice > 0);

    const selected = displayOptions.find(o => o.dpPct === affSelectedDpPct) || displayOptions[0];
    const comfortLevel = (pct) => {
      if (pct <= 0.20) return { label: 'Excellent', color: '#4ade80', desc: 'Under 20% of take-home — plenty left for retirement savings, investments, and lifestyle' };
      if (pct <= 0.30) return { label: 'Comfortable', color: '#60a5fa', desc: 'The classic "30% rule" adjusted for after-tax income — sustainable long-term' };
      if (pct <= 0.40) return { label: 'Stretched', color: '#fbbf24', desc: 'Workable for high earners, but you\'ll need discipline on other spending' };
      if (pct <= 0.50) return { label: 'Heavy', color: '#f97316', desc: 'HUD considers this "housing-burdened" — expect trade-offs on savings and lifestyle' };
      return { label: 'Unsustainable', color: '#f87171', desc: 'Over half your paycheck goes to housing — very high financial stress risk' };
    };
    const takeHomeColor = (pct) => comfortLevel(pct).color;

    return (
      <>
        {/* Educational Intro */}
        <div className="hpo-card" style={{ ...s.card, background: 'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(59,130,246,0.04))', border: '1px solid rgba(96,165,250,0.2)', marginBottom: '24px' }}>
          <h3 style={{ ...s.section, marginTop: 0, color: '#60a5fa' }}>How Home Affordability Works</h3>
          <div style={{ fontSize: '0.88rem', color: '#c0c0d0', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '12px' }}>When you apply for a mortgage, lenders check two things:</p>
            <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem' }}>1</span>
                <div><strong style={{ color: '#fbbf24' }}>Debt-to-Income (DTI) Ratio</strong> — Your monthly housing costs (mortgage + taxes + insurance) can't exceed ~43% of your gross monthly income. This is the main limit on how much house your <em>income</em> supports.</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem' }}>2</span>
                <div><strong style={{ color: '#a78bfa' }}>Down Payment + Closing Costs</strong> — You need enough cash for the down payment (3-50% of home price) plus ~3-4% in closing costs. This is the limit on how much house your <em>savings</em> supports.</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#8b8ba7' }}>Below, we calculate the maximum home price limited by whichever constraint binds first — income or savings. The comfort level shows how that payment compares to your actual take-home pay (after taxes).</p>
          </div>
        </div>

        {/* Section A: The Answer */}
        {recommended && recommended.maxPrice > 0 && (
          <div className="hpo-plan-card" style={{ ...s.planCard, textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: '#f97316', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Based on your situation, shop for homes around</div>
            <div className="hpo-hero-price" style={{ fontSize: '3.2rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{fmt$(recommended.maxPrice)}</div>
            <div style={{ fontSize: '1rem', color: '#b0b0c0', marginBottom: '20px' }}>
              {fmtPctWhole(recommended.dpPct * 100)} down · {fmt$(recommended.monthlyPITI)}/mo · {fmtPctWhole(recommended.takeHomePct * 100)} of take-home pay
            </div>
            <div className="hpo-preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '500px', margin: '0 auto 20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>vs Your Rent</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: recommended.vsRent > 0 ? '#fbbf24' : '#4ade80' }}>
                  {recommended.vsRent >= 0 ? '+' : ''}{fmt$(recommended.vsRent)}/mo
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>Savings After</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#4ade80' }}>{fmt$(recommended.remaining)}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>Buffer Runway</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#4ade80' }}>{Math.floor(recommended.bufferMonths)} months</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '20px', maxWidth: '550px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              {recommended.dpPct === 0.20
                ? `20% down avoids PMI, keeps ${fmtPctWhole((recommended.remaining / totalSavings) * 100)} of your savings invested, and housing is ${fmtPctWhole(recommended.takeHomePct * 100)} of your take-home — well within comfort zone.`
                : recommended.dpPct === 0.30
                ? `30% down builds strong equity and keeps your monthly at ${fmtPctWhole(recommended.takeHomePct * 100)} of take-home.`
                : recommended.dpPct === 0.10
                ? `10% down gets you more house. PMI adds to costs until you reach 20% equity. Housing is ${fmtPctWhole(recommended.takeHomePct * 100)} of take-home.`
                : recommended.dpPct === 0.50
                ? `50% down minimizes your monthly payment to just ${fmtPctWhole(recommended.takeHomePct * 100)} of take-home.`
                : `At ${fmtPctWhole(recommended.dpPct * 100)} down, housing is ${fmtPctWhole(recommended.takeHomePct * 100)} of your take-home pay.`}
            </div>
            {recommended.limitedBy === 'savings' && recommended.maxPriceByIncome > recommended.maxPrice && (
              <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginBottom: '20px', padding: '10px 16px', background: 'rgba(167,139,250,0.08)', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.2)', maxWidth: '550px', margin: '0 auto 20px' }}>
                Your income supports up to {fmt$(recommended.maxPriceByIncome)} — but your available cash ({fmt$(totalSavings - minBuffer)}) limits you to {fmt$(recommended.maxPrice)} at {fmtPctWhole(recommended.dpPct * 100)} down. Increase savings or lower your buffer to unlock more.
              </div>
            )}
            {recommended.limitedBy === 'income' && (
              <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginBottom: '20px', padding: '10px 16px', background: 'rgba(251,191,36,0.08)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)', maxWidth: '550px', margin: '0 auto 20px' }}>
                Your savings could support a bigger down payment, but monthly costs at this price are near the lender max (43% DTI).
              </div>
            )}
            {affTargetComfort !== null && (
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginBottom: '20px', padding: '10px 16px', background: 'rgba(96,165,250,0.08)', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.2)', maxWidth: '550px', margin: '0 auto 20px' }}>
                At your {fmtPctWhole(affTargetComfort * 100)} comfort target. Select "Max" above to see the absolute maximum.
              </div>
            )}
            <button onClick={() => { setHomePrice(recommended.maxPrice); setActiveTab('optimize'); }} style={{
              padding: '14px 32px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600',
              background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff',
            }}>Use This Price</button>
          </div>
        )}

        {/* Additional Inputs */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Additional Monthly Costs</h3>
          <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={s.inputGroup}>
              <label style={s.label}>Monthly HOA</label>
              <CurrencyInput value={affMonthlyHOA} onChange={setAffMonthlyHOA} min={0} max={5000} style={s.input} />
            </div>
            <div style={s.inputGroup}>
              <label style={s.label}>Other Monthly Debt (car, student loans, etc.)</label>
              <CurrencyInput value={affMonthlyOtherDebt} onChange={setAffMonthlyOtherDebt} min={0} max={50000} style={s.input} />
            </div>
          </div>
        </div>

        {/* Comfort Target Selector */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>How much of your paycheck for housing?</h3>
          <p style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '8px' }}>
            Financial advisors use the "30% rule" — spend no more than 30% of gross income on housing. But for high earners in California paying ~45% effective tax, 30% of gross is actually ~55% of take-home.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '16px' }}>
            These targets use your <strong style={{ color: '#fff' }}>after-tax take-home</strong> instead — a more honest picture. Pick a comfort level, or select Max to see the absolute ceiling lenders would approve.
          </p>
          <div className="hpo-comfort-chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
            {[
              { value: 0.20, label: '20%', desc: 'Excellent', color: '#4ade80' },
              { value: 0.30, label: '30%', desc: 'Comfortable', color: '#60a5fa' },
              { value: 0.40, label: '40%', desc: 'Stretched', color: '#fbbf24' },
              { value: 0.50, label: '50%', desc: 'Heavy', color: '#f97316' },
              { value: 0.75, label: '75%', desc: 'Extreme', color: '#f87171' },
              { value: null, label: 'Max', desc: 'DTI Ceiling', color: '#a78bfa' },
            ].map((opt, i) => {
              const isSelected = affTargetComfort === opt.value;
              return (
                <div key={i} onClick={() => setAffTargetComfort(opt.value)} style={{
                  background: isSelected ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
                  border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '12px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: isSelected ? opt.color : '#fff', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.65rem', color: isSelected ? opt.color : '#8b8ba7', fontWeight: '600' }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
          {affTargetComfort !== null && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#60a5fa', padding: '10px 16px', background: 'rgba(96,165,250,0.08)', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.2)' }}>
              Showing homes where housing costs ~{fmtPctWhole(affTargetComfort * 100)} of your take-home ({fmt$(monthlyTakeHome)}/mo). Still capped at lender limits (43% DTI).
            </div>
          )}
        </div>

        {/* Section B: The Spectrum */}
        <h3 style={s.section}>{affTargetComfort !== null ? `Homes at ${fmtPctWhole(affTargetComfort * 100)} of take-home` : 'What if you want more or less house?'}</h3>
        <p style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '16px', marginTop: '-8px' }}>
          {affTargetComfort !== null
            ? `Each card shows the max home price where monthly costs stay at ~${fmtPctWhole(affTargetComfort * 100)} of take-home. Click to explore.`
            : 'Less down payment = more house, but higher monthly costs. Click to explore.'}
        </p>
        <div className="hpo-spectrum-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {displayOptions.filter(o => o.dpPct !== 0.30).map((opt, i) => {
            const isSelected = opt.dpPct === affSelectedDpPct;
            const isRec = recommended && opt.dpPct === recommended.dpPct;
            const thPct = opt.takeHomePct;
            const barWidth = Math.min(100, Math.max(5, thPct * 200)); // scale 0-50% to 0-100% width
            return (
              <div key={i} onClick={() => setAffSelectedDpPct(opt.dpPct)} style={{
                background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)',
                borderRadius: '14px', padding: '18px', cursor: 'pointer',
                border: isSelected ? '2px solid #f97316' : isRec ? '2px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s', position: 'relative',
              }}>
                {isRec && (
                  <div style={{ position: 'absolute', top: '-8px', right: '8px', background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff', fontSize: '0.55rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Best Fit</div>
                )}
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: isSelected ? '#f97316' : '#8b8ba7', marginBottom: '4px', fontWeight: '600' }}>{opt.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '10px' }}>{fmtPctWhole(opt.dpPct * 100)} down</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{fmt$(opt.maxPrice)}</div>
                <div style={{ fontSize: '0.8rem', color: '#b0b0c0', marginBottom: '6px' }}>{fmt$(opt.monthlyPITI)}/mo</div>
                {/* Take-home heat bar */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', height: '6px', marginBottom: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: '4px', background: takeHomeColor(thPct) }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: takeHomeColor(thPct), marginBottom: '2px' }}>{fmtPctWhole(thPct * 100)} of take-home</div>
                <div style={{ fontSize: '0.6rem', color: comfortLevel(thPct).color, fontWeight: '600' }}>{comfortLevel(thPct).label}</div>
                {opt.limitedBy === 'savings' && opt.maxPriceByIncome > opt.maxPrice && (
                  <div style={{ fontSize: '0.6rem', color: '#a78bfa', marginTop: '2px' }}>Income supports {fmt$(opt.maxPriceByIncome)}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section C: Selected Option Deep Dive */}
        <div className="hpo-card" style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>{selected.name} — {fmtPctWhole(selected.dpPct * 100)} Down Payment</h3>
          <p style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: '16px' }}>{selected.desc}</p>

          <div className="hpo-deep-dive-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Max Home Price', value: fmt$(selected.maxPrice), color: '#fff' },
              { label: 'Cash Needed', value: fmt$(selected.cashNeeded), color: '#fff' },
              { label: 'Savings After', value: fmt$(selected.remaining), color: selected.remaining >= 0 ? '#4ade80' : '#f87171' },
              { label: 'Buffer Runway', value: selected.bufferMonths > 0 ? `${Math.floor(selected.bufferMonths)} months` : '—', color: selected.bufferMonths >= 12 ? '#4ade80' : selected.bufferMonths >= 6 ? '#fbbf24' : '#f87171' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b8ba7', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly Breakdown */}
          {selected.maxPrice > 0 && (
            <>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b8ba7', marginBottom: '12px' }}>Monthly Payment Breakdown</h4>
              <div className="hpo-monthly-breakdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'P&I', value: selected.monthlyBreakdown.pi, color: '#60a5fa' },
                  { label: 'Property Tax', value: selected.monthlyBreakdown.tax, color: '#f97316' },
                  { label: 'Insurance', value: selected.monthlyBreakdown.insurance, color: '#a78bfa' },
                  { label: 'PMI', value: selected.monthlyBreakdown.pmi, color: '#f87171' },
                  { label: 'HOA', value: selected.monthlyBreakdown.hoa, color: '#4ade80' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: item.color, textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>{fmt$(item.value)}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const bd = selected.monthlyBreakdown;
                const total = bd.pi + bd.tax + bd.insurance + bd.pmi + bd.hoa;
                if (total <= 0) return null;
                const segments = [
                  { label: 'P&I', value: bd.pi, color: '#60a5fa' },
                  { label: 'Tax', value: bd.tax, color: '#f97316' },
                  { label: 'Ins', value: bd.insurance, color: '#a78bfa' },
                  { label: 'PMI', value: bd.pmi, color: '#f87171' },
                  { label: 'HOA', value: bd.hoa, color: '#4ade80' },
                ].filter(seg => seg.value > 0);
                return (
                  <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', height: '24px', marginBottom: '16px' }}>
                    {segments.map((seg, i) => (
                      <div key={i} title={`${seg.label}: ${fmt$(seg.value)}`}
                        style={{ width: `${(seg.value / total) * 100}%`, background: seg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '600', color: '#000', minWidth: seg.value / total > 0.05 ? '28px' : '0' }}>
                        {seg.value / total > 0.08 ? seg.label : ''}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {/* Context comparisons */}
          {selected.maxPrice > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>vs Your Rent ({fmt$(monthlyRent)}/mo)</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: selected.vsRent > 0 ? '#fbbf24' : '#4ade80' }}>
                    {selected.vsRent >= 0 ? '+' : ''}{fmt$(selected.vsRent)}/mo
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>Share of Take-Home (~{fmt$(monthlyTakeHome)}/mo)</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: takeHomeColor(selected.takeHomePct) }}>
                    {fmtPctWhole(selected.takeHomePct * 100)}
                  </span>
                </div>
                {/* Housing Comfort Gauge */}
                {(() => {
                  const cl = comfortLevel(selected.takeHomePct);
                  const pctClamped = Math.min(1, Math.max(0, selected.takeHomePct));
                  const tiers = [
                    { label: 'Excellent', end: 0.20, color: '#4ade80' },
                    { label: 'Comfortable', end: 0.30, color: '#60a5fa' },
                    { label: 'Stretched', end: 0.40, color: '#fbbf24' },
                    { label: 'Heavy', end: 0.50, color: '#f97316' },
                    { label: 'Unsustainable', end: 1.0, color: '#f87171' },
                  ];
                  return (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase', letterSpacing: '1px' }}>Housing Comfort Level</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: cl.color }}>{cl.label}</span>
                      </div>
                      {/* Gauge bar */}
                      <div style={{ position: 'relative', height: '12px', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                        {tiers.map((t, i) => {
                          const prev = i === 0 ? 0 : tiers[i - 1].end;
                          return <div key={i} style={{ flex: `${(t.end - prev) * 100}`, background: t.color, opacity: 0.25 }} />;
                        })}
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctClamped * 100}%`, borderRadius: '6px', background: cl.color, transition: 'width 0.3s' }} />
                      </div>
                      {/* Scale labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        {['0%', '25%', '50%', '75%', '100%'].map((l, i) => (
                          <span key={i} style={{ fontSize: '0.6rem', color: '#666' }}>{l}</span>
                        ))}
                      </div>
                      {/* Tier labels */}
                      <div style={{ display: 'flex', marginTop: '2px' }}>
                        {tiers.map((t, i) => {
                          const prev = i === 0 ? 0 : tiers[i - 1].end;
                          return <span key={i} style={{ flex: `${(t.end - prev) * 100}`, fontSize: '0.55rem', color: t.color, textAlign: 'center', opacity: 0.7 }}>{t.label}</span>;
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: cl.color, marginTop: '6px', fontStyle: 'italic' }}>{cl.desc}</div>
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8b8ba7' }}>
                    {selected.limitedBy === 'savings'
                      ? 'Your income supports up to'
                      : 'Your savings support up to'}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#8b8ba7' }}>
                    {selected.limitedBy === 'savings'
                      ? fmt$(selected.maxPriceByIncome)
                      : fmt$(totalSavings - minBuffer)}
                  </span>
                </div>
                {selected.limitedBy === 'savings' && (
                  <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontStyle: 'italic' }}>
                    You have the income for more house, but would need more cash saved to go higher at {fmtPctWhole(selected.dpPct * 100)} down.
                  </div>
                )}
                {selected.limitedBy === 'income' && (
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontStyle: 'italic' }}>
                    You have the savings for a bigger down payment, but monthly costs would exceed lender limits.
                  </div>
                )}
              </div>
            </div>
          )}

          {selected.maxPrice > 0 && (
            <button onClick={() => { setHomePrice(selected.maxPrice); setActiveTab('optimize'); }} style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600',
              background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff',
            }}>Use {fmt$(selected.maxPrice)} as Home Price</button>
          )}
        </div>

        {/* Section D: Assumptions */}
        <div className="hpo-card" style={{ ...s.card, background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ ...s.section, marginTop: 0 }}>How This Works</h3>
          <div style={{ fontSize: '0.82rem', color: '#8b8ba7', lineHeight: '1.7' }}>
            <p style={{ marginBottom: '10px' }}>For each down payment level, we find the maximum home price limited by whichever binds first:</p>
            <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '10px' }}>
              <strong style={{ color: '#fbbf24' }}>Income:</strong> Monthly housing cost (PITI: principal, interest, taxes, insurance + HOA) cannot exceed 43% of gross income — the max most lenders approve.
            </div>
            <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '10px' }}>
              <strong style={{ color: '#a78bfa' }}>Savings:</strong> Down payment + closing costs cannot exceed your savings minus {fmt$(minBuffer)} buffer.
            </div>
            <div className="hpo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginTop: '12px' }}>
              <div>Property Tax: {fmtPct(SF.propTaxRate)} (SF avg)</div>
              <div>Insurance: 0.35% of home price</div>
              <div>PMI (private mortgage insurance): 0.50%/yr of loan (if {'<'}20% down)</div>
              <div>Loan: {loanTerm}yr at {mortgageRate}%</div>
              <div>Take-home est: ~{fmtPctWhole((1 - estEffectiveTaxRate) * 100)} of gross</div>
              <div>Closing: ~{fmtPct(SF.closeBuy)} + transfer tax</div>
            </div>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Tax benefits from mortgage interest are not included — see the Taxes tab.
            </p>
          </div>
        </div>

        {/* Share affordability results */}
        <div className="hpo-share-btns" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
          <button
            onClick={copyAffordabilitySummary}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s',
              background: affordCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
              color: affordCopied ? '#4ade80' : '#8b8ba7',
              border: affordCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {affordCopied ? '✓ Copied!' : '📋 Copy Affordability Summary'}
          </button>
          <button
            onClick={copyShareLink}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s',
              background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
              color: linkCopied ? '#4ade80' : '#8b8ba7',
              border: linkCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {linkCopied ? '✓ Copied!' : '🔗 Share Link'}
          </button>
        </div>

        {/* Bridge CTA: Affordability → Best Strategy */}
        {recommended && recommended.maxPrice > 0 && (
          <div className="hpo-card" style={{ ...s.card, background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))', border: '2px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Next Step</div>
            <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px', lineHeight: '1.6' }}>
              Now that you know your range, find the <strong style={{ color: '#4ade80' }}>best down payment and financing strategy</strong> for your situation.
            </div>
            <button onClick={() => { if (recommended) setHomePrice(recommended.maxPrice); handleOptimize(); setActiveTab('optimize'); }} style={{
              padding: '14px 32px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
            }}>Find Best Strategy for {fmt$(recommended.maxPrice)}</button>
            <div style={{ fontSize: '0.75rem', color: '#8b8ba7', marginTop: '8px' }}>Tests hundreds of combinations to find your optimal approach</div>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={s.container} className="hpo-container">
      <style>{`
        /* ========== GLOBAL RESETS ========== */
        html { overflow-x: hidden; }
        input, select, textarea {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        input[type="range"] {
          -webkit-appearance: auto;
          -moz-appearance: auto;
          appearance: auto;
        }

        /* ========== TABLET (900px) ========== */
        @media (max-width: 900px) {
          /* Layout */
          .hpo-grid { grid-template-columns: 1fr !important; }
          .hpo-grid aside { max-height: none !important; }
          .hpo-panel { padding: 20px !important; }
          .hpo-card { padding: 20px !important; }
          .hpo-plan-card { padding: 24px !important; }

          /* Tab bar: horizontal scroll */
          .hpo-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap !important; scrollbar-width: none; -ms-overflow-style: none; }
          .hpo-tabs::-webkit-scrollbar { display: none; }
          .hpo-tabs button { white-space: nowrap !important; flex-shrink: 0 !important; }

          /* Grids: collapse columns */
          .hpo-verdict-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-cash-flow-grid { grid-template-columns: 1fr !important; }
          .hpo-risk-grid { grid-template-columns: 1fr !important; }
          .hpo-comfort-chips { grid-template-columns: repeat(3, 1fr) !important; }
          .hpo-spectrum-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-deep-dive-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-monthly-breakdown { grid-template-columns: repeat(3, 1fr) !important; }
          .hpo-scenario-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-assumptions-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-three-col { grid-template-columns: repeat(3, 1fr) !important; }
          .hpo-two-col { gap: 16px !important; }

          /* Affordability indicator */
          .hpo-affordability-indicator { flex-direction: column !important; text-align: center !important; }
          .hpo-affordability-indicator > div:nth-child(2) { border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }

          /* Charts */
          .hpo-chart { height: 280px !important; }
        }

        /* ========== MOBILE (600px) ========== */
        @media (max-width: 600px) {
          /* Layout */
          .hpo-container { padding: 12px !important; }
          .hpo-panel { padding: 16px !important; max-height: none !important; }
          .hpo-card { padding: 16px !important; }
          .hpo-plan-card { padding: 20px !important; }

          /* Typography */
          .hpo-title { font-size: 1.8rem !important; }
          .hpo-verdict-emoji { font-size: 2.2rem !important; }
          .hpo-verdict-text { font-size: 1.5rem !important; }
          .hpo-hero-price { font-size: 2.4rem !important; }
          .hpo-tax-rate-val { font-size: 1.5rem !important; }
          .hpo-section-title { font-size: 1.4rem !important; }

          /* Tab bar */
          .hpo-tabs { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; padding-bottom: 8px !important; }
          .hpo-tabs::-webkit-scrollbar { display: none; }
          .hpo-tabs button { padding: 10px 14px !important; font-size: 0.78rem !important; white-space: nowrap !important; flex-shrink: 0 !important; }

          /* All multi-col grids -> stack or reduce */
          .hpo-two-col { grid-template-columns: 1fr !important; }
          .hpo-three-col { grid-template-columns: 1fr !important; }
          .hpo-tax-rates { grid-template-columns: 1fr !important; }
          .hpo-preset-grid { grid-template-columns: 1fr !important; }
          .hpo-scenario-cards { grid-template-columns: 1fr !important; }
          .hpo-assumptions-grid { grid-template-columns: 1fr !important; }
          .hpo-margin-grid { grid-template-columns: 1fr !important; }
          .hpo-verdict-metrics { grid-template-columns: 1fr 1fr !important; }
          .hpo-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-comfort-chips { grid-template-columns: repeat(3, 1fr) !important; }
          .hpo-spectrum-cards { grid-template-columns: 1fr !important; }
          .hpo-deep-dive-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-monthly-breakdown { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-cost-table { grid-template-columns: 1fr 90px 90px !important; font-size: 0.78rem !important; }

          /* Tornado chart: stack label above bar */
          .hpo-tornado-row { grid-template-columns: 1fr !important; gap: 4px !important; }
          .hpo-tornado-row > div:first-child { text-align: left !important; }
          .hpo-tornado-legend { flex-direction: column !important; gap: 8px !important; align-items: flex-start !important; }

          /* Matrix table: horizontal scroll */
          .hpo-matrix-wrapper { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .hpo-matrix-wrapper table { min-width: 480px !important; }
          .hpo-matrix-wrapper th, .hpo-matrix-wrapper td { padding: 8px 6px !important; font-size: 0.75rem !important; }

          /* Buttons */
          .hpo-cta-btn { width: 100% !important; font-size: 0.9rem !important; }
          .hpo-share-btns { flex-direction: column !important; align-items: stretch !important; }
          .hpo-share-btns button { width: 100% !important; justify-content: center !important; }

          /* Header */
          .hpo-header-controls { justify-content: center !important; gap: 8px !important; }

          /* Chart legend */
          .hpo-chart-legend { font-size: 0.7rem !important; }

          /* Charts */
          .hpo-chart { height: 240px !important; }
        }

        /* ========== EXTRA SMALL (400px) ========== */
        @media (max-width: 400px) {
          .hpo-container { padding: 8px !important; }
          .hpo-title { font-size: 1.5rem !important; }
          .hpo-card { padding: 12px !important; }
          .hpo-plan-card { padding: 14px !important; }
          .hpo-panel { padding: 12px !important; }
          .hpo-verdict-emoji { font-size: 1.8rem !important; }
          .hpo-verdict-text { font-size: 1.2rem !important; }
          .hpo-hero-price { font-size: 2rem !important; }
          .hpo-tax-rate-val { font-size: 1.3rem !important; }
          .hpo-comfort-chips { grid-template-columns: repeat(2, 1fr) !important; }
          .hpo-deep-dive-metrics { grid-template-columns: 1fr !important; }
          .hpo-monthly-breakdown { grid-template-columns: 1fr !important; }
          .hpo-metrics { grid-template-columns: 1fr !important; }
          .hpo-verdict-metrics { grid-template-columns: 1fr !important; }
          .hpo-preset-grid { grid-template-columns: 1fr !important; }
          .hpo-chart { height: 200px !important; }
          .hpo-tabs button { padding: 8px 10px !important; font-size: 0.72rem !important; }
          .hpo-cost-table { grid-template-columns: 1fr 80px 80px !important; font-size: 0.72rem !important; gap: 2px 8px !important; }
        }
      `}</style>
      <header style={s.header}>
        <h1 style={s.title} className="hpo-title">Home Purchase Optimizer</h1>
        <p style={{ color: '#8b8ba7', fontSize: '1rem' }}>AI-powered strategy optimization for SF homebuyers</p>
        <div className="hpo-header-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', color: '#fb923c' }}>🌉 San Francisco Edition</div>
          <button 
            onClick={copyShareLink}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.15)', 
              border: linkCopied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(99,102,241,0.3)', 
              borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', 
              color: linkCopied ? '#4ade80' : '#818cf8',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {linkCopied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
          
          {/* Expert/Quick Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '3px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => { setIsExpertMode(false); setActiveTab('afford'); }}
              style={{
                padding: '6px 14px',
                borderRadius: '18px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: !isExpertMode ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'transparent',
                color: !isExpertMode ? '#fff' : '#8b8ba7'
              }}
            >
              🎯 Quick
            </button>
            <button
              onClick={() => setIsExpertMode(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '18px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isExpertMode ? 'linear-gradient(135deg, #a78bfa, #8b5cf6)' : 'transparent',
                color: isExpertMode ? '#fff' : '#8b8ba7'
              }}
            >
              🔬 Expert
            </button>
          </div>
        </div>
      </header>
      
      <div style={s.grid} className="hpo-grid">
        <aside className="hpo-panel" style={s.panel}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Your Situation</h3>
          <div style={s.inputGroup}>
            <label style={s.label}>Target Home Price</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Use "What Can I Buy?" tab if unsure</div>
            <CurrencyInput
              style={s.input}
              value={homePrice}
              onChange={setHomePrice}
              min={100000}
              max={50000000}
              error={validationErrors.homePrice}
              onValidate={(valid, err) => setFieldError('homePrice', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Total Cash Savings</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Cash available for down payment + closing costs</div>
            <CurrencyInput
              style={s.input}
              value={totalSavings}
              onChange={setTotalSavings}
              min={0}
              max={50000000}
              error={validationErrors.totalSavings}
              onValidate={(valid, err) => setFieldError('totalSavings', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Gross Income</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Before taxes — used for DTI ratio and take-home</div>
            <CurrencyInput
              style={s.input}
              value={grossIncome}
              onChange={setGrossIncome}
              min={1}
              max={50000000}
              error={validationErrors.grossIncome}
              onValidate={(valid, err) => setFieldError('grossIncome', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Monthly Rent</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Current rent — used to compare owning vs renting</div>
            <CurrencyInput
              style={s.input}
              value={monthlyRent}
              onChange={setMonthlyRent}
              min={0}
              max={100000}
              error={validationErrors.monthlyRent}
              onValidate={(valid, err) => setFieldError('monthlyRent', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Filing Status</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Affects tax brackets and take-home pay</div>
            <select style={s.select} value={filingStatus} onChange={e => setFilingStatus(e.target.value)}>
              <option value="married">Married Filing Jointly</option>
              <option value="single">Single / Head of Household</option>
            </select>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Mortgage Rate (%)</label>
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '-2px', marginBottom: '4px' }}>Current 30-year fixed — check with lenders for quotes</div>
            <NumberInput
              style={s.input}
              value={mortgageRate}
              onChange={setMortgageRate}
              min={0.1}
              max={20}
              step={0.125}
              error={validationErrors.mortgageRate}
              onValidate={(valid, err) => setFieldError('mortgageRate', err)}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
            style={{
              width: '100%', padding: '10px', marginTop: '8px', marginBottom: '4px',
              background: showAdvancedInputs ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              color: '#a78bfa', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <span>{showAdvancedInputs ? '▼' : '▶'} Advanced Settings</span>
            <span style={{ fontSize: '0.7rem', color: '#8b8ba7' }}>Buffer, rates, returns</span>
          </button>

          {showAdvancedInputs && (<>
          <div style={s.inputGroup}>
            <label style={s.label}>Min. Buffer</label>
            <CurrencyInput
              style={s.input}
              value={minBuffer}
              onChange={setMinBuffer}
              min={0}
              max={10000000}
              error={validationErrors.minBuffer}
              onValidate={(valid, err) => setFieldError('minBuffer', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Stock Portfolio</label>
            <CurrencyInput
              style={s.input}
              value={stockPortfolio}
              onChange={setStockPortfolio}
              min={0}
              max={50000000}
              error={validationErrors.stockPortfolio}
              onValidate={(valid, err) => setFieldError('stockPortfolio', err)}
            />
          </div>

          <div style={s.auto}>
            <div style={{ fontSize: '0.7rem', color: '#fb923c', textTransform: 'uppercase' }}>Combined Rate</div>
            <div style={{ fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{fmtPct(combRate)}</div>
          </div>

          <h3 style={s.section}>Rates & Returns</h3>
          <div style={s.inputGroup}>
            <label style={s.label}>Margin (%)</label>
            <NumberInput 
              style={s.input} 
              value={marginRate} 
              onChange={setMarginRate} 
              min={0} 
              max={20} 
              step={0.25}
              error={validationErrors.marginRate}
              onValidate={(valid, err) => setFieldError('marginRate', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>HELOC (%)</label>
            <NumberInput 
              style={s.input} 
              value={helocRate} 
              onChange={setHelocRate} 
              min={0} 
              max={20} 
              step={0.25}
              error={validationErrors.helocRate}
              onValidate={(valid, err) => setFieldError('helocRate', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Cash-Out Refi (%)</label>
            <NumberInput 
              style={s.input} 
              value={cashOutRefiRate} 
              onChange={setCashOutRefiRate} 
              min={0} 
              max={20} 
              step={0.125}
              error={validationErrors.cashOutRefiRate}
              onValidate={(valid, err) => setFieldError('cashOutRefiRate', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Total Investment Return (%)</label>
            <NumberInput 
              style={s.input} 
              value={investmentReturn} 
              onChange={setInvestmentReturn} 
              min={-20} 
              max={30} 
              step={0.5}
              error={validationErrors.investmentReturn}
              onValidate={(valid, err) => setFieldError('investmentReturn', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Dividend/Income Yield (%)</label>
            <NumberInput 
              style={s.input} 
              value={dividendYield} 
              onChange={setDividendYield} 
              min={0} 
              max={20} 
              step={0.25}
              error={validationErrors.dividendYield}
              onValidate={(valid, err) => setFieldError('dividendYield', err)}
            />
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px' }}>For investment interest deduction limit (actual income only)</div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Home Appreciation (%)</label>
            <NumberInput 
              style={s.input} 
              value={homeAppreciation} 
              onChange={setHomeAppreciation} 
              min={-10} 
              max={20} 
              step={0.5}
              error={validationErrors.homeAppreciation}
              onValidate={(valid, err) => setFieldError('homeAppreciation', err)}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Rent Growth (%/yr)</label>
            <NumberInput 
              style={s.input} 
              value={rentGrowth} 
              onChange={setRentGrowth} 
              min={-5} 
              max={15} 
              step={0.5}
              error={validationErrors.rentGrowth}
              onValidate={(valid, err) => setFieldError('rentGrowth', err)}
            />
          </div>
          </>)}

          <button
            style={{
              ...s.btn,
              opacity: isFormValid ? 1 : 0.5,
              cursor: isFormValid ? 'pointer' : 'not-allowed'
            }}
            onClick={handleOptimize}
            disabled={!isFormValid}
          >
            🚀 Run Optimization
          </button>
          {!isFormValid && (
            <div style={{ 
              marginTop: '8px', 
              padding: '10px 12px', 
              background: 'rgba(248,113,113,0.1)', 
              border: '1px solid rgba(248,113,113,0.3)', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠</span> Please fix validation errors above before running optimization
            </div>
          )}
        </aside>
        
        <main>
          {/* Quick Mode Banner */}
          {!isExpertMode && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(22,163,74,0.1))',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🎯</span>
                <div>
                  <div style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.95rem' }}>Quick Mode</div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.8rem' }}>Start with what you can afford, then get your best strategy. Switch to Expert for deep analysis.</div>
                </div>
              </div>
              <button
                onClick={() => setIsExpertMode(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(167,139,250,0.4)',
                  background: 'rgba(167,139,250,0.1)',
                  color: '#a78bfa',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🔬 Switch to Expert
              </button>
            </div>
          )}

          <div style={s.tabs} className="hpo-tabs">
            <button style={{ ...s.tab, ...(activeTab === 'afford' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('afford')}>What Can I Buy?</button>
            <button style={{ ...s.tab, ...(activeTab === 'optimize' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('optimize')}>Best Strategy</button>
            {isExpertMode && (
              <>
                <button style={{ ...s.tab, ...(activeTab === 'scenarios' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('scenarios')}>Side-by-Side</button>
                <button style={{ ...s.tab, ...(activeTab === 'holding' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('holding')}>Own vs Rent</button>
                <button style={{ ...s.tab, ...(activeTab === 'sensitivity' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('sensitivity')}>Sensitivity</button>
                <button style={{ ...s.tab, ...(activeTab === 'tax' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('tax')}>Taxes</button>
                <button style={{ ...s.tab, ...(activeTab === 'manual' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('manual')}>Build Your Own</button>
              </>
            )}
          </div>

          {activeTab === 'optimize' && renderOptimize()}
          {isExpertMode && activeTab === 'scenarios' && renderScenarios()}
          {isExpertMode && activeTab === 'manual' && renderManual()}
          {isExpertMode && activeTab === 'tax' && renderTax()}
          {isExpertMode && activeTab === 'holding' && renderHolding()}
          {isExpertMode && activeTab === 'sensitivity' && renderSensitivity()}
          {activeTab === 'afford' && renderAffordability()}
        </main>
      </div>
    </div>
  );
}
