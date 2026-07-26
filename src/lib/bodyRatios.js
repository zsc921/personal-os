// src/lib/bodyRatios.js
// Waist-to-hip ratio (WHR) and waist-to-height ratio (WHtR), with health-risk
// bands. Thresholds are the commonly cited WHO / public-health figures for women.
// These are general references, not a diagnosis.

export function whr(waist, hip) {
  if (!waist || !hip) return null
  return waist / hip
}

export function whtr(waist, height) {
  if (!waist || !height) return null
  return waist / height
}

// WHR risk for women (WHO): <0.80 low, 0.80-0.85 moderate, >0.85 high.
export function whrBand(ratio) {
  if (ratio == null) return null
  if (ratio < 0.80) return { label: 'Low risk', color: 'var(--green)' }
  if (ratio <= 0.85) return { label: 'Moderate risk', color: 'var(--amber)' }
  return { label: 'High risk', color: 'var(--red)' }
}

// WHtR (unisex, Ashwell): <0.40 slim/underweight range, 0.40-0.49 healthy,
// 0.50-0.59 increased risk, >=0.60 high risk. Simple rule of thumb: keep
// waist under half your height (WHtR < 0.5).
export function whtrBand(ratio) {
  if (ratio == null) return null
  if (ratio < 0.40) return { label: 'Lean', color: 'var(--blue)' }
  if (ratio < 0.50) return { label: 'Healthy', color: 'var(--green)' }
  if (ratio < 0.60) return { label: 'Increased risk', color: 'var(--amber)' }
  return { label: 'High risk', color: 'var(--red)' }
}
