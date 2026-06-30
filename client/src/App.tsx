import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CookieConsent from "./components/CookieConsent";

// Secondary routes are code-split so they don't ship in the initial bundle.
const Margins = lazy(() => import("./pages/Margins"));
const MerchantProfile = lazy(() => import("./pages/MerchantProfile"));
const CrisisScenarios = lazy(() => import("./pages/CrisisScenarios"));
const Analyst = lazy(() => import("./pages/Analyst"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/margins"} component={Margins} />
        <Route path={"/analyst"} component={Analyst} />
        <Route path={"/profile"} component={MerchantProfile} />
        <Route path={"/scenarios"} component={CrisisScenarios} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark" // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
