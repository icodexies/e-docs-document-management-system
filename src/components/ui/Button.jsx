import { Link } from "react-router-dom";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "bg-navy text-white shadow-sm hover:bg-navy-deep",
  secondary:
    "border border-slate-300 bg-surface text-ink hover:border-slate-400 hover:bg-page",
  ghost: "text-slate-600 hover:bg-tint hover:text-ink",
  quiet: "border border-transparent bg-tint text-accent hover:bg-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:text-navy",
  inverse: "bg-white text-navy shadow-sm hover:bg-white/90",
  inverseOutline:
    "border border-white/30 text-white hover:border-white/50 hover:bg-white/10",
};

const SIZES = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
};

export default function Button({
  to,
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...props
}) {
  const classes = `${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${
    SIZES[size] ?? SIZES.md
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
