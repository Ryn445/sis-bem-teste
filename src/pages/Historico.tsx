import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface Movimentacao {
  id: string;
  tipo: "entrada" | "saida";
  item_nome: string;
  quantidade: number;
  data: string;
  responsavel: string;
  detalhes?: string;
}

const Historico = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo: "todas",
    dataInicio: "",
    dataFim: "",
    item: "",
  });

  useEffect(() => {
    fetchMovimentacoes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, movimentacoes]);

  const fetchMovimentacoes = async () => {
    setLoading(true);

    const { data: entradasData, error: entradasError } = await supabase
      .from("entradas")
      .select("id, quantidade, data_entrada, observacao, items(nome), profiles(nome)")
      .order("data_entrada", { ascending: false });

    const { data: saidasData, error: saidasError } = await supabase
      .from("saidas")
      .select("id, quantidade, data_saida, destino, beneficiario, campanha, items(nome), profiles(nome)")
      .order("data_saida", { ascending: false });

    if (entradasError || saidasError) {
      console.error("Erro ao carregar movimentações:", entradasError || saidasError);
      setLoading(false);
      return;
    }

    const movs: Movimentacao[] = [];

    entradasData?.forEach((e: any) => {
      movs.push({
        id: e.id,
        tipo: "entrada",
        item_nome: e.items?.nome || "Desconhecido",
        quantidade: e.quantidade,
        data: e.data_entrada,
        responsavel: e.profiles?.nome || "N/D",
        detalhes: e.observacao || undefined,
      });
    });

    saidasData?.forEach((s: any) => {
      const detalhes = [
        s.destino && `Destino: ${s.destino}`,
        s.beneficiario && `Beneficiário: ${s.beneficiario}`,
        s.campanha && `Campanha: ${s.campanha}`,
      ]
        .filter(Boolean)
        .join(", ");

      movs.push({
        id: s.id,
        tipo: "saida",
        item_nome: s.items?.nome || "Desconhecido",
        quantidade: s.quantidade,
        data: s.data_saida,
        responsavel: s.profiles?.nome || "N/D",
        detalhes: detalhes || undefined,
      });
    });

    movs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setMovimentacoes(movs);
    setFilteredMovimentacoes(movs);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...movimentacoes];

    if (filters.tipo !== "todas") {
      filtered = filtered.filter((m) => m.tipo === filters.tipo);
    }

    if (filters.dataInicio) {
      filtered = filtered.filter((m) => m.data >= filters.dataInicio);
    }

    if (filters.dataFim) {
      filtered = filtered.filter((m) => m.data <= filters.dataFim);
    }

    if (filters.item) {
      filtered = filtered.filter((m) =>
        m.item_nome.toLowerCase().includes(filters.item.toLowerCase())
      );
    }

    setFilteredMovimentacoes(filtered);
  };

  const getTotais = () => {
    const totalEntradas = filteredMovimentacoes
      .filter((m) => m.tipo === "entrada")
      .reduce((acc, m) => acc + m.quantidade, 0);

    const totalSaidas = filteredMovimentacoes
      .filter((m) => m.tipo === "saida")
      .reduce((acc, m) => acc + m.quantidade, 0);

    return { totalEntradas, totalSaidas };
  };

  const { totalEntradas, totalSaidas } = getTotais();

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
          <h1 className="text-3xl font-bold">Histórico de Movimentações</h1>
          <p className="text-muted-foreground">
            Visualize todas as entradas e saídas do estoque
          </p>
        </div>

        {/* Resumo de totais */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalEntradas}</div>
              <p className="text-xs text-muted-foreground">unidades recebidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalSaidas}</div>
              <p className="text-xs text-muted-foreground">unidades distribuídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Movimentações Filtradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredMovimentacoes.length}</div>
              <p className="text-xs text-muted-foreground">registros encontrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>

              <div>
                <Label>Item</Label>
                <Input
                  placeholder="Buscar por item"
                  value={filters.item}
                  onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de movimentações */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentacoes.length > 0 ? (
                    filteredMovimentacoes.map((mov) => (
                      <TableRow key={`${mov.tipo}-${mov.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {mov.tipo === "entrada" ? (
                              <>
                                <ArrowDownToLine className="w-4 h-4 text-green-600" />
                                <Badge variant="default">Entrada</Badge>
                              </>
                            ) : (
                              <>
                                <ArrowUpFromLine className="w-4 h-4 text-red-600" />
                                <Badge variant="secondary">Saída</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(mov.data).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="font-medium">{mov.item_nome}</TableCell>
                        <TableCell>
                          <span className={mov.tipo === "entrada" ? "text-green-600" : "text-red-600"}>
                            {mov.tipo === "entrada" ? "+" : "-"}
                            {mov.quantidade}
                          </span>
                        </TableCell>
                        <TableCell>{mov.responsavel}</TableCell>
                        <TableCell className="max-w-xs truncate">{mov.detalhes || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Historico;
