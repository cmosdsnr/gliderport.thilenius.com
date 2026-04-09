import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "contexts": path.resolve(__dirname, "src/contexts"),
            "components": path.resolve(__dirname, "src/components"),
            "modals": path.resolve(__dirname, "src/modals"),
            "images": path.resolve(__dirname, "src/images"),
            "hooks": path.resolve(__dirname, "src/hooks"),
            "css": path.resolve(__dirname, "src/css"),
            // Map the CSS import to the actual file path
            'react-datepicker/dist/react-datepicker.css': path.resolve(__dirname, 'node_modules/react-datepicker/dist/react-datepicker.css')
        }
    }
})

