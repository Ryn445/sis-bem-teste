-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', ''),
    new.email
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar tabela de itens
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT,
  unidade_medida TEXT NOT NULL,
  estoque_minimo INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para items (todos usuários autenticados podem ver)
CREATE POLICY "Usuários autenticados podem ver itens"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar itens"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens"
  ON public.items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar itens"
  ON public.items FOR DELETE
  TO authenticated
  USING (true);

-- Criar tabela de estoque
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id)
);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para estoque
CREATE POLICY "Usuários autenticados podem ver estoque"
  ON public.estoque FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar estoque"
  ON public.estoque FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar estoque"
  ON public.estoque FOR UPDATE
  TO authenticated
  USING (true);

-- Criar tabela de entradas
CREATE TABLE public.entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para entradas
CREATE POLICY "Usuários autenticados podem ver entradas"
  ON public.entradas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar entradas"
  ON public.entradas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Criar tabela de saídas
CREATE TABLE public.saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL,
  data_saida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  destino TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  beneficiario TEXT,
  campanha TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para saídas
CREATE POLICY "Usuários autenticados podem ver saídas"
  ON public.saidas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar saídas"
  ON public.saidas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Trigger para atualizar estoque após entrada
CREATE OR REPLACE FUNCTION public.handle_entrada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Criar registro de estoque se não existir
  INSERT INTO public.estoque (item_id, quantidade_atual)
  VALUES (NEW.item_id, NEW.quantidade)
  ON CONFLICT (item_id)
  DO UPDATE SET 
    quantidade_atual = estoque.quantidade_atual + NEW.quantidade,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_entrada_created
  AFTER INSERT ON public.entradas
  FOR EACH ROW EXECUTE FUNCTION public.handle_entrada();

-- Trigger para atualizar estoque após saída
CREATE OR REPLACE FUNCTION public.handle_saida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Atualizar quantidade no estoque
  UPDATE public.estoque
  SET 
    quantidade_atual = quantidade_atual - NEW.quantidade,
    updated_at = NOW()
  WHERE item_id = NEW.item_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_saida_created
  AFTER INSERT ON public.saidas
  FOR EACH ROW EXECUTE FUNCTION public.handle_saida();