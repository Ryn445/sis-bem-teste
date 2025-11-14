import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Item {
  id: string;
  nome: string;
}

interface Saida {
  id: string;
  quantidade: number;
  data_saida: string;
  destino: string;
  beneficiario: string | null;
  campanha: string | null;
  observacao: string | null;
  items: { nome: string };
  profiles: { nome: string };
}

const Saidas = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    item_id: "",
    quantidade: 1,
    data_saida: new Date().toISOString().split("T")[0],
    destino: "",
    beneficiario: "",
    campanha: "",
    observacao: "",
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
  };

  const fetchData = async () => {
    setLoading(true);

    const { data: itemsData } = await supabase
      .from("items")
      .select("id, nome")
      .order("nome");
    if (itemsData) setItems(itemsData);

    const { data: saidasData } = await supabase
      .from("saidas")
      .select("*, items(nome), profiles(nome)")
      .order("data_saida", { ascending: false });

    if (saidasData) setSaidas(saidasData as any);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se há estoque suficiente
    const { data: estoqueData, error: estoqueError } = await supabase
      .from("estoque")
      .select("quantidade_atual")
      .eq("item_id", formData.item_id)
      .single();

    if (estoqueError || !estoqueData) {
      toast.error("Erro ao verificar estoque ou item não encontrado!");
      return;
    }

    if (estoqueData.quantidade_atual < formData.quantidade) {
      toast.error("Estoque insuficiente para esta saída!");
      return;
    }

    const { error } = await supabase.from("saidas").insert({
      ...formData,
      usuario_id: userId,
      quantidade: parseInt(formData.quantidade.toString()),
      beneficiario: formData.beneficiario || null,
      campanha: formData.campanha || null,
      observacao: formData.observacao || null,
    });

    if (error) {
      toast.error("Erro ao registrar saída!");
      return;
    }

    toast.success("Saída registrada com sucesso!");
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({
      item_id: "",
      quantidade: 1,
      data_saida: new Date().toISOString().split("T")[0],
      destino: "",
      beneficiario: "",
      campanha: "",
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
            <h1 className="text-3xl font-bold">Saídas</h1>
            <p className="text-muted-foreground">
              Registre as saídas de produtos do estoque
            </p>
          </div>

          {/* Botão Nova Saída */}
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
                Nova Saída
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Saída</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="item_id">Item *</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, item_id: value })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantidade: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_saida">Data da Saída *</Label>
                    <Input
                      id="data_saida"
                      type="date"
                      value={formData.data_saida}
                      onChange={(e) =>
                        setFormData({ ...formData, data_saida: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="destino">Destino *</Label>
                    <Input
                      id="destino"
                      value={formData.destino}
                      onChange={(e) =>
                        setFormData({ ...formData, destino: e.target.value })
                      }
                      placeholder="Para onde está indo"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="beneficiario">Beneficiário</Label>
                    <Input
                      id="beneficiario"
                      value={formData.beneficiario}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          beneficiario: e.target.value,
                        })
                      }
                      placeholder="Nome do beneficiário (opcional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="campanha">Campanha</Label>
                    <Input
                      id="campanha"
                      value={formData.campanha}
                      onChange={(e) =>
                        setFormData({ ...formData, campanha: e.target.value })
                      }
                      placeholder="Nome da campanha (opcional)"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="observacao">Observação</Label>
                    <Textarea
                      id="observacao"
                      value={formData.observacao}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          observacao: e.target.value,
                        })
                      }
                      placeholder="Informações adicionais (opcional)"
                    />
                  </div>
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

        {/* Tabela de Saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saidas.map((saida) => (
                    <TableRow key={saida.id}>
                      <TableCell>
                        {new Date(saida.data_saida).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {saida.items?.nome}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        -{saida.quantidade}
                      </TableCell>
                      <TableCell>{saida.destino}</TableCell>
                      <TableCell>{saida.beneficiario || "-"}</TableCell>
                      <TableCell>{saida.campanha || "-"}</TableCell>
                      <TableCell>{saida.profiles?.nome}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {saida.observacao || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {saidas.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhuma saída registrada
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

export default Saidas;
