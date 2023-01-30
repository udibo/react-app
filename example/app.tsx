import { hydrate } from "x/udibo_react_app/app.tsx";

import route from "./routes/_main.tsx";
import { AppContext } from "./context.ts";

hydrate({ route, Context: AppContext });
