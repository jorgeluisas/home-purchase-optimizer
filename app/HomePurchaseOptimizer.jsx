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
  const { homePrice, cashDown, marginLoan, helocAmount, cashOutRefiAmount = 0, mortgageRate, cashOutRefiRate = 0.0675, loanTerm, appreciationRate, investmentReturn, dividendYield = 0.02, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus = 'married' } = params;
  
  // Determine if this is a cash purchase (no mortgage)
  const totalEquityInput = cashDown + marginLoan;
  const needsMortgage = totalEquityInput < homePrice;
  const baseMortgageLoan = needsMortgage ? homePrice - totalEquityInput : 0;

  // Cash-out refinance: replaces mortgage with larger loan, extracts equity for investment
  // If cashOutRefiAmount > 0, we're doing a cash-out refi strategy
  const isCashOutRefi = cashOutRefiAmount > 0;
  const actualCashOutAmount = isCashOutRefi ? cashOutRefiAmount : 0;
  const totalRefiLoan = isCashOutRefi ? baseMortgageLoan + actualCashOutAmount : 0;
  const mortgageLoan = isCashOutRefi ? 0 : baseMortgageLoan; // If refi, no separate mortgage
  const effectiveMortgageRate = isCashOutRefi ? cashOutRefiRate : mortgageRate;

  // HELOC can only be taken on a home you own outright (no mortgage)
  // OR on the equity portion of a mortgaged home (home equity)
  // Cash-out refi is mutually exclusive with HELOC
  const actualHELOC = (!needsMortgage && !isCashOutRefi) ? helocAmount : 0;

  const propTax = homePrice * SF.propTaxRate + SF.parcelTax;
  const insurance = homePrice * 0.003;
  const maintenance = homePrice * 0.01;
  const totalLoanForPMI = isCashOutRefi ? totalRefiLoan : mortgageLoan;
  const pmi = calcPMI(totalLoanForPMI, homePrice);
  const tx = calcTxCosts(homePrice, totalLoanForPMI);
  // Add cash-out refi closing costs (typically 2-5% of loan amount)
  const cashOutRefiClosingCosts = isCashOutRefi ? totalRefiLoan * 0.025 : 0;
  const amort = isCashOutRefi
    ? genAmort(totalRefiLoan, cashOutRefiRate, loanTerm)
    : genAmort(mortgageLoan, mortgageRate, loanTerm);

  // Interest calculations - annual
  // For cash-out refi: acquisition debt portion gets mortgage interest treatment
  // Cash-out portion gets investment interest treatment (if proceeds invested)
  const acquisitionDebtInterest = isCashOutRefi ? baseMortgageLoan * cashOutRefiRate : mortgageLoan * mortgageRate;
  const cashOutInterestAnnual = isCashOutRefi ? actualCashOutAmount * cashOutRefiRate : 0;
  const mortgageInterestAnnual = acquisitionDebtInterest; // For backward compatibility
  const marginInterestAnnual = marginLoan * marginRate;
  const helocInterestAnnual = actualHELOC * helocRate;
  const totalInterestAnnual = acquisitionDebtInterest + cashOutInterestAnnual + marginInterestAnnual + helocInterestAnnual;

  // Investment income from borrowed funds invested
  // IMPORTANT: For investment interest deduction, only ACTUAL income counts
  // (dividends, interest, realized gains) - NOT unrealized appreciation
  // Total return for wealth calculation still uses full investmentReturn
  const marginInvestmentIncome = marginLoan > 0 ? marginLoan * investmentReturn : 0;
  const helocInvestmentIncome = actualHELOC * investmentReturn;
  const cashOutInvestmentIncome = actualCashOutAmount * investmentReturn;
  const totalInvestmentIncome = marginInvestmentIncome + helocInvestmentIncome + cashOutInvestmentIncome;

  // For deductibility limit, use only dividend/income yield (actual taxable income)
  const marginDeductibleIncome = marginLoan > 0 ? marginLoan * dividendYield : 0;
  const helocDeductibleIncome = actualHELOC * dividendYield;
  const cashOutDeductibleIncome = actualCashOutAmount * dividendYield;
  const totalDeductibleInvestmentIncome = marginDeductibleIncome + helocDeductibleIncome + cashOutDeductibleIncome;

  // Tax deductions - CORRECTED LOGIC
  // 1. Mortgage/Acquisition debt interest: deductible on Schedule A
  //    Federal limit: $750K for loans after Dec 2017
  //    California limit: $1M (CA did not conform to TCJA)
  //    For cash-out refi: only the acquisition debt portion counts as mortgage interest
  const acquisitionDebt = isCashOutRefi ? baseMortgageLoan : mortgageLoan;
  const acquisitionDebtRate = isCashOutRefi ? cashOutRefiRate : mortgageRate;
  const federalDeductibleMortgageInterest = Math.min(acquisitionDebt, 750000) * acquisitionDebtRate;
  const caDeductibleMortgageInterest = Math.min(acquisitionDebt, 1000000) * acquisitionDebtRate;
  const deductibleMortgageInterest = federalDeductibleMortgageInterest; // For backward compatibility
  const nonDeductibleMortgageInterest = acquisitionDebtInterest - federalDeductibleMortgageInterest;

  // 2. Margin interest: deductible as INVESTMENT interest (Schedule A, line 9)
  //    Limited to net investment income (only actual income, not appreciation)
  const deductibleMarginInterest = Math.min(marginInterestAnnual, marginDeductibleIncome);
  const nonDeductibleMarginInterest = marginInterestAnnual - deductibleMarginInterest;

  // 3. Cash-out refi interest (cash-out portion): investment interest if proceeds invested
  const remainingDeductibleIncomeForCashOut = Math.max(0, totalDeductibleInvestmentIncome - deductibleMarginInterest);
  const deductibleCashOutInterest = Math.min(cashOutInterestAnnual, remainingDeductibleIncomeForCashOut);
  const nonDeductibleCashOutInterest = cashOutInterestAnnual - deductibleCashOutInterest;

  // 4. HELOC interest: if proceeds used for investment, it's investment interest
  //    Deductible up to investment income (combined with margin and cash-out)
  const remainingDeductibleIncomeForHELOC = Math.max(0, totalDeductibleInvestmentIncome - deductibleMarginInterest - deductibleCashOutInterest);
  const deductibleHELOCInterest = Math.min(helocInterestAnnual, remainingDeductibleIncomeForHELOC);
  const nonDeductibleHELOCInterest = helocInterestAnnual - deductibleHELOCInterest;

  // Itemized deductions for Schedule A
  const saltCapped = Math.min(stateTax + propTax, 10000);
  const saltLost = Math.max(0, stateTax + propTax - 10000);
  const itemizedTotal = deductibleMortgageInterest + saltCapped;
  const shouldItemize = itemizedTotal > stdDeduction;

  // Tax benefits calculation
  // Federal mortgage interest benefit (only if itemizing and exceeds standard)
  const federalMortgageTaxBenefit = shouldItemize ? Math.max(0, itemizedTotal - stdDeduction) * fedRate : 0;

  // California mortgage interest benefit (CA standard deduction is much lower, ~$10k married)
  // CA allows $1M limit vs federal $750K, and most high earners itemize for CA
  const caStdDeduction = filingStatus === 'married' ? 10726 : 5363;
  const caItemizedTotal = caDeductibleMortgageInterest + (stateTax + propTax); // No SALT cap for CA state taxes
  const shouldItemizeCA = caItemizedTotal > caStdDeduction;
  const caMortgageTaxBenefit = shouldItemizeCA ? Math.max(0, caItemizedTotal - caStdDeduction) * caRate : 0;

  // Combined mortgage tax benefit
  const mortgageTaxBenefit = federalMortgageTaxBenefit + caMortgageTaxBenefit;

  // Investment interest benefit (deductible against ordinary income at combined rate)
  const investmentInterestDeduction = deductibleMarginInterest + deductibleCashOutInterest + deductibleHELOCInterest;
  const investInterestTaxBenefit = investmentInterestDeduction * (fedRate + caRate);

  const totalTaxBenefit = mortgageTaxBenefit + investInterestTaxBenefit;

  // Effective interest rates (after tax benefit)
  const netMortgageInterest = acquisitionDebtInterest - (shouldItemize ? deductibleMortgageInterest * fedRate : 0);
  const netCashOutInterest = cashOutInterestAnnual - (deductibleCashOutInterest * (fedRate + caRate));
  const netMarginInterest = marginInterestAnnual - (deductibleMarginInterest * (fedRate + caRate));
  const netHELOCInterest = helocInterestAnnual - (deductibleHELOCInterest * (fedRate + caRate));

  const mortgageEffectiveRate = acquisitionDebt > 0 ? netMortgageInterest / acquisitionDebt : 0;
  const cashOutEffectiveRate = actualCashOutAmount > 0 ? netCashOutInterest / actualCashOutAmount : 0;
  const marginEffectiveRate = marginLoan > 0 ? netMarginInterest / marginLoan : 0;
  const helocEffectiveRate = actualHELOC > 0 ? netHELOCInterest / actualHELOC : 0;

  const totalBorrowed = (isCashOutRefi ? totalRefiLoan : mortgageLoan) + marginLoan + actualHELOC;
  const totalNetInterest = netMortgageInterest + netCashOutInterest + netMarginInterest + netHELOCInterest;
  const blendedEffectiveRate = totalBorrowed > 0 ? totalNetInterest / totalBorrowed : 0;

  // Non-recoverable costs breakdown
  const nonRecovBreakdown = {
    mortgageInterest: acquisitionDebtInterest,
    cashOutInterest: cashOutInterestAnnual,
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
    
    // Owner equity = home value - remaining mortgage/refi loan - margin loan - HELOC
    // Note: for cash-out refi, loanBal already includes the cash-out portion (it's part of totalRefiLoan)
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
    mortgageLoan: isCashOutRefi ? 0 : mortgageLoan,
    // Cash-out refinance
    isCashOutRefi,
    cashOutRefiAmount: actualCashOutAmount,
    totalRefiLoan,
    acquisitionDebt,
    cashOutRefiClosingCosts,
    needsMortgage,
    monthlyPayment: amort.monthlyPayment + pmi.monthly,
    pmi,
    txCosts: { ...tx, buy: tx.buy + cashOutRefiClosingCosts },
    amort,
    // Interest details
    mortgageInterestAnnual: acquisitionDebtInterest,
    cashOutInterestAnnual,
    marginInterestAnnual,
    helocInterestAnnual,
    totalInterestAnnual,
    // Deductibility
    deductibleMortgageInterest,
    nonDeductibleMortgageInterest,
    deductibleCashOutInterest,
    nonDeductibleCashOutInterest,
    deductibleMarginInterest,
    nonDeductibleMarginInterest,
    deductibleHELOCInterest,
    nonDeductibleHELOCInterest,
    investmentInterestDeduction,
    // Investment income
    totalInvestmentIncome,
    totalDeductibleInvestmentIncome,
    dividendYield,
    // Tax
    itemizedTotal,
    stdDeduction,
    shouldItemize,
    caItemizedTotal,
    caStdDeduction,
    shouldItemizeCA,
    saltCapped,
    saltLost,
    federalMortgageTaxBenefit,
    caMortgageTaxBenefit,
    mortgageTaxBenefit,
    investInterestTaxBenefit,
    totalTaxBenefit,
    federalDeductibleMortgageInterest,
    caDeductibleMortgageInterest,
    // Effective rates
    mortgageEffectiveRate,
    cashOutEffectiveRate,
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
  const { homePrice, totalSavings, stockPortfolio, mortgageRate, cashOutRefiRate = 0.0675, loanTerm, appreciationRate, investmentReturn, dividendYield = 0.02, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, minBuffer, filingStatus = 'married' } = params;
  
  const results = [];
  const maxMarginPct = 0.30;
  
  // Strategy 1: Traditional (cash down + mortgage)
  for (const dpPct of [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
    const cashDown = homePrice * dpPct;
    const scenario = calcScenario({
      homePrice, cashDown, marginLoan: 0, helocAmount: 0,
      mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
      marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus
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
        mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
        marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus
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
          mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
          marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus
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

  // Strategy 4: Traditional Mortgage + Cash-Out Refinance
  // Buy with mortgage, then immediately do cash-out refi to extract equity for investment
  // Pros: Fixed rate (vs HELOC variable), interest tracing for investment deduction
  // Cons: Replaces original mortgage rate, higher closing costs than HELOC
  for (const dpPct of [0.20, 0.25, 0.30, 0.35, 0.40]) {
    for (const cashOutPct of [0.20, 0.30, 0.40, 0.50]) {
      const cashDown = homePrice * dpPct;
      if (cashDown > totalSavings - minBuffer) continue;

      const baseMortgage = homePrice - cashDown;
      const cashOutAmount = homePrice * cashOutPct;
      const maxLTV = 0.80; // Most lenders cap at 80% LTV for cash-out refi

      // Total loan after refi must be <= 80% of home value
      if ((baseMortgage + cashOutAmount) / homePrice > maxLTV) continue;

      const scenario = calcScenario({
        homePrice, cashDown, marginLoan: 0, helocAmount: 0,
        cashOutRefiAmount: cashOutAmount, cashOutRefiRate,
        mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
        marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus
      });

      // Remaining = savings - down payment - closing costs + cash-out proceeds
      const remaining = totalSavings - cashDown - scenario.txCosts.buy + cashOutAmount;

      if (remaining >= minBuffer) {
        results.push({
          ...scenario,
          strategy: 'Cash-Out Refi',
          strategyDesc: `${(dpPct*100).toFixed(0)}% down + ${(cashOutPct*100).toFixed(0)}% cash-out refi`,
          remaining,
          riskLevel: 'Medium', // Fixed rate is less risky than HELOC variable
          dpPct: dpPct * 100
        });
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
  
  const [activeTab, setActiveTab] = useState('optimize');
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [openInfoBoxes, setOpenInfoBoxes] = useState({});

  // Scenario comparison state
  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Scenario A', dpPct: 20, mortgageRate: 6.5, marginPct: 0, helocPct: 0 },
    { id: 2, name: 'Scenario B', dpPct: 30, mortgageRate: 6.5, marginPct: 15, helocPct: 0 },
  ]);
  
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
      dividendYield: dividendYield/100, monthlyRent, marginRate: marginRate/100, helocRate: helocRate/100,
      fedRate, caRate, stateTax, stdDeduction, minBuffer, filingStatus
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
      dividendYield: dividendYield / 100,
      monthlyRent,
      marginRate: marginRate / 100,
      helocRate: helocRate / 100,
      fedRate,
      caRate,
      stateTax,
      stdDeduction,
      filingStatus
    });
  }, [homePrice, manualDpPct, manualMarginPct, manualHelocPct, stockPortfolio, mortgageRate, loanTerm, homeAppreciation, investmentReturn, dividendYield, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus]);
  
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
    
    // Generate recommendation explanation
    const getRecommendationExplanation = () => {
      const reasons = [];
      const risks = [];

      if (opt.strategy === 'Traditional') {
        reasons.push('Simple, low-risk approach with predictable payments');
        reasons.push(`Your ${fmtPctWhole(opt.dpPct)} down payment avoids PMI concerns`);
        if (opt.shouldItemize) reasons.push('Mortgage interest provides tax deduction');
        risks.push('Opportunity cost: cash tied up in home equity could earn returns elsewhere');
      } else if (opt.strategy.includes('Margin')) {
        reasons.push('Preserves cash liquidity while achieving desired down payment');
        reasons.push(`Margin interest (${fmtPct(marginRate/100)}) is deductible against investment income`);
        reasons.push(`Effective margin rate after tax: ${fmtPct(opt.marginEffectiveRate)}`);
        risks.push(`Margin call risk if portfolio drops significantly (keep utilization under 25%)`);
        risks.push('Variable margin rates could increase');
      } else if (opt.strategy.includes('HELOC')) {
        reasons.push('Interest tracing: ALL borrowing costs become investment interest (deductible)');
        reasons.push(`Blended effective rate ${fmtPct(opt.blendedEffectiveRate)} is lower than mortgage rate`);
        reasons.push('Extracted equity can compound in investments');
        risks.push('HELOC has variable rate - could increase over time');
        risks.push('Requires disciplined investing of HELOC proceeds');
      } else if (opt.strategy.includes('Cash-Out Refi')) {
        reasons.push('Fixed rate cash-out refi is more stable than variable HELOC');
        reasons.push('Extracted equity portion qualifies for investment interest deduction');
        reasons.push(`Cash-out proceeds can be invested to potentially outpace the ${fmtPct(cashOutRefiRate/100)} rate`);
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

      return { reasons, risks };
    };

    const { reasons, risks } = getRecommendationExplanation();

    return (
      <>
        {/* Diagnostics - why certain strategies may not appear */}
        {diag && !optimizationResult.canBuyCash && (
          <div style={s.warning}>
            <strong>⚠️ HELOC strategies not viable:</strong> You need {fmt$(homePrice)} to buy cash, but only have {fmt$(diag.totalAvailable)} (savings + max margin). Gap: {fmt$(diag.gap)}
          </div>
        )}

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
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600', marginBottom: '8px' }}>⚠️ Risk Factors to Consider</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d0e0', fontSize: '0.85rem', lineHeight: '1.7' }}>
                {risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>

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
            Total investment return: {fmt$(opt.totalInvestmentIncome)}/yr | Deductible income (dividends/interest): {fmt$(opt.totalDeductibleInvestmentIncome)}/yr
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
        marginRate: marginRate / 100,
        helocRate: helocRate / 100,
        fedRate,
        caRate,
        stateTax,
        stdDeduction,
        filingStatus
      });

      const remaining = totalSavings - result.cashDown - result.txCosts.buy + result.helocAmount;
      return { ...sc, ...result, remaining };
    });
  }, [scenarios, homePrice, stockPortfolio, loanTerm, homeAppreciation, investmentReturn, dividendYield, monthlyRent, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, totalSavings]);

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

    return (
      <>
        <InfoBox title="Scenario Comparison" isOpen={openInfoBoxes['scenarioInfo']} onToggle={() => toggleInfo('scenarioInfo')}>
          <p>Create and compare different financing scenarios side-by-side. Adjust rates, down payment, and leverage to see how they affect your costs and long-term wealth.</p>
        </InfoBox>

        {/* Scenario Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(scenarios.length, 3)}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
          {scenarioResults.map((sc, idx) => (
            <div key={sc.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: `2px solid ${colors[idx % colors.length]}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={sc.name}
                  onChange={e => updateScenario(sc.id, 'name', e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: colors[idx % colors.length], fontSize: '1.1rem', fontWeight: '600', width: '120px' }}
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
                  <span style={{ color: '#8b8ba7' }}>20-Yr Wealth</span>
                  <span style={{ color: colors[idx % colors.length], fontWeight: '600' }}>{fmt$(sc.ownerWealth20)}</span>
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
        <div style={s.card}>
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
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <td style={{ ...s.td, fontWeight: '700', fontSize: '0.95rem' }}>20-Year Wealth</td>
                {scenarioResults.map((sc, idx) => <td key={sc.id} style={{ ...s.td, fontWeight: '700', fontSize: '0.95rem', color: colors[idx % colors.length] }}>{fmt$(sc.ownerWealth20)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Wealth Comparison Chart */}
        <div style={s.card}>
          <h3 style={{ ...s.section, marginTop: 0 }}>Wealth Over Time</h3>
          <div style={s.chart}>
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
          <div style={s.inputGroup}><label style={s.label}>Cash-Out Refi (%)</label><input type="number" step="0.125" style={s.input} value={cashOutRefiRate} onChange={e => setCashOutRefiRate(Number(e.target.value))} /></div>
          <div style={s.inputGroup}><label style={s.label}>Total Investment Return (%)</label><input type="number" step="0.5" style={s.input} value={investmentReturn} onChange={e => setInvestmentReturn(Number(e.target.value))} /></div>
          <div style={s.inputGroup}>
            <label style={s.label}>Dividend/Income Yield (%)</label>
            <input type="number" step="0.25" style={s.input} value={dividendYield} onChange={e => setDividendYield(Number(e.target.value))} />
            <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px' }}>For investment interest deduction limit (actual income only)</div>
          </div>
          <div style={s.inputGroup}><label style={s.label}>Home Appreciation (%)</label><input type="number" step="0.5" style={s.input} value={homeAppreciation} onChange={e => setHomeAppreciation(Number(e.target.value))} /></div>
          
          <button style={s.btn} onClick={handleOptimize}>🚀 Run Optimization</button>
        </aside>
        
        <main>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(activeTab === 'optimize' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('optimize')}>Optimized Plan</button>
            <button style={{ ...s.tab, ...(activeTab === 'scenarios' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('scenarios')}>Compare Scenarios</button>
            <button style={{ ...s.tab, ...(activeTab === 'manual' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('manual')}>Manual Mode</button>
            <button style={{ ...s.tab, ...(activeTab === 'holding' ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab('holding')}>Holding Period</button>
          </div>

          {activeTab === 'optimize' && renderOptimize()}
          {activeTab === 'scenarios' && renderScenarios()}
          {activeTab === 'manual' && renderManual()}
          {activeTab === 'holding' && renderHolding()}
        </main>
      </div>
    </div>
  );
}
