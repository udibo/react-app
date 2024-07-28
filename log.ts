import { getLogger as _getLogger } from "@std/log";
import type { Logger } from "@std/log";

/**
 * Gets the standard logger for the Udibo React App framework.
 * @returns The logger instance.
 */
export function getLogger(): Logger {
  return _getLogger("react-app");
}
