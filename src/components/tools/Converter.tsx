import { useState, useRef } from 'react';

export default function Converter() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState<'webp' | 'jpeg' | 'png'>('webp');
    const [isHeic, setIsHeic] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        setResult(null);
        setConvertedBlob(null);

        // Revoke previous preview URL
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }

        // Check if file is HEIC
        if (selectedFile) {
            const isHeicFile = selectedFile.name.toLowerCase().endsWith('.heic') ||
                selectedFile.name.toLowerCase().endsWith('.heif') ||
                selectedFile.type === 'image/heic' ||
                selectedFile.type === 'image/heif';
            setIsHeic(isHeicFile);
        }
    };

    const convertHeic = async (heicFile: File): Promise<Blob> => {
        // Dynamic import for heic2any
        const heic2any = (await import('heic2any')).default;
        const result = await heic2any({
            blob: heicFile,
            toType: `image/${outputFormat === 'jpeg' ? 'jpeg' : 'png'}`,
            quality: 0.9
        });
        return Array.isArray(result) ? result[0] : result;
    };

    const handleConvert = async () => {
        if (!file) return;
        setLoading(true);
        setResult(null);
        setConvertedBlob(null);

        // Revoke previous preview URL
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }

        try {
            let imageBlob: Blob;

            // Handle HEIC conversion
            if (isHeic) {
                imageBlob = await convertHeic(file);

                // If output format is webp, we need to convert again
                if (outputFormat === 'webp') {
                    const img = new Image();
                    const tempUrl = URL.createObjectURL(imageBlob);

                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);

                            canvas.toBlob((blob) => {
                                if (blob) {
                                    imageBlob = blob;
                                }
                                URL.revokeObjectURL(tempUrl);
                                resolve();
                            }, 'image/webp', 0.85);
                        };
                        img.onerror = reject;
                        img.src = tempUrl;
                    });
                }

                // Store blob for download
                setConvertedBlob(imageBlob);
                // Create preview URL
                const url = URL.createObjectURL(imageBlob);
                setPreviewUrl(url);

                setResult({
                    originalName: file.name,
                    originalSize: (file.size / 1024).toFixed(2) + ' KB',
                    convertedSize: (imageBlob.size / 1024).toFixed(2) + ' KB',
                    format: outputFormat.toUpperCase(),
                    compression: ((1 - imageBlob.size / file.size) * 100).toFixed(1) + '%',
                    isHeicConversion: true
                });
                setLoading(false);
                return;
            }

            // Handle regular image conversion
            if (file.type.startsWith('image/')) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);

                    const mimeType = outputFormat === 'webp' ? 'image/webp' :
                        outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
                    const quality = outputFormat === 'png' ? undefined : 0.85;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            // Store blob for download
                            setConvertedBlob(blob);
                            // Create preview URL
                            const url = URL.createObjectURL(blob);
                            setPreviewUrl(url);

                            setResult({
                                originalName: file.name,
                                originalSize: (file.size / 1024).toFixed(2) + ' KB',
                                convertedSize: (blob.size / 1024).toFixed(2) + ' KB',
                                format: outputFormat.toUpperCase(),
                                compression: ((1 - blob.size / file.size) * 100).toFixed(1) + '%'
                            });
                        }
                        setLoading(false);
                    }, mimeType, quality);
                };

                img.onerror = () => {
                    setResult({ error: 'Failed to load image' });
                    setLoading(false);
                };

                img.src = URL.createObjectURL(file);
            } else {
                setResult({ error: 'Only image files are supported' });
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Conversion error:', err);
            setResult({ error: err.message || 'Conversion failed' });
            setLoading(false);
        }
    };

    const getFileExtension = () => {
        if (outputFormat === 'jpeg') return '.jpg';
        return `.${outputFormat}`;
    };

    const getNewFileName = () => {
        if (!file) return 'converted';
        return file.name.replace(/\.[^/.]+$/, '') + getFileExtension();
    };

    // Download function with multiple approaches for maximum compatibility
    const handleDownload = async () => {
        if (!convertedBlob) return;

        const fileName = getNewFileName();
        const mimeType = outputFormat === 'webp' ? 'image/webp' :
            outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';

        // Method 1: Try File System Access API (modern browsers - shows native save dialog)
        if ('showSaveFilePicker' in window) {
            try {
                const fileExtension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: `${outputFormat.toUpperCase()} Image`,
                        accept: { [mimeType]: [`.${fileExtension}`] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(convertedBlob);
                await writable.close();
                return; // Success!
            } catch (err: any) {
                // User cancelled or API not supported, fall through to other methods
                if (err.name !== 'AbortError') {
                    console.log('File System API failed, trying fallback...');
                }
            }
        }

        // Method 2: Create a proper download link with mouse event
        try {
            const blobUrl = URL.createObjectURL(convertedBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.rel = 'noopener';

            // Create and dispatch a mouse event (more reliable than .click())
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });

            link.dispatchEvent(clickEvent);

            // Keep URL alive for 30 seconds
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 30000);

            return;
        } catch (err) {
            console.error('Method 2 failed:', err);
        }

        // Method 3: Last resort - open in new tab
        const blobUrl = URL.createObjectURL(convertedBlob);
        window.open(blobUrl, '_blank');
    };

    return (
        <div className="brutal-card bg-[#e8dff5] dark:bg-brutal-card p-8 rounded-3xl max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-center text-indigo-400">Image Converter</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Konversi gambar termasuk HEIC dari iPhone</p>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-indigo-500 transition-colors cursor-pointer group">
                <input
                    type="file"
                    className="hidden"
                    id="fileInput"
                    accept="image/*,.heic,.heif"
                    onChange={handleFileChange}
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-lg font-bold text-white">{file ? file.name : 'Pilih file atau drop di sini'}</p>
                    <p className="text-sm text-slate-500">Mendukung JPG, PNG, GIF, BMP, HEIC, HEIF</p>
                    {isHeic && (
                        <p className="text-xs text-indigo-400 mt-2">📱 File HEIC dari iPhone terdeteksi</p>
                    )}
                </label>
            </div>

            {/* Output Format Selection */}
            <div className="mt-6">
                <label className="block text-sm text-slate-400 mb-3">Format Output:</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['webp', 'jpeg', 'png'] as const).map((format) => (
                        <button
                            key={format}
                            onClick={() => setOutputFormat(format)}
                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${outputFormat === format
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {format.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleConvert}
                disabled={!file || loading}
                className="w-full mt-6 py-4 text-lg brutal-btn brutal-btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {isHeic ? 'Converting HEIC...' : 'Processing...'}
                    </>
                ) : `Convert to ${outputFormat.toUpperCase()}`}
            </button>

            {result && !result.error && (
                <div className="mt-8 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl">
                    <p className="text-sm font-bold text-green-400 mb-4">
                        ✅ {result.isHeicConversion ? 'HEIC Conversion' : 'Conversion'} Successful!
                    </p>

                    {/* Preview Image */}
                    {previewUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden bg-slate-900/50">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-auto max-h-48 object-contain"
                            />
                        </div>
                    )}

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Original:</span>
                            <span className="text-white truncate max-w-[200px]">{result.originalName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Original Size:</span>
                            <span className="text-white">{result.originalSize}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Output Format:</span>
                            <span className="text-indigo-400">{result.format}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Converted Size:</span>
                            <span className="text-green-400">{result.convertedSize}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Size Change:</span>
                            <span className={parseFloat(result.compression) > 0 ? 'text-green-400' : 'text-yellow-400'}>
                                {parseFloat(result.compression) > 0 ? `${result.compression} saved` : `${Math.abs(parseFloat(result.compression)).toFixed(1)}% larger`}
                            </span>
                        </div>
                    </div>

                    {convertedBlob && (
                        <button
                            onClick={handleDownload}
                            className="mt-4 w-full py-4 brutal-btn bg-brutal-success text-brutal-text disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download {getNewFileName()}
                        </button>
                    )}
                </div>
            )}

            {result?.error && (
                <div className="mt-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400">❌ {result.error}</p>
                </div>
            )}

            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500">
                    💡 <strong>Tip:</strong> File HEIC dari iPhone akan dikonversi langsung di browser.
                    WebP memberikan kompresi terbaik, JPEG untuk kompatibilitas, PNG untuk transparansi.
                </p>
            </div>
        </div>
    );
}
