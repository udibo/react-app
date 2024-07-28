import * as log from "@std/log";

log.setup({
  loggers: {
    "react-app": {
      level: "INFO",
      handlers: ["default"],
    },
  },
});
