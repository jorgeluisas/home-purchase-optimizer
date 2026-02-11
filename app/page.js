import { Suspense } from 'react';
import HomePurchaseOptimizer from './HomePurchaseOptimizer';

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0c1220' }} />}>
      <HomePurchaseOptimizer />
    </Suspense>
  );
}
