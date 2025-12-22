import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { NotificationProvider } from "./components/NotificationContext.tsx";

createRoot(document.getElementById("root")!).render(
<NotificationProvider>
<App />
</NotificationProvider>


);
