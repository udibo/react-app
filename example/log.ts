import * as log from "@std/log";
import { isDevelopment, isServer, logFormatter } from "@udibo/react-app";

const level = isDevelopment() ? "DEBUG" : "INFO";
log.setup({
  handlers: {
    default: new log.ConsoleHandler(level, {
      formatter: logFormatter,
      useColors: isServer(),
    }),
  },
  loggers: { "react-app": { level, handlers: ["default"] } },
});
