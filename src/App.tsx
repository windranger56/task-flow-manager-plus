import { supabase } from "@/supabase/client";
import { Navigate } from "react-router-dom";
import Auth from "@/pages/Auth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import { useState } from "react";
import AdminPanel from "./pages/AdminPanel";
import UserForm from "./pages/UserForm";
import RegisterPage from "./pages/RegisterPage";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const badge = document.getElementById('lovable-badge');
    if(badge) badge.style.display = "none";

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Измененные стили для адаптивности */}
        <div className="flex-1 px-4 sm:px-6 md:px-10 w-full max-w-screen">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={
                session ? <Navigate to="/" replace /> : <Auth />
              }
            />
            <Route
              path="/"
              element={
                session ? (
                  <AuthenticatedLayout>
                    <Index />
                  </AuthenticatedLayout>
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/admin"
              element={<AdminPanel session={session} />}
            />
            <Route
              path="/register"
              element={<RegisterPage session={session} />}
            />
            <Route
              path="/admin/users/:id"
              element={<UserForm />}
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;