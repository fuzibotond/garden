import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react"
import type { ComponentPropsWithoutRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import * as Select from "@radix-ui/react-select"
import * as Switch from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"

type CardVariant = "default" | "elevated" | "outlined" | "glow" | "glow-violet" | "glow-pink"
type CardPadding = "none" | "sm" | "md" | "lg" | "xl"

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  padding?: CardPadding
}

const cardStyles = cva(
  "rounded-[24px] border backdrop-blur-xl transition-shadow",
  {
    variants: {
      variant: {
        default: "border-white/15 bg-white/8 shadow-[0_14px_40px_rgba(0,0,0,0.45)]",
        elevated: "border-emerald-200/30 bg-emerald-950/55 shadow-[0_14px_38px_rgba(0,0,0,0.58)]",
        outlined: "border-emerald-200/35 bg-emerald-950/40 shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
        glow: "border-emerald-200/35 bg-emerald-950/50 shadow-[0_0_0_1px_rgba(190,255,171,0.15),0_16px_42px_rgba(0,0,0,0.6),0_0_28px_rgba(134,239,172,0.22)]",
        "glow-violet": "border-emerald-300/30 bg-emerald-950/50 shadow-[0_0_0_1px_rgba(190,255,171,0.15),0_16px_42px_rgba(0,0,0,0.6),0_0_28px_rgba(74,222,128,0.22)]",
        "glow-pink": "border-lime-300/35 bg-emerald-950/50 shadow-[0_0_0_1px_rgba(190,255,171,0.15),0_16px_42px_rgba(0,0,0,0.6),0_0_28px_rgba(163,230,53,0.24)]",
      },
      padding: {
        none: "p-0",
        sm: "p-3.5",
        md: "p-[18px]",
        lg: "p-6",
        xl: "p-7",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  },
)

export function GlassCard({
  className,
  variant = "default",
  padding = "md",
  ...props
}: GlassCardProps) {
  return <div className={cn(cardStyles({ variant, padding }), className)} {...props} />
}

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition-all disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "border-none bg-gradient-to-br from-lime-200 via-lime-300 to-emerald-400 text-emerald-950 shadow-[0_10px_24px_rgba(110,231,183,0.28)] hover:brightness-105",
        secondary: "border border-emerald-200/35 bg-emerald-950/75 text-emerald-50 hover:border-emerald-200/50",
        ghost: "border border-emerald-200/20 bg-white/5 text-emerald-50 hover:border-emerald-200/35 hover:bg-white/10",
        danger: "border border-red-300/50 bg-red-900/45 text-red-100 hover:bg-red-900/60",
      },
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        xl: "h-12 px-6 text-base",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
)

type GlassButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> &
  VariantProps<typeof buttonStyles> & {
  loading?: boolean
}

export function GlassButton({
  className,
  variant = "primary",
  size = "md",
  loading,
  fullWidth = false,
  disabled,
  children,
  ...props
}: GlassButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button className={cn(buttonStyles({ variant, size, fullWidth }), className)} disabled={isDisabled} {...props}>
      {children}
    </button>
  )
}

type InputSize = "sm" | "md" | "lg"

const inputSizeClass: Record<InputSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-10 px-3.5 text-sm",
  lg: "h-11 px-4 text-[15px]",
}

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
  containerClassName,
  inputSize = "md",
  className,
  ...props
}: GlassInputProps) {
  const labelText = label?.trim().length ? label : undefined

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
      {labelText && <label className="text-[13px] text-emerald-50/90">{labelText}</label>}
      <input
        className={cn(
          "w-full rounded-full border bg-emerald-950/85 text-emerald-50 outline-none transition-colors placeholder:text-emerald-100/55 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-400/20",
          "border-emerald-200/35",
          inputSizeClass[inputSize],
          error && "border-red-300/70 focus:border-red-300/75 focus:ring-red-400/25",
          className,
        )}
        {...props}
      />
      {error && <p className="m-0 text-xs text-red-200">{error}</p>}
      {!error && helperText && <p className="m-0 text-xs text-emerald-100/70">{helperText}</p>}
    </div>
  )
}

type GlassSelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  id?: string
  className?: string
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  containerClassName?: string
  children?: ReactNode
}

type GlassSelectTriggerProps = ComponentPropsWithoutRef<typeof Select.Trigger> & {
  className?: string
  children?: ReactNode
}

type GlassSelectValueProps = ComponentPropsWithoutRef<typeof Select.Value> & {
  placeholder?: string
}

type GlassSelectContentProps = ComponentPropsWithoutRef<typeof Select.Content> & {
  children?: ReactNode
}

type GlassSelectItemProps = ComponentPropsWithoutRef<typeof Select.Item> & {
  value: string
  children?: ReactNode
}

export function GlassSelectTrigger({ className = "", children, ...props }: GlassSelectTriggerProps) {
  return (
    <Select.Trigger
      className={cn(
        "inline-flex h-10 w-full items-center justify-between rounded-full border border-emerald-200/35",
        "bg-emerald-950/90 px-3.5 text-left text-sm text-emerald-50 outline-none transition-colors",
        "focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-400/20 data-[placeholder]:text-emerald-100/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
      <Select.Icon>
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-emerald-50/90"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </Select.Icon>
    </Select.Trigger>
  )
}

export function GlassSelectValue({ className = "", ...props }: GlassSelectValueProps) {
  return <Select.Value className={className} {...props} />
}

export function GlassSelectContent({ className = "", children, ...props }: GlassSelectContentProps) {
  return (
    <Select.Portal>
      <Select.Content
        className={cn(
          "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[18px] border border-emerald-200/35",
          "bg-emerald-950/95 shadow-[0_16px_46px_rgba(0,0,0,0.58)] backdrop-blur-xl",
          className,
        )}
        position="popper"
        sideOffset={8}
        {...props}
      >
        <Select.Viewport className="p-1.5">{children}</Select.Viewport>
      </Select.Content>
    </Select.Portal>
  )
}

export function GlassSelectItem({ className = "", children, ...props }: GlassSelectItemProps) {
  return (
    <Select.Item
      className={cn(
        "relative cursor-default select-none rounded-xl py-2.5 pl-3 pr-8 text-sm text-emerald-50 outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-emerald-300/20",
        className,
      )}
      {...props}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-200">✓</Select.ItemIndicator>
    </Select.Item>
  )
}

export function GlassSelect({
  value,
  defaultValue,
  onValueChange,
  name,
  required,
  disabled,
  id,
  label,
  helperText,
  error,
  fullWidth,
  containerClassName,
  className,
  children,
}: GlassSelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
      {label && <label className="text-[13px] text-emerald-50/90">{label}</label>}
      <Select.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <div
          className={cn(
            "w-full",
            className,
          )}
          id={id}
        >
          {children}
        </div>
      </Select.Root>
      {error && <p className="m-0 text-xs text-red-200">{error}</p>}
      {!error && helperText && <p className="m-0 text-xs text-emerald-100/70">{helperText}</p>}
    </div>
  )
}

type GlassSwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

export function GlassSwitch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  className,
  style,
}: GlassSwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-2", className)} style={style}>
      {label ? <span className="text-[13px] text-emerald-100/80">{label}</span> : null}
      <Switch.Root
        className={cn(
          "relative h-[30px] w-[52px] rounded-full border border-emerald-200/35 bg-emerald-950/90",
          "transition-colors data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-lime-400 data-[state=checked]:to-emerald-400",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      >
        <Switch.Thumb
          className={cn(
            "block h-6 w-6 translate-x-[2px] rounded-full bg-slate-50 shadow-[0_3px_10px_rgba(0,0,0,0.45)] transition-transform",
            "data-[state=checked]:translate-x-[26px]",
          )}
        />
      </Switch.Root>
    </label>
  )
}
