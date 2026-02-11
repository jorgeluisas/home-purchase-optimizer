'use client';

import React from 'react';
import { fmt$, fmtPct, fmtPctWhole } from './calculations';

// Info Box Component
export const InfoBox = ({ title, children, recommendation, isOpen, onToggle }) => (
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

// Non-Recoverable Cost Breakdown Component
export const NonRecovBreakdown = ({ nr, rent, styles }) => {
  const s = styles;
  
  return (
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
};

// Total Wealth Impact Summary Component
export const WealthImpactSummary = ({ opt, investmentReturn, homeAppreciation, openInfoBoxes, toggleInfo, styles }) => {
  const s = styles;
  
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
    <div style={{ ...s.card, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.08))', border: '2px solid rgba(59,130,246,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ fontSize: '1.5rem' }}>📊</div>
        <div>
          <h3 style={{ ...s.section, marginTop: 0, marginBottom: '4px' }}>Total Wealth Impact</h3>
          <p style={{ margin: 0, color: '#8b8ba7', fontSize: '0.85rem' }}>Buy vs. Rent + Invest Comparison</p>
        </div>
      </div>

      {/* Year 10/20/30 Comparison Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
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

// Monthly Cash Flow Impact Component
export const MonthlyCashFlow = ({ opt, monthlyRent, estimatedTakeHome, combRate, styles }) => {
  const s = styles;
  
  if (!opt) return null;

  const nr = opt.nonRecovBreakdown;
  const takeHome = estimatedTakeHome;

  // Monthly housing cost breakdown
  const monthlyPI = opt.monthlyPayment || 0;
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

  // Warning threshold
  const remainingPct = afterPurchaseCashFlow / takeHome;
  const showWarning = remainingPct < 0.20;

  // Annual amounts for timing calendar
  const annualPropTax = nr.propertyTax;
  const annualInsurance = nr.insurance;
  const annualTaxBenefit = opt.totalTaxBenefit;

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ fontSize: '1.5rem' }}>💵</div>
        <div>
          <h3 style={{ ...s.section, marginTop: 0, marginBottom: '4px' }}>Monthly Cash Flow Impact</h3>
          <p style={{ margin: 0, color: '#8b8ba7', fontSize: '0.85rem' }}>How this purchase affects your family budget</p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
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

          {/* Semi-Annual: Property Tax */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#d0d0e0' }}>
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

export default { InfoBox, NonRecovBreakdown, WealthImpactSummary, MonthlyCashFlow };
