import type { Config } from "tailwindcss";
import tailwindcssForms from "@tailwindcss/forms";
import tailwindcssTypography from "@tailwindcss/typography";
import tailwindcssAspectRatio from "@tailwindcss/aspect-ratio";
import tailwindcssContainerQueries from "@tailwindcss/container-queries";

export default {
  content: [
    "{routes,components}/**/*.{ts,tsx,js,jsx}",
  ],
  plugins: [
    tailwindcssForms,
    tailwindcssTypography,
    tailwindcssAspectRatio,
    tailwindcssContainerQueries,
  ],
} satisfies Config;
