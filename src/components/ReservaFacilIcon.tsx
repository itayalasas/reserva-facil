interface ReservaFacilIconProps {
  className?: string;
  size?: number;
}

export const ReservaFacilIcon = ({ className = "", size = 32 }: ReservaFacilIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>

      <rect
        x="15"
        y="25"
        width="70"
        height="65"
        rx="8"
        fill="url(#gradient1)"
      />

      <rect
        x="15"
        y="25"
        width="70"
        height="20"
        rx="8"
        fill="url(#gradient2)"
      />

      <rect
        x="30"
        y="15"
        width="6"
        height="15"
        rx="3"
        fill="#1e40af"
      />
      <rect
        x="64"
        y="15"
        width="6"
        height="15"
        rx="3"
        fill="#1e40af"
      />

      <line
        x1="25"
        y1="45"
        x2="75"
        y2="45"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <circle cx="32" cy="57" r="3.5" fill="white" opacity="0.8" />
      <circle cx="45" cy="57" r="3.5" fill="white" opacity="0.8" />
      <circle cx="58" cy="57" r="3.5" fill="white" opacity="0.8" />
      <circle cx="71" cy="57" r="3.5" fill="white" opacity="0.8" />

      <circle cx="32" cy="70" r="3.5" fill="white" opacity="0.8" />
      <circle cx="45" cy="70" r="3.5" fill="white" opacity="0.8" />
      <circle cx="58" cy="70" r="3.5" fill="white" opacity="0.8" />
      <circle cx="71" cy="70" r="3.5" fill="white" opacity="0.8" />

      <circle cx="32" cy="83" r="3.5" fill="white" opacity="0.8" />
      <circle cx="45" cy="83" r="3.5" fill="white" opacity="0.8" />

      <path
        d="M 55 78 L 60 83 L 73 70"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <circle cx="66" cy="76" r="13" fill="white" opacity="0.95" />
      <path
        d="M 55 78 L 60 83 L 73 70"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
