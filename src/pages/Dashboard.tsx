import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";

interface EstoqueItem {
  id: string;
  quantidade_atual: number;
  items: {
    nome: string;
    categoria: string;
    unidade_medida: string;
    estoque_minimo: number;
  };
}

interface Movimentacao {
  id: string;
  quantidade: number;
  tipo: "entrada" | "saida";
  data: string;
  item_nome: string;
}

const Dashboard = () => {
  const [estoqueItems, setEstoqueItems] = useState<EstoqueItem[]>([]);
  const [stats, setStats] = useState({
    totalItens: 0,
    entradasHoje: 0,
    saidasHoje: 0,
    alertas: 0,
  });
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    // Buscar estoque com alertas
    const { data: estoqueData } = await supabase
      .from("estoque")
      .select("*, items(*)")
      .order("quantidade_atual", { ascending: true });

    if (estoqueData) {
      setEstoqueItems(estoqueData as any);
      const alertas = estoqueData.filter(
        (item: any) => item.quantidade_atual <= item.items.estoque_minimo
      );
      setStats((prev) => ({ ...prev, alertas: alertas.length, totalItens: estoqueData.length }));
    }

    // Buscar entradas de hoje
    const hoje = new Date().toISOString().split("T")[0];
    const { data: entradasData } = await supabase
      .from("entradas")
      .select("quantidade")
      .gte("data_entrada", hoje);

    if (entradasData) {
      const totalEntradas = entradasData.reduce((acc, e) => acc + e.quantidade, 0);
      setStats((prev) => ({ ...prev, entradasHoje: totalEntradas }));
    }

    // Buscar saídas de hoje
    const { data: saidasData } = await supabase
      .from("saidas")
      .select("quantidade")
      .gte("data_saida", hoje);

    if (saidasData) {
      const totalSaidas = saidasData.reduce((acc, s) => acc + s.quantidade, 0);
      setStats((prev) => ({ ...prev, saidasHoje: totalSaidas }));
    }

    // Buscar movimentações recentes
    const { data: entradas } = await supabase
      .from("entradas")
      .select("id, quantidade, data_entrada, items(nome)")
      .order("data_entrada", { ascending: false })
      .limit(3);

    const { data: saidas } = await supabase
      .from("saidas")
      .select("id, quantidade, data_saida, items(nome)")
      .order("data_saida", { ascending: false })
      .limit(3);

    const movimentacoes: Movimentacao[] = [];

    if (entradas) {
      entradas.forEach((e: any) => {
        movimentacoes.push({
          id: e.id,
          quantidade: e.quantidade,
          tipo: "entrada",
          data: e.data_entrada,
          item_nome: e.items.nome,
        });
      });
    }

    if (saidas) {
      saidas.forEach((s: any) => {
        movimentacoes.push({
          id: s.id,
          quantidade: s.quantidade,
          tipo: "saida",
          data: s.data_saida,
          item_nome: s.items.nome,
        });
      });
    }

    movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setMovimentacoesRecentes(movimentacoes.slice(0, 5));

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do estoque</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItens}</div>
              <p className="text-xs text-muted-foreground">itens cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entradas Hoje</CardTitle>
              <ArrowDownToLine className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.entradasHoje}</div>
              <p className="text-xs text-muted-foreground">unidades recebidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saídas Hoje</CardTitle>
              <ArrowUpFromLine className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.saidasHoje}</div>
              <p className="text-xs text-muted-foreground">unidades distribuídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.alertas}</div>
              <p className="text-xs text-muted-foreground">itens com estoque baixo</p>
            </CardContent>
          </Card>
        </div>

        {stats.alertas > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção!</strong> {stats.alertas} {stats.alertas === 1 ? "item está" : "itens estão"} com
              estoque abaixo do mínimo.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Itens com Estoque Baixo</CardTitle>
              <CardDescription>Itens que precisam de reposição</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {estoqueItems
                  .filter((item) => item.quantidade_atual <= item.items.estoque_minimo)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.items.nome}</p>
                        <p className="text-sm text-muted-foreground">{item.items.categoria}</p>
                      </div>
                      <Badge variant="destructive">
                        {item.quantidade_atual} {item.items.unidade_medida}
                      </Badge>
                    </div>
                  ))}
                {estoqueItems.filter((item) => item.quantidade_atual <= item.items.estoque_minimo).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum item com estoque baixo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações Recentes</CardTitle>
              <CardDescription>Últimas entradas e saídas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movimentacoesRecentes.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {mov.tipo === "entrada" ? (
                        <ArrowDownToLine className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">{mov.item_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(mov.data).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mov.tipo === "entrada" ? "default" : "secondary"}>
                      {mov.tipo === "entrada" ? "+" : "-"}
                      {mov.quantidade}
                    </Badge>
                  </div>
                ))}
                {movimentacoesRecentes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma movimentação recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
