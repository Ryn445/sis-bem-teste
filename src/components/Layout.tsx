import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, LayoutDashboard, Box, ArrowDownToLine, ArrowUpFromLine, History, LogOut } from "lucide-react";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserName(profile.nome);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/itens", icon: Box, label: "Itens" },
    { path: "/entradas", icon: ArrowDownToLine, label: "Entradas" },
    { path: "/saidas", icon: ArrowUpFromLine, label: "Saídas" },
    { path: "/historico", icon: History, label: "Histórico" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Sis do Bem</span>
            </Link>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                {userName && (
                  <span className="text-sm text-muted-foreground">
                    Olá, <span className="font-medium text-foreground">{userName}</span>
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
          <div className="flex md:hidden gap-1 mt-4 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;
