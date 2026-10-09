export default function TogoFlag({ size = 20, className = '' }: { size?: number; className?: string }) {
  const height = Math.round(size * 0.62);
  return (
    <svg width={size} height={height} viewBox="0 0 500 310" className={className} style={{ borderRadius: '3px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}>
      <rect width="500" height="310" fill="#FFCE00" />
      <rect width="500" height="62" y="0" fill="#006A4E" />
      <rect width="500" height="62" y="124" fill="#006A4E" />
      <rect width="500" height="62" y="248" fill="#006A4E" />
      <rect width="186" height="186" fill="#D21034" />
      <polygon points="93,20 115,87 181,87 127,126 148,193 93,153 38,193 59,126 5,87 71,87" fill="#FFFFFF" />
    </svg>
  );
}
