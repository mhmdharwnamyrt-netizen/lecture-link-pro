import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { installAutoSync } from "./lib/offlineQueue";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
installAutoSync();
