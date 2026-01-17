import { useState, useRef, useEffect } from 'react';

// Tiny placeholder (1x1 gray pixel as base64 data URI)
const BLUR_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"%3E%3Crect fill="%23374151" width="3" height="4"/%3E%3C/svg%3E';

/**
 * LazyImage component with:
 * - Native lazy loading
 * - Smooth fade-in animation when loaded
 * - Error fallback
 */
export default function LazyImage({
    src,
    alt,
    className = '',
    fallback = BLUR_PLACEHOLDER,
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setError(true);
        setIsLoaded(true);
    };

    const displaySrc = error ? fallback : src;

    return (
        <div className={`relative overflow-hidden bg-gray-200 dark:bg-dark-tertiary ${className}`}>
            <img
                src={displaySrc}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                className={`w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                {...props}
            />
        </div>
    );
}

/**
 * Simple lazy image without placeholder animation
 * Just uses native loading="lazy" with intersection observer preload
 */
export function SimpleLazyImage({ src, alt, className = '', fallback, ...props }) {
    const [error, setError] = useState(false);

    return (
        <img
            src={error ? (fallback || BLUR_PLACEHOLDER) : src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setError(true)}
            className={className}
            {...props}
        />
    );
}
