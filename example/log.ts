import * as log from "@std/log";
import { isDevelopment, logFormatter } from "@udibo/react-app";

const level = isDevelopment() ? "DEBUG" : "INFO";
log.setup({
  handlers: {
    default: new log.ConsoleHandler(level, {
      formatter: logFormatter,
    }),
  },
  loggers: {
    "react-app": { level, handlers: ["default"] },
  },
});
