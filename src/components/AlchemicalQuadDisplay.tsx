import React from 'react';

interface AlchemicalQuadDisplayProps {
  spirit: number;
  essence: number;
  matter: number;
  substance: number;
}

const AlchemicalQuadDisplay: React.FC<AlchemicalQuadDisplayProps> = ({
  spirit,
  essence,
  matter,
  substance,
}) => {
  const data = [
    { name: 'Spirit', value: spirit, color: 'text-amber-400', icon: '✨' },
    { name: 'Essence', value: essence, color: 'text-indigo-400', icon: '💧' },
    { name: 'Matter', value: matter, color: 'text-green-400', icon: '🌿' },
    { name: 'Substance', value: substance, color: 'text-gray-400', icon: '💎' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 p-4 border border-gray-700 rounded-lg">
      {data.map((item) => (
        <div key={item.name} className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-md">
          <span className={`text-3xl ${item.color}`}>{item.icon}</span> {/* Placeholder for icon */}
          <p className={`text-lg font-bold ${item.color} mt-1`}>{item.name}</p>
          <p className="text-sm text-gray-300">{item.value.toFixed(2)}%</p>
        </div>
      ))}
    </div>
  );
};

export default AlchemicalQuadDisplay;
