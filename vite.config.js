import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [tailwindcss()],
	build: {
		rollupOptions: {
			input: {
				main: "index.html", // page principale
				form: "pages/form/index.html", // page Form
				about: "pages/about/index.html", // page About
			},
		},
	},
});
