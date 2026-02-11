'use client';

import React, { useState } from 'react';
import { fmtNum, fmtPct } from './calculations';

// Input component with formatting
export const CurrencyInput = ({ value, onChange, label, min = 0, max = Infinity, style }) => {
  const [focused, setFocused] = useState(false);
  const [tempValue, setTempValue] = useState('');

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

// Collapsible Section Header Component
const SectionHeader = ({ title, isOpen, onToggle, icon, color = '#f97316' }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      marginTop: '20px',
      marginBottom: '12px',
      padding: '8px 0',
      borderBottom: `1px solid rgba(255,255,255,0.08)`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
      <h3 style={{
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: color,
        fontWeight: '600',
        margin: 0,
      }}>
        {title}
      </h3>
    </div>
    <span style={{
      color: color,
      fontSize: '0.7rem',
      transition: 'transform 0.2s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    }}>
      ▼
    </span>
  </div>
);

// Non-collapsible Section Header
const StaticSectionHeader = ({ title, icon, color = '#f97316' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '0',
    marginBottom: '16px',
  }}>
    {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
    <h3 style={{
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: color,
      fontWeight: '600',
      margin: 0,
    }}>
      {title}
    </h3>
  </div>
);

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
  
  // Local state for collapsible sections
  const [ratesOpen, setRatesOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <aside style={s.panel}>
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: YOUR FINANCES (Always Visible)
          Core inputs most users need to change
      ═══════════════════════════════════════════════════════════════════ */}
      <StaticSectionHeader title="Your Finances" icon="💰" />
      
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
        <label style={s.label}>Gross Annual Income</label>
        <CurrencyInput style={s.input} value={grossIncome} onChange={setGrossIncome} min={0} max={50000000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Current Monthly Rent</label>
        <CurrencyInput style={s.input} value={monthlyRent} onChange={setMonthlyRent} min={0} max={100000} />
      </div>
      <div style={s.inputGroup}>
        <label style={s.label}>Filing Status</label>
        <select style={s.select} value={filingStatus} onChange={e => setFilingStatus(e.target.value)}>
          <option value="married">Married Filing Jointly</option>
          <option value="single">Single / Head of Household</option>
        </select>
      </div>

      {/* Combined Tax Rate Display (read-only derived value) */}
      <div style={{
        ...s.auto,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '16px',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#fb923c', textTransform: 'uppercase' }}>Combined Marginal Tax Rate</div>
          <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '2px' }}>Federal + California</div>
        </div>
        <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '600' }}>{fmtPct(combRate)}</div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: RATES & ASSUMPTIONS (Collapsible, starts open)
          Common assumptions most users may want to tweak
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionHeader 
        title="Rates & Assumptions" 
        icon="📊" 
        isOpen={ratesOpen} 
        onToggle={() => setRatesOpen(!ratesOpen)}
        color="#60a5fa"
      />
      
      {ratesOpen && (
        <div>
          <div style={s.inputGroup}>
            <label style={s.label}>Mortgage Rate (%)</label>
            <input type="number" step="0.125" style={s.input} value={mortgageRate} onChange={e => setMortgageRate(Number(e.target.value))} />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Home Appreciation (%/yr)</label>
            <input type="number" step="0.5" style={s.input} value={homeAppreciation} onChange={e => setHomeAppreciation(Number(e.target.value))} />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Expected Investment Return (%)</label>
            <input type="number" step="0.5" style={s.input} value={investmentReturn} onChange={e => setInvestmentReturn(Number(e.target.value))} />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Margin Loan Rate (%)</label>
            <input type="number" step="0.25" style={s.input} value={marginRate} onChange={e => setMarginRate(Number(e.target.value))} />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>HELOC Rate (%)</label>
            <input type="number" step="0.25" style={s.input} value={helocRate} onChange={e => setHelocRate(Number(e.target.value))} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: ADVANCED SETTINGS (Collapsed by default)
          Settings most users won't need to change
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionHeader 
        title="Advanced Settings" 
        icon="⚙️" 
        isOpen={advancedOpen} 
        onToggle={() => setAdvancedOpen(!advancedOpen)}
        color="#a78bfa"
      />
      
      {advancedOpen && (
        <div>
          <div style={s.inputGroup}>
            <label style={s.label}>Min. Cash Buffer After Purchase</label>
            <CurrencyInput style={s.input} value={minBuffer} onChange={setMinBuffer} min={0} max={10000000} />
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '4px' }}>
              Emergency fund to keep after closing
            </div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Dividend/Income Yield (%)</label>
            <input type="number" step="0.25" style={s.input} value={dividendYield} onChange={e => setDividendYield(Number(e.target.value))} />
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '4px' }}>
              For investment interest deduction limit (actual income only)
            </div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Rent Growth (%/yr)</label>
            <input type="number" step="0.5" style={s.input} value={rentGrowth} onChange={e => setRentGrowth(Number(e.target.value))} />
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '4px' }}>
              Expected annual rent increase (SF avg: 3-5%)
            </div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Cash-Out Refi Rate (%)</label>
            <input type="number" step="0.125" style={s.input} value={cashOutRefiRate} onChange={e => setCashOutRefiRate(Number(e.target.value))} />
            <div style={{ fontSize: '0.65rem', color: '#8b8ba7', marginTop: '4px' }}>
              Typically 0.125-0.5% higher than purchase rate
            </div>
          </div>
        </div>
      )}

      {/* Optimize Button */}
      <button style={{ ...s.btn, marginTop: '24px' }} onClick={onOptimize}>
        🚀 Run Optimization
      </button>
      
      {/* Collapsed indicator when advanced is closed */}
      {!advancedOpen && (
        <div style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: '#6b7280',
          marginTop: '12px',
        }}>
          Using smart defaults • Click "Advanced Settings" to customize
        </div>
      )}
    </aside>
  );
};

export default InputPanel;
