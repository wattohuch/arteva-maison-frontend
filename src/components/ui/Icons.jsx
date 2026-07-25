/**
 * ARTÉVA Maison — Icon set
 *
 * One family, one geometry: 24×24 viewBox, 1.5 stroke, round caps/joins.
 * Every icon renders at the same optical weight so nav rows and toolbars
 * align without per-icon nudging. Size is controlled by the `size` prop,
 * colour always inherits from `currentColor`.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

function Svg({ size = 20, children, ...rest }) {
  return (
    <svg width={size} height={size} {...base} {...rest}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></Svg>
);

export const UserIcon = (p) => (
  <Svg {...p}><path d="M19.5 20.5v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.9a4.4 4.4 0 0 0-4.4 4.4v1.6" /><circle cx="12" cy="8" r="3.9" /></Svg>
);

export const HeartIcon = ({ filled = false, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M20.3 5.9a4.6 4.6 0 0 0-6.5 0L12 7.7l-1.8-1.8a4.6 4.6 0 1 0-6.5 6.5l1.8 1.8L12 20.7l6.5-6.5 1.8-1.8a4.6 4.6 0 0 0 0-6.5z" />
  </Svg>
);

export const BagIcon = (p) => (
  <Svg {...p}>
    <path d="M5.2 7.5h13.6l1 12.2a1.3 1.3 0 0 1-1.3 1.4H5.5a1.3 1.3 0 0 1-1.3-1.4z" />
    <path d="M8.7 10.3V6.6a3.3 3.3 0 0 1 6.6 0v3.7" />
  </Svg>
);

export const MenuIcon = (p) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" /></Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Svg>
);

export const ChevronDownIcon = (p) => (
  <Svg {...p}><path d="M6 9.5l6 6 6-6" /></Svg>
);

export const ChevronRightIcon = (p) => (
  <Svg {...p}><path d="M9.5 6l6 6-6 6" /></Svg>
);

export const ChevronLeftIcon = (p) => (
  <Svg {...p}><path d="M14.5 6l-6 6 6 6" /></Svg>
);

export const ArrowRightIcon = (p) => (
  <Svg {...p}><path d="M4 12h15" /><path d="M13.5 6.5L19 12l-5.5 5.5" /></Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 6.8h15" />
    <path d="M9.6 6.8V5.4a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.4" />
    <path d="M17.6 6.8l-.7 12a1.4 1.4 0 0 1-1.4 1.3H8.5a1.4 1.4 0 0 1-1.4-1.3l-.7-12" />
    <path d="M10.4 10.6v5.8" /><path d="M13.6 10.6v5.8" />
  </Svg>
);

export const PlusIcon = (p) => (
  <Svg {...p}><path d="M12 5.5v13" /><path d="M5.5 12h13" /></Svg>
);

export const MinusIcon = (p) => (
  <Svg {...p}><path d="M5.5 12h13" /></Svg>
);

export const GridIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
  </Svg>
);

export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10.2l8-6.2 8 6.2v9a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.2z" />
    <path d="M9.4 20.6v-7.2h5.2v7.2" />
  </Svg>
);

export const TruckIcon = (p) => (
  <Svg {...p}>
    <path d="M2.8 6.4h10.4v9.9H2.8z" /><path d="M13.2 10h3.6l3.4 3.4v2.9h-7z" />
    <circle cx="7" cy="18.4" r="1.9" /><circle cx="17" cy="18.4" r="1.9" />
  </Svg>
);

export const SparkleIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.4l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.4l5.1-1.9z" />
    <path d="M18.4 16.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.2l7 2.6v5.6c0 4.2-2.8 7.9-7 9.4-4.2-1.5-7-5.2-7-9.4V5.8z" />
    <path d="M9.2 12l2 2 3.6-3.9" />
  </Svg>
);

export const SupportIcon = (p) => (
  <Svg {...p}>
    <path d="M4.4 15.4v-3.6a7.6 7.6 0 0 1 15.2 0v3.6" />
    <path d="M19.6 16.2a2.2 2.2 0 0 1-2.2 2.2h-1.1v-4.9h1.1a2.2 2.2 0 0 1 2.2 2.2z" />
    <path d="M4.4 16.2a2.2 2.2 0 0 0 2.2 2.2h1.1v-4.9H6.6a2.2 2.2 0 0 0-2.2 2.2z" />
  </Svg>
);

export const MailIcon = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2" />
    <path d="M3.8 7.2 12 12.8l8.2-5.6" />
  </Svg>
);

export const PhoneIcon = (p) => (
  <Svg {...p}>
    <path d="M8.2 3.8 10 7.4l-1.9 1.9a12.4 12.4 0 0 0 5.6 5.6l1.9-1.9 3.6 1.8v3.3a1.6 1.6 0 0 1-1.8 1.6C10.4 19.1 4.9 13.6 4 6.6a1.6 1.6 0 0 1 1.6-1.8h2.6Z" />
  </Svg>
);

export const ClockIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.4" /><path d="M12 7.4V12l3.1 1.9" /></Svg>
);

export const PackageIcon = (p) => (
  <Svg {...p}>
    <path d="M20.4 8.2 12 3.6 3.6 8.2v7.6L12 20.4l8.4-4.6z" />
    <path d="M3.6 8.2 12 12.8l8.4-4.6M12 12.8v7.6" />
  </Svg>
);

export const CheckCircleIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.6" /><path d="M8.4 12.2l2.5 2.5 4.7-5" /></Svg>
);

export const AlertCircleIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.6" /><path d="M12 7.8v4.8" /><path d="M12 16.1h.01" /></Svg>
);

export const KeyIcon = (p) => (
  <Svg {...p}>
    <circle cx="8.4" cy="8.4" r="4" />
    <path d="M11.4 11.4 20 20M17.2 17.2l1.8-1.8M14.6 14.6l1.8-1.8" />
  </Svg>
);

export const CarIcon = (p) => (
  <Svg {...p}>
    <path d="M4.4 15.4v-2.1l1.9-4.4A2 2 0 0 1 8.1 7.6h7.8a2 2 0 0 1 1.8 1.3l1.9 4.4v2.1" />
    <path d="M3.6 13.3h16.8" />
    <circle cx="7.6" cy="16.6" r="1.7" /><circle cx="16.4" cy="16.6" r="1.7" />
  </Svg>
);

export const ImageIcon = (p) => (
  <Svg {...p}>
    <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2" />
    <circle cx="9" cy="9.6" r="1.8" />
    <path d="M20.4 15.6l-4.2-4.2-9 9" />
  </Svg>
);

export const TagIcon = (p) => (
  <Svg {...p}>
    <path d="M12.6 3.6l7.8 7.8a1.4 1.4 0 0 1 0 2L13 20.8a1.4 1.4 0 0 1-2 0L3.2 13a1.4 1.4 0 0 1-.4-1V5a1.4 1.4 0 0 1 1.4-1.4h7a1.4 1.4 0 0 1 1 .4z" />
    <circle cx="7.8" cy="7.8" r="1" />
  </Svg>
);

export const FolderIcon = (p) => (
  <Svg {...p}>
    <path d="M20.4 19.2H3.6a1.2 1.2 0 0 1-1.2-1.2V6a1.2 1.2 0 0 1 1.2-1.2h5.4l2.4 3h9a1.2 1.2 0 0 1 1.2 1.2v9.6a1.2 1.2 0 0 1-1.2 1.2z" />
  </Svg>
);

export const ChartIcon = (p) => (
  <Svg {...p}>
    <path d="M18 16.8V9.6" /><path d="M14 16.8V4.8" />
    <path d="M10 16.8v-4" /><path d="M6 16.8V12" />
    <path d="M2.4 19.2h19.2" />
  </Svg>
);

export const ReceiptIcon = (p) => (
  <Svg {...p}>
    <path d="M5.4 3h13.2a1.2 1.2 0 0 1 1.2 1.2v16.8l-3-1.8-3 1.8-3-1.8-3 1.8-3-1.8V4.2A1.2 1.2 0 0 1 5.4 3z" />
    <path d="M9 8.4h6" /><path d="M9 12h4" />
  </Svg>
);

export const GlobeIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M3.6 12h16.8" />
    <path d="M12 3.6a13 13 0 0 1 3.3 8.4 13 13 0 0 1-3.3 8.4 13 13 0 0 1-3.3-8.4A13 13 0 0 1 12 3.6z" />
  </Svg>
);

export const TicketIcon = (p) => (
  <Svg {...p}>
    <path d="M3.6 8.4a2.4 2.4 0 0 0 0 4.8v4.8h16.8v-4.8a2.4 2.4 0 0 0 0-4.8V3.6H3.6z" />
    <path d="M10.2 3.6v2.4M10.2 15.6v2.4M10.2 9.6v2.4" />
  </Svg>
);

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2.4 12s3.6-7.2 9.6-7.2 9.6 7.2 9.6 7.2-3.6 7.2-9.6 7.2S2.4 12 2.4 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const EditIcon = (p) => (
  <Svg {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.2 18.8l-4 1 1-4z" />
  </Svg>
);

export const SendIcon = (p) => (
  <Svg {...p}>
    <path d="M21 3L10 14" /><path d="M21 3l-6 18-4-8-8-4z" />
  </Svg>
);

export const SettingsIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.2v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 5 15a1.6 1.6 0 0 0-1.2-.8h-.2a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.2 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .8 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5.8z" />
  </Svg>
);

export default {
  SearchIcon, UserIcon, HeartIcon, BagIcon, MenuIcon, CloseIcon,
  ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, ArrowRightIcon,
  TrashIcon, PlusIcon, MinusIcon, GridIcon, HomeIcon,
  TruckIcon, SparkleIcon, ShieldIcon, SupportIcon,
  MailIcon, PhoneIcon, ClockIcon, PackageIcon,
  CheckCircleIcon, AlertCircleIcon, KeyIcon, CarIcon,
  ImageIcon, TagIcon, FolderIcon, ChartIcon, ReceiptIcon,
  GlobeIcon, TicketIcon, EyeIcon, EditIcon, SendIcon, SettingsIcon,
};
