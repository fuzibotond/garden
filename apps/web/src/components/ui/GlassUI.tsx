import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react"
import * as Switch from "@radix-ui/react-switch"

type CardVariant = "default" | "elevated" | "outlined" | "glow" | "glow-violet" | "glow-pink"
type CardPadding = "none" | "sm" | "md" | "lg" | "xl"

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  padding?: CardPadding
}

const cardVariantClass: Record<CardVariant, string> = {
  default: "glass-ui-card--default",
  elevated: "glass-ui-card--elevated",
  outlined: "glass-ui-card--outlined",
  glow: "glass-ui-card--glow",
  "glow-violet": "glass-ui-card--glow-violet",
  "glow-pink": "glass-ui-card--glow-pink",
}

const cardPaddingClass: Record<CardPadding, string> = {
  none: "glass-ui-card--p-none",
  sm: "glass-ui-card--p-sm",
  md: "glass-ui-card--p-md",
  lg: "glass-ui-card--p-lg",
  xl: "glass-ui-card--p-xl",
}

export function GlassCard({
  className = "",
  variant = "default",
  padding = "md",
  ...props
}: GlassCardProps) {
  const classes = [
    "glass-ui-card",
    cardVariantClass[variant],
    cardPaddingClass[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return <div className={classes} {...props} />
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl"

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "glass-ui-btn--primary",
  secondary: "glass-ui-btn--secondary",
  ghost: "glass-ui-btn--ghost",
  danger: "glass-ui-btn--danger",
}

const buttonSizeClass: Record<ButtonSize, string> = {
  xs: "glass-ui-btn--xs",
  sm: "glass-ui-btn--sm",
  md: "glass-ui-btn--md",
  lg: "glass-ui-btn--lg",
  xl: "glass-ui-btn--xl",
}

export function GlassButton({
  className = "",
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  disabled,
  children,
  ...props
}: GlassButtonProps) {
  const isDisabled = disabled || loading
  const classes = [
    "glass-ui-btn",
    buttonVariantClass[variant],
    buttonSizeClass[size],
    fullWidth ? "glass-ui-btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {children}
    </button>
  )
}

type InputSize = "sm" | "md" | "lg"

type GlassInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  containerClassName?: string
  inputSize?: InputSize
}

export function GlassInput({
  label,
  helperText,
  error,
  fullWidth,
  containerClassName = "",
  inputSize = "md",
  className = "",
  ...props
}: GlassInputProps) {
  const containerClasses = [
    "glass-ui-input-wrap",
    fullWidth ? "glass-ui-input-wrap--full" : "",
    containerClassName,
  ]
    .filter(Boolean)
    .join(" ")

  const inputClasses = [
    "glass-ui-input",
    `glass-ui-input--${inputSize}`,
    error ? "glass-ui-input--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClasses}>
      {label && <label className="glass-ui-input__label">{label}</label>}
      <input className={inputClasses} {...props} />
      {error && <p className="glass-ui-input__error">{error}</p>}
      {!error && helperText && <p className="glass-ui-input__help">{helperText}</p>}
    </div>
  )
}

type GlassSwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function GlassSwitch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
}: GlassSwitchProps) {
  return (
    <label className="glass-ui-switch-wrap">
      {label ? <span className="glass-ui-switch-label">{label}</span> : null}
      <Switch.Root
        className="glass-ui-switch"
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      >
        <Switch.Thumb className="glass-ui-switch-thumb" />
      </Switch.Root>
    </label>
  )
}
