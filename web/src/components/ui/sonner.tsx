import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:px-6 group-[.toaster]:py-4 group-[.toaster]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[0.8rem] group-[.toast]:font-normal",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border",
          error: "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/5",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/5",
          info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-500/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
