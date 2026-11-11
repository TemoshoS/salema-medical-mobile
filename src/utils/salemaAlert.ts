import type { AlertButton } from "react-native";

export type SalemaAlertButton = Pick<AlertButton, "text" | "onPress" | "style">;

type Handler = (
  title: string,
  message?: string,
  buttons?: SalemaAlertButton[]
) => void;

let activeHandler: Handler | null = null;

export function registerSalemaAlertHandler(handler: Handler) {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

export const Alert = {
  alert(title: string, message?: string, buttons?: SalemaAlertButton[]) {
    if (activeHandler) {
      activeHandler(title, message, buttons);
    } else {
      console.warn("Salema alert host is not mounted:", title);
    }
  },
};
