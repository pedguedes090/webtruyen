import { useEffect, useRef, useState } from 'react';

/**
 * CanvasImage - Renders image on canvas to hide URL from HTML
 * This prevents easy right-click save and hides URLs from page source
 */
function CanvasImage({ src, alt, className, ...props }) {
    const canvasRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set canvas size to match image
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight });

            // Draw image on canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            setLoading(false);
            setError(false);
        };

        img.onerror = () => {
            setLoading(false);
            setError(true);
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src]);

    if (error) {
        return (
            <div className={`${className} bg-gray-200 dark:bg-gray-800 flex items-center justify-center min-h-[200px]`}>
                <span className="text-gray-500 text-sm">Không tải được ảnh</span>
            </div>
        );
    }

    return (
        <div className="relative w-full">
            {loading && (
                <div className={`${className} bg-gray-100 dark:bg-gray-800 animate-pulse min-h-[200px]`} />
            )}
            <canvas
                ref={canvasRef}
                className={`${className} ${loading ? 'hidden' : 'block'}`}
                style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: dimensions.width && dimensions.height
                        ? `${dimensions.width} / ${dimensions.height}`
                        : 'auto'
                }}
                {...props}
            />
        </div>
    );
}

export default CanvasImage;
