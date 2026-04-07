
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const SplashScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    <div style={{ textAlign: 'center' }}>
      <img
        src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg"
        alt="ЛинэяСкул"
        style={{ width: 80, height: 80, margin: '0 auto 20px', borderRadius: 20, objectFit: 'cover', animation: 'pulse-logo 1.8s ease-in-out infinite' }}
      />
      <div style={{ fontSize: 22, fontWeight: 700, color: '#3BA662', letterSpacing: '-0.3px' }}>ЛинэяСкул</div>
      <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>загружаем мессенджер</div>
      <div style={{ marginTop: 20, width: 160, height: 3, background: '#e8f5e9', borderRadius: 2, overflow: 'hidden', marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ height: '100%', background: '#3BA662', borderRadius: 2, animation: 'progress 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
