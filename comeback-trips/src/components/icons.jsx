// Kleine set inline SVG-iconen (stroke-stijl), zodat er geen icon-library nodig is.
function Icoon({ children, className = 'h-5 w-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const LogoIcoon = (props) => (
  <Icoon {...props}>
    <path d="M5 15.5a7.5 7.5 0 1 1 7.5 5" />
    <path d="M5 11v4.8h4.8" />
  </Icoon>
);

export const SchildIcoon = (props) => (
  <Icoon {...props}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icoon>
);

export const PrijsIcoon = (props) => (
  <Icoon {...props}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </Icoon>
);

export const HartIcoon = (props) => (
  <Icoon {...props}>
    <path d="M19.5 12.6 12 20l-7.5-7.4A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 7.5 6.2Z" />
  </Icoon>
);

export const WaarschuwingIcoon = (props) => (
  <Icoon {...props}>
    <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icoon>
);

export const InfoIcoon = (props) => (
  <Icoon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Icoon>
);

export const ExternIcoon = (props) => (
  <Icoon {...props}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icoon>
);

export const ZoekIcoon = (props) => (
  <Icoon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.4-4.4" />
  </Icoon>
);

export const KompasIcoon = (props) => (
  <Icoon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </Icoon>
);

export const TrendOmhoogIcoon = (props) => (
  <Icoon {...props}>
    <path d="m4 16 6-6 4 4 6-6" />
    <path d="M15 8h5v5" />
  </Icoon>
);

export const TrendVlakIcoon = (props) => (
  <Icoon {...props}>
    <path d="M4 12h15" />
    <path d="m15 8 4 4-4 4" />
  </Icoon>
);

export const TrendOmlaagIcoon = (props) => (
  <Icoon {...props}>
    <path d="m4 8 6 6 4-4 6 6" />
    <path d="M15 16h5v-5" />
  </Icoon>
);

export const KalenderIcoon = (props) => (
  <Icoon {...props}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icoon>
);

export const VliegtuigIcoon = (props) => (
  <Icoon {...props}>
    <path d="M10.5 13.5 4 12l-1 1 5 3 3 5 1-1-1.5-6.5L15 10l4.5-4.5a1.5 1.5 0 0 0-2.1-2.1L13 8l-3.5 3.5Z" />
  </Icoon>
);

export const SpaarIcoon = (props) => (
  <Icoon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 9.2A3 3 0 0 0 9.5 11v2a3 3 0 0 0 5 1.8" />
    <path d="M8 11h4.5M8 13h4.5" />
  </Icoon>
);
