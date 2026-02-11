'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { fmt$ } from './calculations';

// Wealth Comparison Chart (Own vs Rent)
export const WealthComparisonChart = ({ data, styles }) => {
  const s = styles;
  
  return (
    <div style={s.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
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
  );
};

// Prop 13 Savings Chart
export const Prop13SavingsChart = ({ data, styles }) => {
  const s = styles;
  
  return (
    <div style={s.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="year" stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
          <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} />
          <Area type="monotone" dataKey="prop13Savings" name="Annual Prop 13 Savings" stroke="#4ade80" fill="rgba(74,222,128,0.2)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Multi-Scenario Comparison Chart
export const ScenarioComparisonChart = ({ scenarios, colors, styles }) => {
  const s = styles;
  
  return (
    <div style={s.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="year" type="number" domain={[1, 30]} stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} />
          <YAxis stroke="#8b8ba7" tick={{fill:'#8b8ba7'}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
          <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px'}} formatter={v=>fmt$(v)} labelFormatter={l=>`Year ${l}`} />
          <Legend />
          {scenarios.map((sc, idx) => (
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
  );
};

// Year-by-Year Comparison Table
export const YearlyComparisonTable = ({ data, styles }) => {
  const s = styles;
  
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Year</th>
          <th style={s.th}>Home Value</th>
          <th style={s.th}>Owner Wealth</th>
          <th style={s.th}>Renter Wealth</th>
          <th style={s.th}>Owner Cost</th>
          <th style={s.th}>Rent</th>
          <th style={s.th}>Δ Wealth</th>
        </tr>
      </thead>
      <tbody>
        {[1,2,3,5,7,10,15,20,30].map(y => { 
          const d = data[y-1]; 
          if(!d) return null; 
          return (
            <tr key={y} style={d.breakEven ? s.highlight : {}}>
              <td style={s.td}>{y}</td>
              <td style={s.td}>{fmt$(d.homeValue)}</td>
              <td style={s.td}>{fmt$(d.ownerWealth)}</td>
              <td style={s.td}>{fmt$(d.renterWealth)}</td>
              <td style={s.td}>{fmt$(d.ownerOutflow)}</td>
              <td style={s.td}>{fmt$(d.yearlyRent)}</td>
              <td style={{ ...s.td, color: d.advantage >= 0 ? '#4ade80' : '#f87171', fontWeight: '600' }}>
                {d.advantage >= 0 ? '+' : ''}{fmt$(d.advantage)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Interest Deductibility Table
export const InterestDeductibilityTable = ({ opt, styles }) => {
  const s = styles;
  
  return (
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
            <td style={s.td}>{((opt.mortgageEffectiveRate || 0) * 100).toFixed(2)}%</td>
          </tr>
        )}
        {opt.marginLoan > 0 && (
          <tr>
            <td style={s.td}>Margin ({fmt$(opt.marginLoan)})</td>
            <td style={s.td}>{fmt$(opt.marginInterestAnnual)}</td>
            <td style={{ ...s.td, color: '#4ade80' }}>{fmt$(opt.deductibleMarginInterest)}</td>
            <td style={{ ...s.td, color: opt.nonDeductibleMarginInterest > 0 ? '#f87171' : '#4ade80' }}>{fmt$(opt.nonDeductibleMarginInterest)}</td>
            <td style={s.td}>{((opt.marginEffectiveRate || 0) * 100).toFixed(2)}%</td>
          </tr>
        )}
        {opt.helocAmount > 0 && (
          <tr>
            <td style={s.td}>HELOC ({fmt$(opt.helocAmount)})</td>
            <td style={s.td}>{fmt$(opt.helocInterestAnnual)}</td>
            <td style={{ ...s.td, color: '#4ade80' }}>{fmt$(opt.deductibleHELOCInterest)}</td>
            <td style={{ ...s.td, color: opt.nonDeductibleHELOCInterest > 0 ? '#f87171' : '#4ade80' }}>{fmt$(opt.nonDeductibleHELOCInterest)}</td>
            <td style={s.td}>{((opt.helocEffectiveRate || 0) * 100).toFixed(2)}%</td>
          </tr>
        )}
        <tr style={s.highlight}>
          <td style={{ ...s.td, fontWeight: '600' }}>TOTAL / BLENDED</td>
          <td style={{ ...s.td, fontWeight: '600' }}>{fmt$(opt.totalInterestAnnual)}</td>
          <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{fmt$(opt.deductibleMortgageInterest + opt.deductibleMarginInterest + opt.deductibleHELOCInterest)}</td>
          <td style={{ ...s.td, fontWeight: '600' }}>{fmt$(opt.nonDeductibleMortgageInterest + opt.nonDeductibleMarginInterest + opt.nonDeductibleHELOCInterest)}</td>
          <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{((opt.blendedEffectiveRate || 0) * 100).toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>
  );
};

// Top Strategies Comparison Table
export const TopStrategiesTable = ({ strategies, styles }) => {
  const s = styles;
  
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Strategy</th>
          <th style={s.th}>Down</th>
          <th style={s.th}>Monthly</th>
          <th style={s.th}>Eff. Rate</th>
          <th style={s.th}>Break-even</th>
          <th style={s.th}>20-Yr Wealth</th>
        </tr>
      </thead>
      <tbody>
        {strategies.map((r, i) => (
          <tr key={i} style={i === 0 ? s.highlight : {}}>
            <td style={s.td}>
              {r.strategyDesc}
              {i === 0 && <span style={{ ...s.badge, ...s.badgeGreen }}>Best</span>}
              {r.helocAmount > 0 && <span style={{ ...s.badge, ...s.badgePurple }}>HELOC</span>}
            </td>
            <td style={s.td}>{fmt$(r.totalDown)}</td>
            <td style={s.td}>{fmt$(r.monthlyPayment)}</td>
            <td style={s.td}>{((r.blendedEffectiveRate || 0) * 100).toFixed(2)}%</td>
            <td style={s.td}>{r.breakEvenYear}</td>
            <td style={s.td}>{fmt$(r.ownerWealth20)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Scenario Comparison Table
export const ScenarioComparisonTable = ({ scenarios, minBuffer, styles }) => {
  const s = styles;
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];
  
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Metric</th>
          {scenarios.map((sc, idx) => (
            <th key={sc.id} style={{ ...s.th, color: colors[idx % colors.length] }}>{sc.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={s.td}>Total Down Payment</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.totalDown)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Mortgage Amount</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.mortgageLoan || sc.acquisitionDebt || 0)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Margin Loan</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.marginLoan)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>HELOC Amount</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.helocAmount)}</td>)}
        </tr>
        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
          <td style={{ ...s.td, fontWeight: '600' }}>Monthly Payment</td>
          {scenarios.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600' }}>{fmt$(sc.monthlyPayment)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Annual Interest (Total)</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.totalInterestAnnual)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Tax Benefit (Annual)</td>
          {scenarios.map(sc => <td key={sc.id} style={{ ...s.td, color: '#4ade80' }}>{fmt$(sc.totalTaxBenefit)}</td>)}
        </tr>
        <tr style={{ background: 'rgba(74,222,128,0.1)' }}>
          <td style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>Blended Effective Rate</td>
          {scenarios.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600', color: '#4ade80' }}>{((sc.blendedEffectiveRate || 0) * 100).toFixed(2)}%</td>)}
        </tr>
        <tr>
          <td style={s.td}>Net Non-Recoverable (Monthly)</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.nonRecovBreakdown.netTotal / 12)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Cash Remaining</td>
          {scenarios.map(sc => <td key={sc.id} style={{ ...s.td, color: sc.remaining < minBuffer ? '#f87171' : '#4ade80' }}>{fmt$(sc.remaining)}</td>)}
        </tr>
        <tr style={{ background: 'rgba(249,115,22,0.1)' }}>
          <td style={{ ...s.td, fontWeight: '600' }}>Break-Even Year</td>
          {scenarios.map(sc => <td key={sc.id} style={{ ...s.td, fontWeight: '600' }}>{sc.breakEvenYear}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Home Equity (Year 20)</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.ownerWealth20)}</td>)}
        </tr>
        <tr>
          <td style={s.td}>Renter Wealth (Year 20)</td>
          {scenarios.map(sc => <td key={sc.id} style={s.td}>{fmt$(sc.renterWealth20)}</td>)}
        </tr>
        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
          <td style={{ ...s.td, fontWeight: '700', fontSize: '0.95rem' }}>Buy vs Rent Advantage</td>
          {scenarios.map((sc, idx) => {
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
  );
};

export default {
  WealthComparisonChart,
  Prop13SavingsChart,
  ScenarioComparisonChart,
  YearlyComparisonTable,
  InterestDeductibilityTable,
  TopStrategiesTable,
  ScenarioComparisonTable
};
