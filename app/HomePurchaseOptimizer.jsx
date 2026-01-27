'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';

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

// Constants
const SF = { propTaxRate: 0.0118, transferTax: 0.0068, parcelTax: 350, realtorComm: 0.05, closeBuy: 0.015, closeSell: 0.01 };

// Utility functions
const calcCAStateTax = (inc, stat) => {
  const rates = [{min:0,max:10412,r:0.01},{min:10412,max:24684,r:0.02},{min:24684,max:38959,r:0.04},{min:38959,max:54081,r:0.06},{min:54081,max:68350,r:0.08},{min:68350,max:349137,r:0.093},{min:349137,max:418961,r:0.103},{min:418961,max:698271,r:0.113},{min:698271,max:Infinity,r:0.123}];
  const m = stat === 'married' ? 2 : 1;
  let tax = 0;
  for (const b of rates) if (inc > b.min * m) tax += Math.max(0, Math.min(inc, b.max * m) - b.min * m) * b.r;
  if (inc > 1000000 * m) tax += (inc - 1000000 * m) * 0.01;
  return tax;
};

const getFedRate = (inc, stat) => {
  const br = stat === 'married' ? [{min:0,max:23200,r:0.10},{min:23200,max:94300,r:0.12},{min:94300,max:201050,r:0.22},{min:201050,max:383900,r:0.24},{min:383900,max:487450,r:0.32},{min:487450,max:731200,r:0.35},{min:731200,max:Infinity,r:0.37}] : [{min:0,max:11600,r:0.10},{min:11600,max:47150,r:0.12},{min:47150,max:100525,r:0.22},{min:100525,max:191950,r:0.24},{min:191950,max:243725,r:0.32},{min:243725,max:609350,r:0.35},{min:609350,max:Infinity,r:0.37}];
  for (const b of br) if (inc >= b.min && inc < b.max) return b.r;
  return 0.37;
};

const getCARate = (inc, stat) => {
  const m = stat === 'married' ? 2 : 1;
  const br = [{min:0,max:10412,r:0.01},{min:10412,max:24684,r:0.02},{min:24684,max:38959,r:0.04},{min:38959,max:54081,r:0.06},{min:54081,max:68350,r:0.08},{min:68350,max:349137,r:0.093},{min:349137,max:418961,r:0.103},{min:418961,max:698271,r:0.113},{min:698271,max:Infinity,r:0.123}];
  for (const b of br) if (inc >= b.min * m && inc < b.max * m) return b.r;
  return 0.123;
};

const calcMonthly = (p, r, y) => { if (p <= 0) return 0; const mr = r/12, n = y*12; return mr === 0 ? p/n : p*(mr*Math.pow(1+mr,n))/(Math.pow(1+mr,n)-1); };

const genAmort = (principal, rate, years) => {
  if (principal <= 0) return { schedule: [], monthlyPayment: 0, totalInterest: 0 };
  const mp = calcMonthly(principal, rate, years), mr = rate / 12, schedule = [];
  let bal = principal, totInt = 0, totPrin = 0;
  for (let m = 1; m <= years * 12; m++) {
    const intPay = bal * mr, prinPay = mp - intPay;
    bal = Math.max(0, bal - prinPay); totInt += intPay; totPrin += prinPay;
    if (m % 12 === 0) schedule.push({ year: m / 12, balance: bal, interestPaid: totInt, principalPaid: totPrin, yearlyInterest: schedule.length > 0 ? totInt - schedule[schedule.length - 1].interestPaid : totInt, yearlyPrincipal: schedule.length > 0 ? totPrin - schedule[schedule.length - 1].principalPaid : totPrin });
  }
  return { schedule, monthlyPayment: mp, totalInterest: totInt };
};

const calcPMI = (loan, home) => {
  if (loan <= 0 || loan/home <= 0.80) return { monthly: 0, years: 0, total: 0 };
  const target = home * 0.78, mp = calcMonthly(loan, 0.065, 30), mr = 0.065/12;
  let bal = loan, months = 0;
  while (bal > target && months < 360) { bal -= (mp - bal*mr); months++; }
  const monthly = loan * 0.005 / 12;
  return { monthly, years: months/12, total: monthly * months };
};

const calcTxCosts = (price, loan) => {
  const buy = price * SF.transferTax + price * SF.closeBuy + loan * 0.005 + Math.min(15000, price * 0.003) + 2500;
  const sell = price * SF.realtorComm + price * SF.transferTax + price * SF.closeSell + Math.min(50000, price * 0.01);
  return { buy, sell, total: buy + sell };
};

// Core scenario calculation - FIXED VERSION
const calcScenario = (params) => {
  const { homePrice, cashDown, marginLoan, helocAmount, mortgageRate, loanTerm, appreciationRate, investmentReturn, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction } = params;
  
  // Determine if this is a cash purchase (no mortgage)
  const totalEquityInput = cashDown + marginLoan;
  const needsMortgage = totalEquityInput < homePrice;
  const mortgageLoan = needsMortgage ? homePrice - totalEquityInput : 0;
  
  // HELOC can only be taken on a home you own outright (no mortgage)
  // OR on the equity portion of a mortgaged home (home equity)
  const actualHELOC = !needsMortgage ? helocAmount : 0; // Only if no mortgage
  
  const propTax = homePrice * SF.propTaxRate + SF.parcelTax;
  const insurance = homePrice * 0.003;
  const maintenance = homePrice * 0.01;
  const pmi = calcPMI(mortgageLoan, homePrice);
  const tx = calcTxCosts(homePrice, mortgageLoan);
  const amort = genAmort(mortgageLoan, mortgageRate, loanTerm);
  
  // Interest calculations - annual
  const mortgageInterestAnnual = mortgageLoan * mortgageRate;
  const marginInterestAnnual = marginLoan * marginRate;
  const helocInterestAnnual = actualHELOC * helocRate;
  const totalInterestAnnual = mortgageInterestAnnual + marginInterestAnnual + helocInterestAnnual;
  
  // Investment income from borrowed funds invested
  // Margin loan: stocks stay invested, so full portfolio generates returns
  // HELOC: proceeds are invested
  const marginInvestmentIncome = marginLoan > 0 ? marginLoan * investmentReturn : 0; // Conservative: only count margin amount
  const helocInvestmentIncome = actualHELOC * investmentReturn;
  const totalInvestmentIncome = marginInvestmentIncome + helocInvestmentIncome;
  
  // Tax deductions - CORRECTED LOGIC
  // 1. Mortgage interest: deductible on Schedule A (up to $750K loan limit)
  const deductibleMortgageInterest = Math.min(mortgageLoan, 750000) * mortgageRate;
  const nonDeductibleMortgageInterest = mortgageInterestAnnual - deductibleMortgageInterest;
  
  // 2. Margin interest: deductible as INVESTMENT interest (Schedule A, line 9)
  //    Limited to net investment income
  const deductibleMarginInterest = Math.min(marginInterestAnnual, marginInvestmentIncome);
  const nonDeductibleMarginInterest = marginInterestAnnual - deductibleMarginInterest;
  
  // 3. HELOC interest: if proceeds used for investment, it's investment interest
  //    Deductible up to investment income (combined with margin)
  const remainingInvestmentIncomeForHELOC = Math.max(0, totalInvestmentIncome - deductibleMarginInterest);
  const deductibleHELOCInterest = Math.min(helocInterestAnnual, remainingInvestmentIncomeForHELOC);
  const nonDeductibleHELOCInterest = helocInterestAnnual - deductibleHELOCInterest;
  
  // Itemized deductions for Schedule A
  const saltCapped = Math.min(stateTax + propTax, 10000);
  const saltLost = Math.max(0, stateTax + propTax - 10000);
  const itemizedTotal = deductibleMortgageInterest + saltCapped;
  const shouldItemize = itemizedTotal > stdDeduction;
  
  // Tax benefits calculation
  // Mortgage interest benefit (only if itemizing and exceeds standard)
  const mortgageTaxBenefit = shouldItemize ? Math.max(0, itemizedTotal - stdDeduction) * fedRate : 0;
  
  // Investment interest benefit (deductible against ordinary income at combined rate)
  const investmentInterestDeduction = deductibleMarginInterest + deductibleHELOCInterest;
  const investInterestTaxBenefit = investmentInterestDeduction * (fedRate + caRate);
  
  const totalTaxBenefit = mortgageTaxBenefit + investInterestTaxBenefit;
  
  // Effective interest rates (after tax benefit)
  const netMortgageInterest = mortgageInterestAnnual - (shouldItemize ? deductibleMortgageInterest * fedRate : 0);
  const netMarginInterest = marginInterestAnnual - (deductibleMarginInterest * (fedRate + caRate));
  const netHELOCInterest = helocInterestAnnual - (deductibleHELOCInterest * (fedRate + caRate));
  
  const mortgageEffectiveRate = mortgageLoan > 0 ? netMortgageInterest / mortgageLoan : 0;
  const marginEffectiveRate = marginLoan > 0 ? netMarginInterest / marginLoan : 0;
  const helocEffectiveRate = actualHELOC > 0 ? netHELOCInterest / actualHELOC : 0;
  
  const totalBorrowed = mortgageLoan + marginLoan + actualHELOC;
  const totalNetInterest = netMortgageInterest + netMarginInterest + netHELOCInterest;
  const blendedEffectiveRate = totalBorrowed > 0 ? totalNetInterest / totalBorrowed : 0;
  
  // Non-recoverable costs breakdown
  const nonRecovBreakdown = {
    mortgageInterest: mortgageInterestAnnual,
    marginInterest: marginInterestAnnual,
    helocInterest: helocInterestAnnual,
    pmi: pmi.monthly * 12,
    propertyTax: propTax,
    insurance: insurance,
    maintenance: maintenance,
    grossTotal: totalInterestAnnual + pmi.monthly * 12 + propTax + insurance + maintenance,
    mortgageTaxBenefit: -mortgageTaxBenefit,
    investInterestTaxBenefit: -investInterestTaxBenefit,
    totalTaxBenefit: -totalTaxBenefit,
    netTotal: totalInterestAnnual + pmi.monthly * 12 + propTax + insurance + maintenance - totalTaxBenefit
  };
  
  // Holding period / wealth analysis
  // CORRECTED MODEL:
  // - Owner: pays mortgage + costs from income, builds equity
  // - Renter: pays rent from income, invests what owner would have spent on down payment
  // - The NET difference in monthly costs goes to/from savings
  // - Both portfolios compound
  
  const yearlyAnalysis = [];
  
  // Renter starts by investing what owner spent on down payment + closing costs
  const renterInitialInvestment = totalEquityInput + tx.buy;
  let renterPortfolio = renterInitialInvestment;
  
  // Owner may have remaining savings after purchase (if HELOC gave cash back)
  // For simplicity, we assume owner keeps that in investments too
  // The key comparison is: who ends up with more wealth?
  
  for (let y = 1; y <= 30; y++) {
    const homeVal = homePrice * Math.pow(1 + appreciationRate, y);
    const amortData = amort.schedule[y-1] || amort.schedule[amort.schedule.length - 1] || { balance: 0, yearlyInterest: 0 };
    const loanBal = amortData.balance || 0;
    
    // Owner equity = home value - remaining mortgage - margin loan - HELOC
    const equity = homeVal - loanBal - marginLoan - actualHELOC;
    
    const yPropTax = propTax * Math.pow(1.02, y - 1); // Prop 13
    const marketPropTax = homeVal * SF.propTaxRate;
    const prop13Savings = marketPropTax - yPropTax;
    
    // Owner's yearly costs (what they pay from income)
    const yMortgageInt = amortData.yearlyInterest || (mortgageLoan * mortgageRate * Math.pow(0.97, y));
    const yMortgagePrincipal = amortData.yearlyPrincipal || (amort.monthlyPayment * 12 - yMortgageInt);
    const yItemized = yMortgageInt * (mortgageLoan <= 750000 ? 1 : 750000/mortgageLoan) + saltCapped;
    const yMortgageBenefit = yItemized > stdDeduction ? (yItemized - stdDeduction) * fedRate : 0;
    const yInvestBenefit = investInterestTaxBenefit;
    const yTotalBenefit = yMortgageBenefit + yInvestBenefit;
    
    // Total owner outflow (from income): P&I + margin int + HELOC int + PMI + taxes + insurance + maintenance
    const yOwnerOutflow = (amort.monthlyPayment * 12) + marginInterestAnnual + helocInterestAnnual + 
                          (y <= pmi.years ? pmi.monthly * 12 : 0) + 
                          yPropTax + insurance + maintenance - yTotalBenefit;
    
    // Renter's yearly cost (from income)
    const yRent = monthlyRent * 12 * Math.pow(1.03, y - 1); // 3% annual rent increase
    
    // CORRECTED: Renter's portfolio compounds, then they invest/withdraw the cost difference
    // If renting is cheaper, renter invests the difference
    // If owning is cheaper, renter must withdraw from portfolio (or we assume income covers both)
    
    // Simpler model: Both pay housing from income. 
    // Renter's portfolio just compounds (they're not withdrawing to pay rent)
    // This is fair because owner isn't liquidating home equity to pay mortgage either
    renterPortfolio = renterPortfolio * (1 + investmentReturn);
    
    // If there's a cost difference, the cheaper option can invest the savings
    const costDiff = yOwnerOutflow - yRent;
    if (costDiff > 0) {
      // Owning costs more - renter could invest the difference
      renterPortfolio += costDiff;
    }
    // Note: We don't subtract if owning is cheaper because that would require
    // the renter to have income, which they do (same as owner)
    
    // Owner wealth if sold today: equity minus selling costs
    const ownerWealth = equity - tx.sell;
    
    yearlyAnalysis.push({
      year: y,
      homeValue: homeVal,
      loanBalance: loanBal,
      equity,
      ownerWealth,
      renterWealth: renterPortfolio,
      advantage: ownerWealth - renterPortfolio,
      breakEven: ownerWealth >= renterPortfolio,
      prop13Savings,
      taxBenefit: yTotalBenefit,
      yearlyInterest: yMortgageInt,
      yearlyPrincipal: yMortgagePrincipal,
      ownerOutflow: yOwnerOutflow,
      yearlyRent: yRent,
      costDiff
    });
  }
  
  const breakEvenYear = yearlyAnalysis.find(y => y.breakEven)?.year || 'Never';
  
  return {
    homePrice, 
    totalDown: totalEquityInput, 
    cashDown, 
    marginLoan, 
    helocAmount: actualHELOC,
    mortgageLoan,
    needsMortgage,
    monthlyPayment: amort.monthlyPayment + pmi.monthly,
    pmi, 
    txCosts: tx, 
    amort,
    // Interest details
    mortgageInterestAnnual,
    marginInterestAnnual,
    helocInterestAnnual,
    totalInterestAnnual,
    // Deductibility
    deductibleMortgageInterest,
    nonDeductibleMortgageInterest,
    deductibleMarginInterest,
    nonDeductibleMarginInterest,
    deductibleHELOCInterest,
    nonDeductibleHELOCInterest,
    investmentInterestDeduction,
    // Investment income
    totalInvestmentIncome,
    // Tax
    itemizedTotal,
    stdDeduction,
    shouldItemize,
    saltCapped,
    saltLost,
    mortgageTaxBenefit,
    investInterestTaxBenefit,
    totalTaxBenefit,
    // Effective rates
    mortgageEffectiveRate,
    marginEffectiveRate,
    helocEffectiveRate,
    blendedEffectiveRate,
    // Costs
    nonRecovBreakdown,
    propTax,
    insurance,
    maintenance,
    // Analysis
    yearlyAnalysis,
    breakEvenYear,
    ownerWealth20: yearlyAnalysis[19]?.ownerWealth || 0,
    renterWealth20: yearlyAnalysis[19]?.renterWealth || 0
  };
};

// Optimization engine - FIXED VERSION
const runOptimization = (params) => {
  const { homePrice, totalSavings, stockPortfolio, mortgageRate, loanTerm, appreciationRate, investmentReturn, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, minBuffer } = params;
  
  const results = [];
  const maxMarginPct = 0.30;
  
  // Strategy 1: Traditional (cash down + mortgage)
  for (const dpPct of [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
    const cashDown = homePrice * dpPct;
    const scenario = calcScenario({
      homePrice, cashDown, marginLoan: 0, helocAmount: 0,
      mortgageRate, loanTerm, appreciationRate, investmentReturn, monthlyRent,
      marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction
    });
    
    const remaining = totalSavings - cashDown - scenario.txCosts.buy;
    if (remaining >= minBuffer && cashDown <= totalSavings - minBuffer) {
      results.push({ 
        ...scenario, 
        strategy: 'Traditional', 
        strategyDesc: `${(dpPct*100).toFixed(0)}% cash down + Mortgage`, 
        remaining, 
        riskLevel: 'Low', 
        dpPct: dpPct * 100 
      });
    }
  }
  
  // Strategy 2: Margin + Mortgage (use margin for part of down payment)
  for (const dpPct of [0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
    for (const marginPct of [0.10, 0.15, 0.20, 0.25, 0.30]) {
      const marginLoan = stockPortfolio * marginPct;
      const totalDown = homePrice * dpPct;
      const cashDown = Math.max(0, totalDown - marginLoan);
      
      if (cashDown > totalSavings - minBuffer) continue;
      if (marginLoan > stockPortfolio * maxMarginPct) continue;
      
      const scenario = calcScenario({
        homePrice, cashDown, marginLoan, helocAmount: 0,
        mortgageRate, loanTerm, appreciationRate, investmentReturn, monthlyRent,
        marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction
      });
      
      const remaining = totalSavings - cashDown - scenario.txCosts.buy;
      if (remaining >= minBuffer) {
        results.push({ 
          ...scenario, 
          strategy: 'Margin + Mortgage', 
          strategyDesc: `${fmtPctWhole(marginPct*100)} margin + cash → ${(dpPct*100).toFixed(0)}% down`, 
          remaining, 
          riskLevel: marginPct > 0.20 ? 'Medium-High' : 'Medium', 
          dpPct: dpPct * 100 
        });
      }
    }
  }
  
  // Strategy 3: Full Cash Purchase + HELOC
  // This requires: cash + margin >= homePrice
  const maxMargin = stockPortfolio * maxMarginPct;
  const canBuyCash = totalSavings + maxMargin >= homePrice;
  
  if (canBuyCash) {
    for (const marginPct of [0, 0.10, 0.15, 0.20, 0.25, 0.30]) {
      const marginLoan = stockPortfolio * marginPct;
      const cashNeeded = homePrice - marginLoan;
      
      if (cashNeeded > totalSavings) continue;
      
      // Test different HELOC amounts (HELOC gives cash back!)
      for (const helocPct of [0.30, 0.40, 0.50, 0.60, 0.70, 0.80]) {
        const helocAmount = homePrice * helocPct;
        
        const scenario = calcScenario({
          homePrice, cashDown: cashNeeded, marginLoan, helocAmount,
          mortgageRate, loanTerm, appreciationRate, investmentReturn, monthlyRent,
          marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction
        });
        
        // Remaining = what you started with - cash used - closing costs + HELOC proceeds
        const remaining = totalSavings - cashNeeded - scenario.txCosts.buy + helocAmount;
        
        if (remaining >= minBuffer) {
          const stratName = marginLoan > 0 ? 'Margin + Cash + HELOC' : 'Cash + HELOC';
          results.push({ 
            ...scenario, 
            strategy: stratName, 
            strategyDesc: `${marginLoan > 0 ? `${fmtPctWhole(marginPct*100)} margin + ` : ''}Full cash + ${(helocPct*100).toFixed(0)}% HELOC`, 
            remaining, 
            riskLevel: marginPct > 0.20 ? 'High' : marginLoan > 0 ? 'Medium-High' : 'Medium', 
            dpPct: 100 
          });
        }
      }
    }
  }
  
  // Score and rank
  const scored = results.map(r => {
    const wealthScore = r.ownerWealth20 / 1000000;
    const breakEvenScore = r.breakEvenYear === 'Never' ? -5 : (30 - r.breakEvenYear) / 30 * 3;
    const riskScore = r.riskLevel === 'Low' ? 1.5 : r.riskLevel === 'Medium' ? 1 : r.riskLevel === 'Medium-High' ? 0.5 : 0;
    const effectiveRateScore = (0.08 - r.blendedEffectiveRate) * 20; // Lower rate = better
    const bufferScore = Math.min(r.remaining / minBuffer, 2) * 0.5; // More buffer = slightly better
    
    return { 
      ...r, 
      score: wealthScore * 0.4 + breakEvenScore * 0.25 + riskScore * 0.1 + effectiveRateScore * 0.15 + bufferScore * 0.1
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // Calculate what's needed for strategies that aren't viable
  const cashNeededForFullCash = homePrice - maxMargin;
  const additionalNeeded = Math.max(0, cashNeededForFullCash - totalSavings + minBuffer);
  
  return {
    allResults: scored,
    optimal: scored[0] || null,
    topFive: scored.slice(0, 5),
    canBuyCash,
    additionalNeeded,
    diagnostics: {
      totalSavings,
      maxMargin,
      totalAvailable: totalSavings + maxMargin,
      homePrice,
      gap: homePrice - (totalSavings + maxMargin)
    }
  };
};

// Format helpers
const fmt$ = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${((v || 0) * 100).toFixed(2)}%`;
const fmtPctWhole = (v) => `${(v || 0).toFixed(0)}%`;

// Main Component
export default function HomePurchaseOptimizer() {
  const [homePrice, setHomePrice] = useState(3500000);
  const [totalSavings, setTotalSavings] = useState(2000000);
  const [stockPortfolio, setStockPortfolio] = useState(1500000);
  const [grossIncome, setGrossIncome] = useState(1500000);
  const [monthlyRent, setMonthlyRent] = useState(8000);
  const [filingStatus, setFilingStatus] = useState('married');
  const [mortgageRate, setMortgageRate] = useState(6.5);
  const [marginRate, setMarginRate] = useState(6.5);
  const [helocRate, setHelocRate] = useState(8.5);
  const [investmentReturn, setInvestmentReturn] = useState(8);
  const [homeAppreciation, setHomeAppreciation] = useState(5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [minBuffer, setMinBuffer] = useState(300000);
  
  // Manual mode inputs
  const [manualDpPct, setManualDpPct] = useState(30);
  const [manualMarginPct, setManualMarginPct] = useState(0);
  const [manualHelocPct, setManualHelocPct] = useState(0);
  
  const [activeTab, setActiveTab] = useState('optimize');
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [openInfoBoxes, setOpenInfoBoxes] = useState({});
  
  const toggleInfo = (id) => setOpenInfoBoxes(p => ({ ...p, [id]: !p[id] }));
  
  const stateTax = useMemo(() => calcCAStateTax(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const fedRate = useMemo(() => getFedRate(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const caRate = useMemo(() => getCARate(grossIncome, filingStatus), [grossIncome, filingStatus]);
  const combRate = fedRate + caRate;
  const stdDeduction = filingStatus === 'married' ? 29200 : 14600;
  
  const handleOptimize = useCallback(() => {
    const result = runOptimization({
      homePrice, totalSavings, stockPortfolio, mortgageRate: mortgageRate/100, loanTerm,
      appreciationRate: homeAppreciation/100, investmentReturn: investmentReturn/100,
      monthlyRent, marginRate: marginRate/100, helocRate: helocRate/100,
      fedRate, caRate, stateTax, stdDeduction, minBuffer
    });
    setOptimizationResult(result);
    setActiveTab('optimize');
  }, [homePrice, totalSavings, stockPortfolio, mortgageRate, loanTerm, homeAppreciation, investmentReturn, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, minBuffer]);

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
      monthlyRent,
      marginRate: marginRate / 100,
      helocRate: helocRate / 100,
      fedRate,
      caRate,
      stateTax,
      stdDeduction
    });
  }, [homePrice, manualDpPct, manualMarginPct, manualHelocPct, stockPortfolio, mortgageRate, loanTerm, homeAppreciation, investmentReturn, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction]);
  
  const manualRemaining = totalSavings - manualScenario.cashDown - manualScenario.txCosts.buy + manualScenario.helocAmount;
  const canManualHELOC = manualScenario.cashDown + (stockPortfolio * manualMarginPct / 100) >= homePrice;

  const s = {
    container: { fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: 'linear-gradient(135deg, #0c1220 0%, #1a1a2e 50%, #16213e 100%)', minHeight: '100vh', color: '#e0e0e0', padding: '24px' },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '2.5rem', fontWeight: '300', background: 'linear-gradient(90deg, #f97316, #eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
    grid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', maxWidth: '1800px', margin: '0 auto' },
    panel: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', height: 'fit-content', maxHeight: '90vh', overflowY: 'auto' },
    section: { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f97316', marginBottom: '16px', fontWeight: '600', marginTop: '24px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '0.85rem', color: '#b0b0c0', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer' },
    slider: { width: '100%', marginTop: '8px', accentColor: '#f97316' },
    btn: { width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: '600', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '20px', background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff' },
    auto: { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
    tab: { padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' },
    tabActive: { background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff' },
    tabInactive: { background: 'rgba(255,255,255,0.05)', color: '#8b8ba7' },
    card: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' },
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '4px 16px', fontSize: '0.85rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
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

  const renderOptimize = () => {
    const opt = optimizationResult?.optimal;
    const top5 = optimizationResult?.topFive || [];
    const diag = optimizationResult?.diagnostics;
    
    if (!opt) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏠</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: '16px', color: '#fff' }}>Ready to Find Your Optimal Strategy</h2>
          <p style={{ color: '#8b8ba7', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Enter your details, then click below. Tests hundreds of combinations to find your best strategy.
          </p>
          <button style={{ ...s.btn, width: 'auto', padding: '16px 48px' }} onClick={handleOptimize}>🚀 Run Optimization</button>
        </div>
      );
    }
    
    return (
      <>
        {/* Diagnostics - why certain strategies may not appear */}
        {diag && !optimizationResult.canBuyCash && (
          <div style={s.warning}>
            <strong>⚠️ HELOC strategies not viable:</strong> You need {fmt$(homePrice)} to buy cash, but only have {fmt$(diag.totalAvailable)} (savings + max margin). Gap: {fmt$(diag.gap)}
          </div>
        )}
        
        <div style={s.planCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Recommended Strategy</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '600', color: '#fff', margin: 0 }}>{opt.strategy}</h2>
              <p style={{ color: '#d0d0e0', marginTop: '8px', fontSize: '0.95rem' }}>{opt.strategyDesc}</p>
            </div>
            <div style={{ ...s.badge, ...(opt.riskLevel === 'Low' ? s.badgeGreen : opt.riskLevel === 'Medium' ? s.badgeYellow : s.badgeRed), fontSize: '0.8rem', padding: '6px 14px' }}>
              {opt.riskLevel} Risk
            </div>
          </div>
          
          <div style={s.metrics}>
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
        
        {/* Interest deductibility breakdown */}
        <div style={s.card}>
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
            Investment income for deduction limit: {fmt$(opt.totalInvestmentIncome)}/yr (from invested margin/HELOC proceeds)
          </div>
        </div>
        
        {/* Non-recoverable breakdown */}
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>True Cost of Ownership vs. Rent</h3>
          {renderNonRecovBreakdown(opt.nonRecovBreakdown, monthlyRent)}
        </div>
        
        {/* Top strategies comparison */}
        <div style={s.card}>
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
    );
  };

  const renderManual = () => {
    const sc = manualScenario;
    
    return (
      <>
        <InfoBox title="Manual Mode" isOpen={openInfoBoxes['manual']} onToggle={() => toggleInfo('manual')}>
          <p>Use sliders to test any combination. HELOC requires buying outright (set down payment to 100% or ensure cash + margin ≥ home price).</p>
        </InfoBox>
        
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Configure Your Scenario</h3>
          
          <div style={s.inputGroup}>
            <label style={s.label}>Down Payment: {manualDpPct}% ({fmt$(homePrice * manualDpPct / 100)})</label>
            <input type="range" min="10" max="100" value={manualDpPct} onChange={e => setManualDpPct(Number(e.target.value))} style={s.slider} />
          </div>
          
          <div style={s.inputGroup}>
            <label style={s.label}>Margin Loan: {manualMarginPct}% of portfolio ({fmt$(stockPortfolio * manualMarginPct / 100)})</label>
            <input type="range" min="0" max="30" value={manualMarginPct} onChange={e => setManualMarginPct(Number(e.target.value))} style={s.slider} />
            {manualMarginPct > 25 && <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ High margin ({'>'}25%) increases margin call risk</div>}
          </div>
          
          <div style={s.inputGroup}>
            <label style={s.label}>HELOC: {manualHelocPct}% of home ({fmt$(homePrice * manualHelocPct / 100)})</label>
            <input type="range" min="0" max="80" value={manualHelocPct} onChange={e => setManualHelocPct(Number(e.target.value))} style={s.slider} disabled={!canManualHELOC} />
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
        
        <div style={s.metrics}>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(sc.totalDown)}</div><div style={s.metricLbl}>Total Down</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(sc.monthlyPayment)}</div><div style={s.metricLbl}>Monthly P&I</div></div>
          <div style={s.metric}><div style={{ ...s.metricVal, color: '#4ade80' }}>{fmtPct(sc.blendedEffectiveRate)}</div><div style={s.metricLbl}>Blended Eff. Rate</div></div>
          <div style={s.metric}><div style={{ ...s.metricVal, color: manualRemaining < minBuffer ? '#f87171' : '#4ade80' }}>{fmt$(manualRemaining)}</div><div style={s.metricLbl}>Remaining</div></div>
        </div>
        
        {/* Financing structure */}
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Financing Structure</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>True Cost vs. Rent</h3>
          {renderNonRecovBreakdown(sc.nonRecovBreakdown, monthlyRent)}
        </div>
        
        {/* Tax analysis */}
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Tax Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
      </>
    );
  };

  const renderHolding = () => {
    const opt = optimizationResult?.optimal;
    if (!opt) return <div style={{ textAlign: 'center', padding: '40px', color: '#8b8ba7' }}>Run optimization first</div>;
    
    return (
      <>
        <InfoBox title="How the Comparison Works" isOpen={openInfoBoxes['holdingExplain']} onToggle={() => toggleInfo('holdingExplain')}>
          <p><strong>Owner scenario:</strong> Buys home, pays mortgage/costs from income, builds equity through appreciation + principal paydown. Wealth = home equity minus selling costs if sold.</p>
          <p style={{marginTop: '10px'}}><strong>Renter scenario:</strong> Invests the down payment + closing costs that owner spent. Portfolio compounds at {investmentReturn}% annually. If renting is cheaper than owning, the savings also get invested.</p>
          <p style={{marginTop: '10px'}}><strong>Break-even:</strong> The year when owner's net equity exceeds renter's portfolio value. Before this, you'd be wealthier renting. After this, owning pulls ahead.</p>
        </InfoBox>
        
        <div style={{ ...s.metrics, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div style={s.metric}><div style={{ ...s.metricVal, color: '#f97316' }}>{opt.breakEvenYear}</div><div style={s.metricLbl}>Break-Even Year</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.txCosts.total)}</div><div style={s.metricLbl}>Transaction Costs</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.yearlyAnalysis[0]?.ownerOutflow || 0)}</div><div style={s.metricLbl}>Year 1 Owner Cost</div></div>
          <div style={s.metric}><div style={s.metricVal}>{fmt$(opt.yearlyAnalysis[0]?.yearlyRent || 0)}</div><div style={s.metricLbl}>Year 1 Rent</div></div>
        </div>
        
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Wealth: Own vs. Rent + Invest</h3>
          <div style={s.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={opt.yearlyAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="year" stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
                <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} labelFormatter={l=>`Year ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="ownerWealth" name="Own (equity - sell costs)" stroke="#f97316" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="renterWealth" name="Rent + Invest" stroke="#60a5fa" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div style={s.card}>
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
        
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Prop 13 Savings Over Time</h3>
          <p style={{ color: '#8b8ba7', fontSize: '0.85rem', marginBottom: '16px' }}>
            Annual savings compared to what a new buyer would pay in property taxes (your basis grows at 2% vs market appreciation of {homeAppreciation}%)
          </p>
          <div style={s.chart}>
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

  return (
    <div style={s.container}>
      <header style={s.header}>
        <h1 style={s.title}>Home Purchase Optimizer</h1>
        <p style={{ color: '#8b8ba7', fontSize: '1rem' }}>AI-powered strategy optimization for SF homebuyers</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', color: '#fb923c', marginTop: '12px' }}>🌉 San Francisco Edition</div>
      </header>
      
      <div style={s.grid}>
        <aside style={s.panel}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Your Situation</h3>
          <div style={s.inputGroup}><label style={s.label}>Target Home Price</label><input type="number" style={s.input} value={homePrice} onChange={e => setHomePrice(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Total Cash Savings</label><input type="number" style={s.input} value={totalSavings} onChange={e => setTotalSavings(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Stock Portfolio</label><input type="number" style={s.input} value={stockPortfolio} onChange={e => setStockPortfolio(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Gross Income</label><input type="number" style={s.input} value={grossIncome} onChange={e => setGrossIncome(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Monthly Rent</label><input type="number" style={s.input} value={monthlyRent} onChange={e => setMonthlyRent(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Min. Buffer</label><input type="number" style={s.input} value={minBuffer} onChange={e => setMinBuffer(Number(e.target.value))} /></div>
          
          <div style={s.auto}>
            <div style={{ fontSize: '0.7rem', color: '#fb923c', textTransform: 'uppercase' }}>Combined Rate</div>
            <div style={{ fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{fmtPct(combRate)}</div>
          </div>
          
          <h3 style={s.section}>Rates</h3>
          <div style={s.inputGroup}><label style={s.label}>Mortgage (%)</label><input type="number" step="0.125" style={s.input} value={mortgageRate} onChange={e => setMortgageRate(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Margin (%)</label><input type="number" step="0.25" style={s.input} value={marginRate} onChange={e => setMarginRate(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>HELOC (%)</label><input type="number" step="0.25" style={s.input} value={helocRate} onChange={e => setHelocRate(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Investment Return (%)</label><input type="number" step="0.5" style={s.input} value={investmentReturn} onChange={e => setInvestmentReturn(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Appreciation (%)</label><input type="number" step="0.5" style={s.input} value={homeAppreciation} onChange={e => setHomeAppreciation(Number(e.target.value))} /></div>
          
          <button style={s.btn} onClick={handleOptimize}>🚀 Run Optimization</button>
        </aside>
        
        <main>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(activeTab === 'optimize' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('optimize')}>Optimized Plan</button>
            <button style={{ ...s.tab, ...(activeTab === 'manual' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('manual')}>Manual Mode</button>
            <button style={{ ...s.tab, ...(activeTab === 'holding' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('holding')}>Holding Period</button>
          </div>
          
          {activeTab === 'optimize' && renderOptimize()}
          {activeTab === 'manual' && renderManual()}
          {activeTab === 'holding' && renderHolding()}
        </main>
      </div>
    </div>
  );
}
