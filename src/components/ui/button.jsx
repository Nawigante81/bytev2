import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-mono font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary))] hover:bg-primary/90 hover:shadow-[0_0_25px_hsl(var(--primary))]',
        secondary: 'bg-secondary text-secondary-foreground shadow-[0_0_10px_hsl(var(--secondary))] hover:bg-secondary/90 hover:shadow-[0_0_25px_hsl(var(--secondary))]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground shadow-[0_0_10px_hsl(var(--primary))] hover:shadow-[0_0_25px_hsl(var(--primary))]',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        apple: 'bg-black text-white border border-neutral-700 hover:bg-neutral-800 shadow-[0_0_10px_#ffffff40] hover:shadow-[0_0_25px_#ffffff40]',
        google: 'bg-white text-black border border-neutral-300 hover:bg-neutral-200 shadow-[0_0_10px_#4285F4] hover:shadow-[0_0_25px_#4285F4]',
        github: 'bg-[#333] text-white border border-neutral-700 hover:bg-[#444] shadow-[0_0_10px_#ffffff40] hover:shadow-[0_0_25px_#ffffff40]',
      },
      size: {
        default: 'h-12 px-6 py-2',
        sm: 'h-10 rounded-md px-4',
        lg: 'h-14 rounded-md px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }