import { useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LottieProps {
  src: string;            // url to .json or .lottie
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
}

/** Wraps DotLottie with reduced-motion handling and consistent sizing. */
export function Lottie({ src, loop = true, autoplay = true, className, speed = 1 }: LottieProps) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && ref.current) {
      ref.current?.pause?.();
    }
  }, []);
  return (
    <div className={className}>
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        speed={speed}
        dotLottieRefCallback={(api: unknown) => { ref.current = api; }}
      />
    </div>
  );
}
