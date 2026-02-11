// calculations.js - Financial calculations and utilities for Home Purchase Optimizer

// San Francisco specific constants
export const SF = { 
  propTaxRate: 0.0118, 
  transferTax: 0.0068, 
  parcelTax: 350, 
  realtorComm: 0.05, 
  closeBuy: 0.015, 
  closeSell: 0.01 
};

// URL param mapping (short keys for cleaner URLs)
export const URL_PARAM_MAP = {
  homePrice: 'hp',
  totalSavings: 'ts',
  stockPortfolio: 'sp',
  grossIncome: 'gi',
  monthlyRent: 'mr',
  rentGrowth: 'rg',
  filingStatus: 'fs',
  mortgageRate: 'mrt',
  marginRate: 'mgr',
  helocRate: 'hr',
  cashOutRefiRate: 'cor',
  investmentReturn: 'ir',
  dividendYield: 'dy',
  homeAppreciation: 'ha',
  loanTerm: 'lt',
  minBuffer: 'mb',
  manualDpPct: 'mdp',
  manualMarginPct: 'mmp',
  manualHelocPct: 'mhp',
  activeTab: 'tab',
};

// Reverse mapping for hydration
export const REVERSE_URL_MAP = Object.fromEntries(
  Object.entries(URL_PARAM_MAP).map(([k, v]) => [v, k])
);

// Format helpers
export const fmt$ = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
export const fmtPct = (v) => `${((v || 0) * 100).toFixed(2)}%`;
export const fmtPctWhole = (v) => `${(v || 0).toFixed(0)}%`;
export const fmtNum = (v) => new Intl.NumberFormat('en-US').format(v || 0);

// Tax calculation functions
export const calcCAStateTax = (inc, stat) => {
  const rates = [{min:0,max:10412,r:0.01},{min:10412,max:24684,r:0.02},{min:24684,max:38959,r:0.04},{min:38959,max:54081,r:0.06},{min:54081,max:68350,r:0.08},{min:68350,max:349137,r:0.093},{min:349137,max:418961,r:0.103},{min:418961,max:698271,r:0.113},{min:698271,max:Infinity,r:0.123}];
  const m = stat === 'married' ? 2 : 1;
  let tax = 0;
  for (const b of rates) if (inc > b.min * m) tax += Math.max(0, Math.min(inc, b.max * m) - b.min * m) * b.r;
  // CA Mental Health Services Tax: 1% on income over $1M (same for ALL filers)
  if (inc > 1000000) tax += (inc - 1000000) * 0.01;
  return tax;
};

export const calcFedTax = (inc, stat) => {
  const br = stat === 'married' ? [{min:0,max:23200,r:0.10},{min:23200,max:94300,r:0.12},{min:94300,max:201050,r:0.22},{min:201050,max:383900,r:0.24},{min:383900,max:487450,r:0.32},{min:487450,max:731200,r:0.35},{min:731200,max:Infinity,r:0.37}] : [{min:0,max:11600,r:0.10},{min:11600,max:47150,r:0.12},{min:47150,max:100525,r:0.22},{min:100525,max:191950,r:0.24},{min:191950,max:243725,r:0.32},{min:243725,max:609350,r:0.35},{min:609350,max:Infinity,r:0.37}];
  let tax = 0;
  for (const b of br) if (inc > b.min) tax += Math.max(0, Math.min(inc, b.max) - b.min) * b.r;
  return tax;
};

export const getFedRate = (inc, stat) => {
  const br = stat === 'married' ? [{min:0,max:23200,r:0.10},{min:23200,max:94300,r:0.12},{min:94300,max:201050,r:0.22},{min:201050,max:383900,r:0.24},{min:383900,max:487450,r:0.32},{min:487450,max:731200,r:0.35},{min:731200,max:Infinity,r:0.37}] : [{min:0,max:11600,r:0.10},{min:11600,max:47150,r:0.12},{min:47150,max:100525,r:0.22},{min:100525,max:191950,r:0.24},{min:191950,max:243725,r:0.32},{min:243725,max:609350,r:0.35},{min:609350,max:Infinity,r:0.37}];
  for (const b of br) if (inc >= b.min && inc < b.max) return b.r;
  return 0.37;
};

export const getCARate = (inc, stat) => {
  const m = stat === 'married' ? 2 : 1;
  const br = [{min:0,max:10412,r:0.01},{min:10412,max:24684,r:0.02},{min:24684,max:38959,r:0.04},{min:38959,max:54081,r:0.06},{min:54081,max:68350,r:0.08},{min:68350,max:349137,r:0.093},{min:349137,max:418961,r:0.103},{min:418961,max:698271,r:0.113},{min:698271,max:Infinity,r:0.123}];
  let baseRate = 0.123; // Default to top bracket
  for (const b of br) {
    if (inc >= b.min * m && inc < b.max * m) { baseRate = b.r; break; }
  }
  // Add CA Mental Health Services Tax (1% on income over $1M)
  // Note: $1M threshold is NOT doubled for married - it's $1M for all filers
  if (inc > 1000000) baseRate += 0.01;
  return baseRate;
};

// Loan calculation functions
export const calcMonthly = (p, r, y) => { 
  if (p <= 0) return 0; 
  const mr = r/12, n = y*12; 
  return mr === 0 ? p/n : p*(mr*Math.pow(1+mr,n))/(Math.pow(1+mr,n)-1); 
};

export const genAmort = (principal, rate, years) => {
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

export const calcPMI = (loan, home) => {
  if (loan <= 0 || loan/home <= 0.80) return { monthly: 0, years: 0, total: 0 };
  const target = home * 0.78, mp = calcMonthly(loan, 0.065, 30), mr = 0.065/12;
  let bal = loan, months = 0;
  while (bal > target && months < 360) { bal -= (mp - bal*mr); months++; }
  const monthly = loan * 0.005 / 12;
  return { monthly, years: months/12, total: monthly * months };
};

export const calcTxCosts = (price, loan) => {
  const buy = price * SF.transferTax + price * SF.closeBuy + loan * 0.005 + Math.min(15000, price * 0.003) + 2500;
  const sell = price * SF.realtorComm + price * SF.transferTax + price * SF.closeSell + Math.min(50000, price * 0.01);
  return { buy, sell, total: buy + sell };
};

// Core scenario calculation
export const calcScenario = (params) => {
  const { homePrice, cashDown, marginLoan, helocAmount, cashOutRefiAmount = 0, mortgageRate, cashOutRefiRate = 0.0675, loanTerm, appreciationRate, investmentReturn, dividendYield = 0.02, monthlyRent, rentGrowthRate = 0.03, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus = 'married', grossIncome = 0 } = params;
  
  // Determine if this is a cash purchase (no mortgage)
  const totalEquityInput = cashDown + marginLoan;
  const needsMortgage = totalEquityInput < homePrice;
  const baseMortgageLoan = needsMortgage ? homePrice - totalEquityInput : 0;

  // Cash-out refinance: replaces mortgage with larger loan, extracts equity for investment
  const isCashOutRefi = cashOutRefiAmount > 0;
  const actualCashOutAmount = isCashOutRefi ? cashOutRefiAmount : 0;
  const totalRefiLoan = isCashOutRefi ? baseMortgageLoan + actualCashOutAmount : 0;
  const mortgageLoan = isCashOutRefi ? 0 : baseMortgageLoan;
  const effectiveMortgageRate = isCashOutRefi ? cashOutRefiRate : mortgageRate;

  // HELOC can only be taken on a home you own outright (no mortgage)
  const actualHELOC = (!needsMortgage && !isCashOutRefi) ? helocAmount : 0;

  const propTax = homePrice * SF.propTaxRate + SF.parcelTax;
  const insurance = homePrice * 0.003;
  const maintenance = homePrice * 0.01;
  const totalLoanForPMI = isCashOutRefi ? totalRefiLoan : mortgageLoan;
  const pmi = calcPMI(totalLoanForPMI, homePrice);
  const tx = calcTxCosts(homePrice, totalLoanForPMI);
  const cashOutRefiClosingCosts = isCashOutRefi ? totalRefiLoan * 0.025 : 0;
  const amort = isCashOutRefi
    ? genAmort(totalRefiLoan, cashOutRefiRate, loanTerm)
    : genAmort(mortgageLoan, mortgageRate, loanTerm);

  // Interest calculations - annual
  const acquisitionDebtInterest = isCashOutRefi ? baseMortgageLoan * cashOutRefiRate : mortgageLoan * mortgageRate;
  const cashOutInterestAnnual = isCashOutRefi ? actualCashOutAmount * cashOutRefiRate : 0;
  const mortgageInterestAnnual = acquisitionDebtInterest;
  const marginInterestAnnual = marginLoan * marginRate;
  const helocInterestAnnual = actualHELOC * helocRate;
  const totalInterestAnnual = acquisitionDebtInterest + cashOutInterestAnnual + marginInterestAnnual + helocInterestAnnual;

  // Investment income from borrowed funds invested
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
  const acquisitionDebt = isCashOutRefi ? baseMortgageLoan : mortgageLoan;
  const acquisitionDebtRate = isCashOutRefi ? cashOutRefiRate : mortgageRate;
  const federalDeductibleMortgageInterest = Math.min(acquisitionDebt, 750000) * acquisitionDebtRate;
  const caDeductibleMortgageInterest = Math.min(acquisitionDebt, 1000000) * acquisitionDebtRate;
  const deductibleMortgageInterest = federalDeductibleMortgageInterest;
  const nonDeductibleMortgageInterest = acquisitionDebtInterest - federalDeductibleMortgageInterest;

  // Margin interest: deductible as INVESTMENT interest
  const deductibleMarginInterest = Math.min(marginInterestAnnual, marginDeductibleIncome);
  const nonDeductibleMarginInterest = marginInterestAnnual - deductibleMarginInterest;

  // Cash-out refi interest (cash-out portion): investment interest if proceeds invested
  const remainingDeductibleIncomeForCashOut = Math.max(0, totalDeductibleInvestmentIncome - deductibleMarginInterest);
  const deductibleCashOutInterest = Math.min(cashOutInterestAnnual, remainingDeductibleIncomeForCashOut);
  const nonDeductibleCashOutInterest = cashOutInterestAnnual - deductibleCashOutInterest;

  // HELOC interest: investment interest if proceeds invested
  const remainingDeductibleIncomeForHELOC = Math.max(0, totalDeductibleInvestmentIncome - deductibleMarginInterest - deductibleCashOutInterest);
  const deductibleHELOCInterest = Math.min(helocInterestAnnual, remainingDeductibleIncomeForHELOC);
  const nonDeductibleHELOCInterest = helocInterestAnnual - deductibleHELOCInterest;

  // Itemized deductions for Schedule A
  const saltCapped = Math.min(stateTax + propTax, 10000);
  const saltLost = Math.max(0, stateTax + propTax - 10000);
  const itemizedTotal = deductibleMortgageInterest + saltCapped;
  const shouldItemize = itemizedTotal > stdDeduction;

  // Tax benefits calculation
  const federalMortgageTaxBenefit = shouldItemize ? Math.max(0, itemizedTotal - stdDeduction) * fedRate : 0;

  // California mortgage interest benefit
  const caStdDeduction = filingStatus === 'married' ? 10726 : 5363;
  const caItemizedTotal = caDeductibleMortgageInterest + propTax;
  const shouldItemizeCA = caItemizedTotal > caStdDeduction;
  const caMortgageTaxBenefit = shouldItemizeCA ? Math.max(0, caItemizedTotal - caStdDeduction) * caRate : 0;

  const mortgageTaxBenefit = federalMortgageTaxBenefit + caMortgageTaxBenefit;

  // Investment interest benefit
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
  
  // NIIT calculation
  const niitThreshold = filingStatus === 'married' ? 250000 : 200000;
  const subjectToNIIT = grossIncome > niitThreshold;
  const niitRate = subjectToNIIT ? 0.038 : 0;
  const afterNIITReturn = investmentReturn * (1 - niitRate * 0.5);

  const yearlyAnalysis = [];
  const renterInitialInvestment = totalEquityInput + tx.buy;
  let renterPortfolio = renterInitialInvestment;

  for (let y = 1; y <= 30; y++) {
    const homeVal = homePrice * Math.pow(1 + appreciationRate, y);
    const amortData = amort.schedule[y-1] || amort.schedule[amort.schedule.length - 1] || { balance: 0, yearlyInterest: 0 };
    const loanBal = amortData.balance || 0;
    
    const equity = homeVal - loanBal - marginLoan - actualHELOC;
    
    const yPropTax = propTax * Math.pow(1.02, y - 1);
    const marketPropTax = homeVal * SF.propTaxRate;
    const prop13Savings = marketPropTax - yPropTax;
    
    const yMortgageInt = amortData.yearlyInterest || (acquisitionDebtInterest * Math.pow(0.97, y));
    const yMortgagePrincipal = amortData.yearlyPrincipal || (amort.monthlyPayment * 12 - yMortgageInt);

    const ySaltCapped = Math.min(stateTax + yPropTax, 10000);
    const ySaltFull = stateTax + yPropTax;

    const yFedDeductibleInt = yMortgageInt * (acquisitionDebt <= 750000 ? 1 : 750000/acquisitionDebt);
    const yFedItemized = yFedDeductibleInt + ySaltCapped;
    const yFedMortgageBenefit = yFedItemized > stdDeduction ? (yFedItemized - stdDeduction) * fedRate : 0;

    const yCADeductibleInt = yMortgageInt * (acquisitionDebt <= 1000000 ? 1 : 1000000/acquisitionDebt);
    const yCAItemized = yCADeductibleInt + yPropTax;
    const yCAMortgageBenefit = yCAItemized > caStdDeduction ? (yCAItemized - caStdDeduction) * caRate : 0;

    const yMortgageBenefit = yFedMortgageBenefit + yCAMortgageBenefit;
    const yInvestBenefit = investInterestTaxBenefit;
    const yTotalBenefit = yMortgageBenefit + yInvestBenefit;
    
    const yOwnerOutflow = (amort.monthlyPayment * 12) + marginInterestAnnual + helocInterestAnnual + 
                          (y <= pmi.years ? pmi.monthly * 12 : 0) + 
                          yPropTax + insurance + maintenance - yTotalBenefit;
    
    const yRent = monthlyRent * 12 * Math.pow(1 + rentGrowthRate, y - 1);
    
    renterPortfolio = renterPortfolio * (1 + afterNIITReturn);

    const costDiff = yOwnerOutflow - yRent;
    if (costDiff > 0) {
      renterPortfolio += costDiff;
    }
    
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

  const year1Data = yearlyAnalysis[0] || {};
  const year30Data = yearlyAnalysis[29] || {};
  const breakEvenSensitivity = {
    year1CostDiff: year1Data.costDiff || 0,
    ownerAdvantageYear30: year30Data.advantage || 0,
    appreciationNeeded: breakEvenYear === 'Never' && year30Data.renterWealth > year30Data.ownerWealth
      ? ((year30Data.renterWealth / homePrice) ** (1/30) - 1) * 100
      : null,
    rentNeeded: breakEvenYear === 'Never' && year1Data.costDiff > 0
      ? monthlyRent + (year1Data.costDiff / 12)
      : null,
    subjectToNIIT,
    niitRate,
    afterNIITReturn
  };
  
  return {
    homePrice,
    totalDown: totalEquityInput,
    cashDown,
    marginLoan,
    helocAmount: actualHELOC,
    mortgageLoan: isCashOutRefi ? 0 : mortgageLoan,
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
    mortgageInterestAnnual: acquisitionDebtInterest,
    cashOutInterestAnnual,
    marginInterestAnnual,
    helocInterestAnnual,
    totalInterestAnnual,
    deductibleMortgageInterest,
    nonDeductibleMortgageInterest,
    deductibleCashOutInterest,
    nonDeductibleCashOutInterest,
    deductibleMarginInterest,
    nonDeductibleMarginInterest,
    deductibleHELOCInterest,
    nonDeductibleHELOCInterest,
    investmentInterestDeduction,
    totalInvestmentIncome,
    totalDeductibleInvestmentIncome,
    dividendYield,
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
    mortgageEffectiveRate,
    cashOutEffectiveRate,
    marginEffectiveRate,
    helocEffectiveRate,
    blendedEffectiveRate,
    nonRecovBreakdown,
    propTax,
    insurance,
    maintenance,
    yearlyAnalysis,
    breakEvenYear,
    breakEvenSensitivity,
    ownerWealth20: yearlyAnalysis[19]?.ownerWealth || 0,
    renterWealth20: yearlyAnalysis[19]?.renterWealth || 0
  };
};

// Optimization engine
export const runOptimization = (params) => {
  const { homePrice, totalSavings, stockPortfolio, mortgageRate, cashOutRefiRate = 0.0675, loanTerm, appreciationRate, investmentReturn, dividendYield = 0.02, monthlyRent, rentGrowthRate = 0.03, marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, minBuffer, filingStatus = 'married', grossIncome = 0 } = params;
  
  const results = [];
  const maxMarginPct = 0.30;
  
  // Strategy 1: Traditional (cash down + mortgage)
  for (const dpPct of [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
    const cashDown = homePrice * dpPct;
    const scenario = calcScenario({
      homePrice, cashDown, marginLoan: 0, helocAmount: 0,
      mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent, rentGrowthRate,
      marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
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
        marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
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
  const maxMargin = stockPortfolio * maxMarginPct;
  const canBuyCash = totalSavings + maxMargin >= homePrice;
  
  if (canBuyCash) {
    for (const marginPct of [0, 0.10, 0.15, 0.20, 0.25, 0.30]) {
      const marginLoan = stockPortfolio * marginPct;
      const cashNeeded = homePrice - marginLoan;
      
      if (cashNeeded > totalSavings) continue;
      
      for (const helocPct of [0.30, 0.40, 0.50, 0.60, 0.70, 0.80]) {
        const helocAmount = homePrice * helocPct;
        
        const scenario = calcScenario({
          homePrice, cashDown: cashNeeded, marginLoan, helocAmount,
          mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
          marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
        });
        
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
  for (const dpPct of [0.20, 0.25, 0.30, 0.35, 0.40]) {
    for (const cashOutPct of [0.20, 0.30, 0.40, 0.50]) {
      const cashDown = homePrice * dpPct;
      if (cashDown > totalSavings - minBuffer) continue;

      const baseMortgage = homePrice - cashDown;
      const cashOutAmount = homePrice * cashOutPct;
      const maxLTV = 0.80;

      if ((baseMortgage + cashOutAmount) / homePrice > maxLTV) continue;

      const scenario = calcScenario({
        homePrice, cashDown, marginLoan: 0, helocAmount: 0,
        cashOutRefiAmount: cashOutAmount, cashOutRefiRate,
        mortgageRate, loanTerm, appreciationRate, investmentReturn, dividendYield, monthlyRent,
        marginRate, helocRate, fedRate, caRate, stateTax, stdDeduction, filingStatus, grossIncome
      });

      const remaining = totalSavings - cashDown - scenario.txCosts.buy + cashOutAmount;

      if (remaining >= minBuffer) {
        results.push({
          ...scenario,
          strategy: 'Cash-Out Refi',
          strategyDesc: `${(dpPct*100).toFixed(0)}% down + ${(cashOutPct*100).toFixed(0)}% cash-out refi`,
          remaining,
          riskLevel: 'Medium',
          dpPct: dpPct * 100
        });
      }
    }
  }

  // Score and rank
  const scored = results.map(r => {
    const advantage20 = r.ownerWealth20 - r.renterWealth20;
    const advantageScore = advantage20 / 500000;
    const breakEvenScore = r.breakEvenYear === 'Never' ? -3 : (30 - r.breakEvenYear) / 30 * 3;
    const riskScore = r.riskLevel === 'Low' ? 1.5 : r.riskLevel === 'Medium' ? 1 : r.riskLevel === 'Medium-High' ? 0.5 : 0;
    const effectiveRateScore = (0.08 - r.blendedEffectiveRate) * 20;
    const bufferScore = Math.min(r.remaining / minBuffer, 2) * 0.5;

    return {
      ...r,
      advantage20,
      score: advantageScore * 0.4 + breakEvenScore * 0.25 + riskScore * 0.1 + effectiveRateScore * 0.15 + bufferScore * 0.1
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
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

// Affordability calculator
export const calcAffordability = ({ grossIncome, totalSavings, mortgageRate, loanTerm, minBuffer, monthlyHOA = 0, monthlyOtherDebt = 0, monthlyRent = 0, effectiveTaxRate = 0.45, targetTakeHomePct = null }) => {
  const DTI_CEILING = 0.43;
  const DP_OPTIONS = [0.05, 0.10, 0.20, 0.30, 0.50];
  const rate = mortgageRate / 100;
  const mr = rate / 12;
  const n = loanTerm * 12;
  const insuranceRate = 0.0035;
  const pmiRate = 0.005;
  const monthlyTakeHome = grossIncome * (1 - effectiveTaxRate) / 12;
  const dtiMax = (grossIncome * DTI_CEILING / 12) - monthlyOtherDebt;
  const maxMonthlyHousing = targetTakeHomePct
    ? Math.min(targetTakeHomePct * monthlyTakeHome, dtiMax)
    : dtiMax;

  const options = DP_OPTIONS.map(dpPct => {
    if (maxMonthlyHousing <= 0 || grossIncome <= 0) return { dpPct, maxPrice: 0, monthlyPITI: 0, cashNeeded: 0, remaining: 0, limitedBy: 'income', takeHomePct: 0, vsRent: 0, bufferMonths: 0, maxPriceByIncome: 0, monthlyBreakdown: { pi: 0, tax: 0, insurance: 0, pmi: 0, hoa: 0 } };

    const loanFrac = 1 - dpPct;
    const piFactor = loanFrac > 0 ? (mr === 0 ? loanFrac / n : loanFrac * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1)) : 0;
    const taxFactor = SF.propTaxRate / 12;
    const insFactor = insuranceRate / 12;
    const pmiFactor = loanFrac > 0.80 ? (loanFrac * pmiRate / 12) : 0;
    const perDollarCost = piFactor + taxFactor + insFactor + pmiFactor;
    const fixedMonthly = monthlyHOA + (SF.parcelTax / 12);

    const maxPriceByIncome = perDollarCost > 0 ? (maxMonthlyHousing - fixedMonthly) / perDollarCost : 0;

    const availableCash = totalSavings - minBuffer;
    const closingFactor = SF.closeBuy + SF.transferTax + loanFrac * 0.005 + 0.003;
    const cashPerDollar = dpPct + closingFactor;
    const fixedClosing = 2500;
    const maxPriceBySavings = cashPerDollar > 0 ? (availableCash - fixedClosing) / cashPerDollar : 0;

    const limitedBy = maxPriceByIncome <= maxPriceBySavings ? 'income' : 'savings';
    const maxPrice = Math.max(0, Math.floor(Math.min(maxPriceByIncome, maxPriceBySavings)));

    const loan = maxPrice * loanFrac;
    const pi = loanFrac > 0 ? calcMonthly(loan, rate, loanTerm) : 0;
    const tax = maxPrice * SF.propTaxRate / 12;
    const insurance = maxPrice * insuranceRate / 12;
    const pmi = loanFrac > 0.80 ? loan * pmiRate / 12 : 0;
    const monthlyPITI = pi + tax + insurance + pmi + monthlyHOA;

    const txCosts = calcTxCosts(maxPrice, loan);
    const cashNeeded = maxPrice * dpPct + txCosts.buy;
    const remaining = totalSavings - cashNeeded;

    const takeHomePct = monthlyTakeHome > 0 ? monthlyPITI / monthlyTakeHome : 0;
    const vsRent = monthlyPITI - monthlyRent;
    const bufferMonths = monthlyPITI > 0 ? remaining / monthlyPITI : 0;

    return { dpPct, maxPrice, monthlyPITI, cashNeeded, remaining, limitedBy, takeHomePct, vsRent, bufferMonths, maxPriceByIncome: Math.floor(Math.max(0, maxPriceByIncome)), monthlyBreakdown: { pi, tax, insurance, pmi, hoa: monthlyHOA } };
  });

  return { options, monthlyTakeHome };
};
