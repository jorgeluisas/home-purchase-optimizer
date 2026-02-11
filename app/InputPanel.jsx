'use client';

import React from 'react';
import { fmtNum, fmtPct } from './calculations';

// Input component with formatting
export const CurrencyInput = ({ value, onChange, label, min = 0, max = Infinity, style }) => {
  const [focused, setFocused] = React.useState(false);
  const [tempValue, setTempValue] = React.useState('');

  const handleFocus = () => {
    setFocused(true);
    setTempValue(value.toString());
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseInt(tempValue.replace(/[^0-9.-]/g, ''), 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const handleChange = (e) => {
    setTempValue(e.target.value);
  };

  return (
    <input
      type="text"
      style={style}
      value={focused ? tempValue : '$' + fmtNum(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};

// Sidebar Input Panel Component
export const InputPanel = ({
  // Values
  homePrice, totalSavings, stockPortfolio, grossIncome, monthlyRent, rentGrowth,
  filingStatus, mortgageRate, marginRate, helocRate, cashOutRefiRate,
  investmentReturn, dividendYield, homeAppreciation, minBuffer, combRate,
  // Setters
  setHomePrice, setTotalSavings, setStockPortfolio, setGrossIncome,
  setMonthlyRent, setRentGrowth, setFilingStatus, setMortgageRate,
  setMarginRate, setHelocRate, setCashOutRefiRate, setInvestmentReturn,
  setDividendYield, setHomeAppreciation, setMinBuffer,
  // Actions
  onOptimize,
  // Styles
  styles
}) => {
  const s = styles;

  return (
    <aside style={s.panel}>
      <h3 style={{ ...s.section, marginTop: 0 }}>Your Situation</h3>
      <div style={s.inputGroup}>
        <label style={s.label}>Target Home Price</label>
        <CurrencyInput style={s.input} value={homePrice} onChange={setHomePrice} min={100000} max={50000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Total Cash Savings</label>
        <CurrencyInput style={s.input} value={totalSavings} onChange={setTotalSavings} min={0} max={50000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Stock Portfolio</label>
        <CurrencyInput style={s.input} value={stockPortfolio} onChange={setStockPortfolio} min={0} max={50000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Gross Income</label>
        <CurrencyInput style={s.input} value={grossIncome} onChange={setGrossIncome} min={0} max={50000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Monthly Rent</label>
        <CurrencyInput style={s.input} value={monthlyRent} onChange={setMonthlyRent} min={0} max={100000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Min. Buffer</label>
        <CurrencyInput style={s.input} value={minBuffer} onChange={setMinBuffer} min={0} max={10000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Filing Status</label>
        <select style={s.select} value={filingStatus} onChange={e => setFilingStatus(e.target.value)}>
          <option value="married">Married Filing Jointly</option>
          <option value="single">Single / Head of Household</option>
        </select>
      </div>

      <div style={s.auto}>
        <div style={{ fontSize: '0.7rem', color: '#fb923c', textTransform: 'uppercase' }}>Combined Rate</div>
        <div style={{ fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{fmtPct(combRate)}</div>
      </div>
      
      <h3 style={s.section}>Rates</h3>
      <div style={s.inputGroup}>
        <label style={s.label}>Mortgage (%)</label>
        <input type="number" step="0.125" style={s.input} value={mortgageRate} onChange={e => setMortgageRate(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Margin (%)</label>
        <input type="number" step="0.25" style={s.input} value={marginRate} onChange={e => setMarginRate(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>HELOC (%)</label>
        <input type="number" step="0.25" style={s.input} value={helocRate} onChange={e => setHelocRate(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Cash-Out Refi (%)</label>
        <input type="number" step="0.125" style={s.input} value={cashOutRefiRate} onChange={e => setCashOutRefiRate(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Total Investment Return (%)</label>
        <input type="number" step="0.5" style={s.input} value={investmentReturn} onChange={e => setInvestmentReturn(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Dividend/Income Yield (%)</label>
        <input type="number" step="0.25" style={s.input} value={dividendYield} onChange={e => setDividendYield(Number(e.target.value))} />
        <div style={{ fontSize: '0.7rem', color: '#8b8ba7', marginTop: '4px' }}>For investment interest deduction limit (actual income only)</div>
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Home Appreciation (%)</label>
        <input type="number" step="0.5" style={s.input} value={homeAppreciation} onChange={e => setHomeAppreciation(Number(e.target.value))} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Rent Growth (%/yr)</label>
        <input type="number" step="0.5" style={s.input} value={rentGrowth} onChange={e => setRentGrowth(Number(e.target.value))} />
      </div>

      <button style={s.btn} onClick={onOptimize}>🚀 Run Optimization</button>
    </aside>
  );
};

export default InputPanel;
