import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] active:scale-[0.97] active:transition-none motion-reduce:active:scale-100 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 touch-manipulation select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-sans",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline: "border border-foreground/20 bg-transparent hover:bg-foreground/10 hover:text-foreground hover:border-foreground/40 active:bg-foreground/15 text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
        hero: "bg-primary text-primary-foreground hover:bg-primary/85 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 active:translate-y-0 active:bg-primary/80 shadow-lg hover:shadow-xl active:shadow-md transition-all duration-300 rounded-sm text-base font-semibold uppercase tracking-wider"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };