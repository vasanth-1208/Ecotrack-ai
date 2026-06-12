'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';

export default function CalculatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Form Inputs State
  const [date, setDate] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  // Step 1: Transportation
  const [carKm, setCarKm] = useState(150);
  const [bikeKm, setBikeKm] = useState(30);
  const [publicTransportKm, setPublicTransportKm] = useState(50);
  const [flightHours, setFlightHours] = useState(0);

  // Step 2: Home Energy
  const [electricityKwh, setElectricityKwh] = useState(100);
  const [lpgKg, setLpgKg] = useState(14);
  const [renewablePercentage, setRenewablePercentage] = useState(0);

  // Step 3: Food Habits
  const [dietType, setDietType] = useState<'vegan' | 'vegetarian' | 'mixed' | 'heavyMeat'>('mixed');

  // Step 4: Shopping
  const [onlinePurchases, setOnlinePurchases] = useState(3);
  const [electronicsItems, setElectronicsItems] = useState(0);
  const [fastFashionItems, setFastFashionItems] = useState(1);

  // Step 5: Waste
  const [foodWasteKg, setFoodWasteKg] = useState(5);
  const [plasticUsageKg, setPlasticUsageKg] = useState(2);
  const [recyclingRate, setRecyclingRate] = useState(20);

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const inputs = {
      date,
      carKm: Number(carKm),
      bikeKm: Number(bikeKm),
      publicTransportKm: Number(publicTransportKm),
      flightHours: Number(flightHours),
      electricityKwh: Number(electricityKwh),
      lpgKg: Number(lpgKg),
      renewablePercentage: Number(renewablePercentage),
      dietType,
      onlinePurchases: Number(onlinePurchases),
      electronicsItems: Number(electronicsItems),
      fastFashionItems: Number(fastFashionItems),
      foodWasteKg: Number(foodWasteKg),
      plasticUsageKg: Number(plasticUsageKg),
      recyclingRate: Number(recyclingRate),
    };

    try {
      const res = await api.footprint.submit(inputs);
      setSuccessData(res);
      
      // Blast Confetti on completion!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      setStep(7); // Show Success Screen
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit calculator values.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 relative">
        
        {/* Step Indicators */}
        {step <= 6 && (
          <div className="mb-8" aria-label="Calculator Progress">
            <div className="flex justify-between items-center text-xs font-bold text-slate-450 uppercase mb-2">
              <span>Step {step} of 6</span>
              <span>
                {step === 1 && 'Commutes & Travel'}
                {step === 2 && 'Household Energy'}
                {step === 3 && 'Dietary Choices'}
                {step === 4 && 'Shopping Habits'}
                {step === 5 && 'Waste & Recycling'}
                {step === 6 && 'Review & Audit'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-full rounded-full transition-all ${
                    i + 1 <= step ? 'bg-emerald-700' : 'bg-slate-200 dark:bg-slate-850'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: TRANSPORT */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 1: Commutes & Transportation</h2>
              <p className="text-xs text-slate-500 mb-4">Input your travel activities for the month (measured in kilometers or hours).</p>

              <div>
                <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase mb-1">Month of Log</label>
                <input
                  id="date"
                  type="month"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="carKm" className="block text-xs font-bold text-slate-500 uppercase mb-1">Petrol/Diesel Car (km/month)</label>
                  <input
                    id="carKm"
                    type="number"
                    min="0"
                    value={carKm}
                    onChange={(e) => setCarKm(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="bikeKm" className="block text-xs font-bold text-slate-500 uppercase mb-1">Bicycle/Walking (km/month)</label>
                  <input
                    id="bikeKm"
                    type="number"
                    min="0"
                    value={bikeKm}
                    onChange={(e) => setBikeKm(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="publicTransportKm" className="block text-xs font-bold text-slate-500 uppercase mb-1">Bus/Metro Rail (km/month)</label>
                  <input
                    id="publicTransportKm"
                    type="number"
                    min="0"
                    value={publicTransportKm}
                    onChange={(e) => setPublicTransportKm(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="flightHours" className="block text-xs font-bold text-slate-500 uppercase mb-1">Air Travel Flight Duration (hours/month)</label>
                  <input
                    id="flightHours"
                    type="number"
                    min="0"
                    value={flightHours}
                    onChange={(e) => setFlightHours(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ENERGY */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 2: Household Energy</h2>
              <p className="text-xs text-slate-500 mb-4">Input your home utilities consumption details.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="electricityKwh" className="block text-xs font-bold text-slate-500 uppercase mb-1">Electricity (kWh/month)</label>
                  <input
                    id="electricityKwh"
                    type="number"
                    min="0"
                    value={electricityKwh}
                    onChange={(e) => setElectricityKwh(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="lpgKg" className="block text-xs font-bold text-slate-500 uppercase mb-1">LPG Gas Cylinder (kg/month)</label>
                  <input
                    id="lpgKg"
                    type="number"
                    min="0"
                    value={lpgKg}
                    onChange={(e) => setLpgKg(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="renewablePercentage" className="block text-xs font-bold text-slate-500 uppercase">Renewable Energy Source share (%)</label>
                  <span className="text-xs font-bold text-emerald-600">{renewablePercentage}%</span>
                </div>
                <input
                  id="renewablePercentage"
                  type="range"
                  min="0"
                  max="100"
                  value={renewablePercentage}
                  onChange={(e) => setRenewablePercentage(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
                <span className="text-[10px] text-slate-500">Includes rooftop solar panel output or green energy utility tariffs (SDG 7).</span>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FOOD */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 3: Dietary Choices</h2>
              <p className="text-xs text-slate-500 mb-4">Select the option that best matches your daily food consumption habits (SDG 12).</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'vegan', name: 'Vegan', desc: '100% plant-based food items. Zero animal dairy or meat products.', factor: '1.5 kg CO2/day' },
                  { id: 'vegetarian', name: 'Vegetarian', desc: 'No animal meat, but includes milk, dairy products, and eggs.', factor: '2.0 kg CO2/day' },
                  { id: 'mixed', name: 'Mixed Diet', desc: 'Moderate meat, poultry, fish, and dairy consumption.', factor: '3.0 kg CO2/day' },
                  { id: 'heavyMeat', name: 'Heavy Meat', desc: 'Frequent red meat, poultry, or fish consumption.', factor: '4.5 kg CO2/day' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDietType(item.id as any)}
                    className={`p-4 border rounded-xl text-left transition-all flex flex-col justify-between ${
                      dietType === item.id
                        ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/30'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</span>
                        {dietType === item.id && <span className="text-emerald-750 font-bold text-sm">✓</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">{item.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 mt-3">{item.factor}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SHOPPING */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 4: Shopping & Purchasing</h2>
              <p className="text-xs text-slate-500 mb-4">Input your approximate purchases count for this month (SDG 12).</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="onlinePurchases" className="block text-xs font-bold text-slate-500 uppercase mb-1">Online Deliveries (orders/month)</label>
                  <input
                    id="onlinePurchases"
                    type="number"
                    min="0"
                    value={onlinePurchases}
                    onChange={(e) => setOnlinePurchases(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="electronicsItems" className="block text-xs font-bold text-slate-500 uppercase mb-1">Electronics bought (items/month)</label>
                  <input
                    id="electronicsItems"
                    type="number"
                    min="0"
                    value={electronicsItems}
                    onChange={(e) => setElectronicsItems(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="fastFashionItems" className="block text-xs font-bold text-slate-500 uppercase mb-1">Clothing/Fast Fashion (items/month)</label>
                  <input
                    id="fastFashionItems"
                    type="number"
                    min="0"
                    value={fastFashionItems}
                    onChange={(e) => setFastFashionItems(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: WASTE */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 5: Waste & Recycling</h2>
              <p className="text-xs text-slate-500 mb-4">Input your household waste disposal quantities and recycling activities.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="foodWasteKg" className="block text-xs font-bold text-slate-500 uppercase mb-1">Food Waste (kg/month)</label>
                  <input
                    id="foodWasteKg"
                    type="number"
                    min="0"
                    value={foodWasteKg}
                    onChange={(e) => setFoodWasteKg(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="plasticUsageKg" className="block text-xs font-bold text-slate-500 uppercase mb-1">Plastic Packaging waste (kg/month)</label>
                  <input
                    id="plasticUsageKg"
                    type="number"
                    min="0"
                    value={plasticUsageKg}
                    onChange={(e) => setPlasticUsageKg(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="recyclingRate" className="block text-xs font-bold text-slate-500 uppercase">Recycling Rate (%)</label>
                  <span className="text-xs font-bold text-emerald-600">{recyclingRate}%</span>
                </div>
                <input
                  id="recyclingRate"
                  type="range"
                  min="0"
                  max="100"
                  value={recyclingRate}
                  onChange={(e) => setRecyclingRate(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
                <span className="text-[10px] text-slate-500">Recycling paper, cans, and glass reduces overall packaging footprint (SDG 12).</span>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-850 dark:text-white mb-2">Step 6: Review & Audit Data</h2>
              <p className="text-xs text-slate-500 mb-4">Please verify that all entries are correct before calculating your carbon footprint.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm">
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-450 text-xs uppercase mb-2">Transport & Commute</h4>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>Car commute: <span className="font-bold text-slate-800 dark:text-white">{carKm} km</span></li>
                    <li>Bicycle/walking: <span className="font-bold text-slate-800 dark:text-white">{bikeKm} km</span></li>
                    <li>Bus/metro transit: <span className="font-bold text-slate-800 dark:text-white">{publicTransportKm} km</span></li>
                    <li>Air travel: <span className="font-bold text-slate-800 dark:text-white">{flightHours} flight hours</span></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-450 text-xs uppercase mb-2">Energy & Diet</h4>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>Electricity: <span className="font-bold text-slate-800 dark:text-white">{electricityKwh} kWh</span> ({renewablePercentage}% green)</li>
                    <li>LPG usage: <span className="font-bold text-slate-800 dark:text-white">{lpgKg} kg</span></li>
                    <li>Diet style: <span className="font-bold text-slate-800 dark:text-white">{dietType.toUpperCase()}</span></li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Auditing emissions...
                    </>
                  ) : (
                    'Calculate Carbon Footprint 🌱'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: SUCCESS REWARD SCREEN */}
          {step === 7 && successData && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
              <span className="text-6xl block animate-bounce">🏆</span>
              <h2 className="text-2xl font-black text-emerald-800 dark:text-emerald-400">Footprint Audited Successfully!</h2>
              
              <div className="max-w-md mx-auto bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 rounded-2xl p-6 shadow-inner">
                <p className="text-sm text-slate-500">Calculated Footprint Emissions</p>
                <p className="text-4xl font-black text-slate-850 dark:text-white mt-1">{successData.footprint.totalEmissions} <span className="text-lg font-normal text-slate-500">kg CO₂</span></p>

                <div className="border-t border-emerald-200 dark:border-emerald-900 mt-4 pt-4 text-left space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rewards & Level-up Progress</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">⭐ Earned +{successData.gamification.pointsEarned} Points</p>
                  <div className="space-y-1">
                    {successData.gamification.messages.map((msg: string, i: number) => (
                      <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">✓ {msg}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/coach')}
                  className="py-2.5 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all"
                >
                  Consult AI Coach
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
