import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Item {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  unidade_medida: string;
  estoque_minimo: number;
  estoque?: Array<{ quantidade_atual: number }>;
}

const Itens = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    descricao: "",
    unidade_medida: "",
    estoque_minimo: 5,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unidade_medida.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*, estoque(quantidade_atual)")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar itens");
      return;
    }

    setItems(data as any);
    setFilteredItems(data as any);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const { error } = await supabase
        .from("items")
        .update(formData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar item");
        return;
      }

      toast.success("Item atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("items").insert(formData);

      if (error) {
        toast.error("Erro ao criar item");
        return;
      }

      toast.success("Item criado com sucesso!");
    }

    setDialogOpen(false);
    resetForm();
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir item");
      return;
    }

    toast.success("Item excluído com sucesso!");
    fetchItems();
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      categoria: item.categoria,
      descricao: item.descricao || "",
      unidade_medida: item.unidade_medida,
      estoque_minimo: item.estoque_minimo,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      nome: "",
      categoria: "",
      descricao: "",
      unidade_medida: "",
      estoque_minimo: 5,
    });
  };

  const getQuantidadeAtual = (item: Item) => {
    return item.estoque && item.estoque.length > 0 ? item.estoque[0].quantidade_atual : 0;
  };

  const isEstoqueBaixo = (item: Item) => {
    const qtd = getQuantidadeAtual(item);
    return qtd <= item.estoque_minimo;
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Itens do Estoque</h1>
            <p className="text-muted-foreground">Gerencie os itens disponíveis</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="unidade_medida">Unidade de Medida *</Label>
                  <Input
                    id="unidade_medida"
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                    placeholder="Ex: kg, unidades, litros"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                  <Input
                    id="estoque_minimo"
                    type="number"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingItem ? "Atualizar" : "Criar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria ou unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Quantidade Atual</TableHead>
                  <TableHead>Estoque Mínimo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.unidade_medida}</TableCell>
                    <TableCell>
                      <Badge variant={isEstoqueBaixo(item) ? "destructive" : "default"}>
                        {getQuantidadeAtual(item)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.estoque_minimo}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum item encontrado
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

export default Itens;
