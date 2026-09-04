import Image from "next/image";

export function QuireWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/brand/quire-wordmark-dark.png"
        alt="Quire"
        width={140}
        height={40}
        className="quire-brand-light block object-contain"
        priority
      />
      <Image
        src="/brand/quire-wordmark-light.png"
        alt="Quire"
        width={140}
        height={40}
        className="quire-brand-dark hidden object-contain"
        priority
      />
    </div>
  );
}

export function QuireMark({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/brand/quire-mark-dark.png"
        alt="Quire"
        width={32}
        height={32}
        className="quire-brand-light block object-contain"
        priority
      />
      <Image
        src="/brand/quire-mark-light.png"
        alt="Quire"
        width={32}
        height={32}
        className="quire-brand-dark hidden object-contain"
        priority
      />
    </div>
  );
}
