import { useState } from 'react';

export default function Calculator() {
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [result, setResult] = useState<number | null>(null);

    const calculate = (op: string) => {
        switch (op) {
            case '+': setResult(Number(num1) + Number(num2)); break;
            case '-': setResult(Number(num1) - Number(num2)); break;
            case '*': setResult(Number(num1) * Number(num2)); break;
            case '/': setResult(Number(num1) / Number(num2)); break;
        }
    };

    return (
        <div className="glass p-8 rounded-3xl max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Smart Calculator</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Angka Pertama</label>
                    <input
                        type="number"
                        value={num1}
                        onChange={(e) => setNum1(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Angka Kedua</label>
                    <input
                        type="number"
                        value={num2}
                        onChange={(e) => setNum2(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                    />
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {['+', '-', '*', '/'].map(op => (
                        <button
                            key={op}
                            onClick={() => calculate(op)}
                            className="aspect-square bg-slate-800 hover:bg-indigo-600 rounded-xl font-bold text-xl transition-colors text-white"
                        >
                            {op}
                        </button>
                    ))}
                </div>
                {result !== null && (
                    <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center">
                        <p className="text-sm text-slate-400 mb-1">Hasil Perhitungan</p>
                        <p className="text-4xl font-bold text-indigo-400">{result}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
