import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Item {
  id: string;
  nome: string;
}

interface Entrada {
  id: string;
  quantidade: number;
  data_entrada: string;
  observacao: string | null;
  items: { nome: string };
  profiles: { nome: string };
}

const Entradas = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    item_id: "",
    quantidade: 1,
    data_entrada: new Date().toISOString().split("T")[0],
    observacao: "",
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
  };

  const fetchData = async () => {
    setLoading(true);

    const { data: itemsData } = await supabase.from("items").select("id, nome").order("nome");
    if (itemsData) setItems(itemsData);

    const { data: entradasData } = await supabase
      .from("entradas")
      .select("*, items(nome), profiles(nome)")
      .order("data_entrada", { ascending: false });

    if (entradasData) setEntradas(entradasData as any);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("entradas").insert({
      ...formData,
      usuario_id: userId,
      quantidade: parseInt(formData.quantidade.toString()),
    });

    if (error) {
      toast.error("Erro ao registrar entrada");
      return;
    }

    toast.success("Entrada registrada com sucesso!");
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({
      item_id: "",
      quantidade: 1,
      data_entrada: new Date().toISOString().split("T")[0],
      observacao: "",
    });
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
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Entradas</h1>
            <p className="text-muted-foreground">Registre as entradas de produtos no estoque</p>
          </div>

          {/* Botão Nova Entrada */}
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Entrada</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="item_id">Item *</Label>
                  <Select
                    value={formData.item_id}
                    onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data_entrada">Data da Entrada *</Label>
                  <Input
                    id="data_entrada"
                    type="date"
                    value={formData.data_entrada}
                    onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Informações adicionais (opcional)"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Registrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabela de Entradas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((entrada) => (
                  <TableRow key={entrada.id}>
                    <TableCell>
                      {new Date(entrada.data_entrada).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">{entrada.items?.nome}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      +{entrada.quantidade}
                    </TableCell>
                    <TableCell>{entrada.profiles?.nome}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entrada.observacao || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {entradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma entrada registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Entradas;
