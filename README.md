# PinSpace Create 

**Cria murais, vision boards e collages — estilo Canva.**

Editor de quadros criativos para montar ideias, guardar visões e partilhar
com o mundo. Escolhe um modelo, arrasta formas, texto e imagens
(drag & drop de ficheiros ou links de imagem) e publica o teu quadro público.

---

##  Como correr

O site é estático (HTML/CSS/JS) e guarda os quadros públicos no **Supabase**.
Precisas só de um servidor de ficheiros estáticos para abrir a página:

```bash
# 1. Entrar na pasta do projeto
cd PinSpace_Create

# 2. Iniciar um servidor estático
python -m http.server 8000
#   ou:  duplo clique em iniciar.bat

# 3. Abrir no navegador
#   http://127.0.0.1:8000
```

> **Ctrl + F5** (recarga forçada) depois de qualquer alteração, para o navegador
> não usar a versão em memória.

Para publicar quadros públicos é preciso configurar o Supabase
(ver `js/supabase-config.js` — são só a URL e a chave anónima + o SQL inicial).

---

##  Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Quadros (murais)** | Cria quadros com tamanho (Celular / PC / 4K / Tablet / Quadrado). Cada quadro tem fundo, texto e formas próprias. |
| **Texto estilo Canva** | Menu de texto com presets prontos (Título, Subtítulo, Texto), escolha de fonte, tamanho (A− / A+), negrito, itálico, sublinhado, alinhamento, auto-ajuste, opacidade e rotação. |
| **Formas arrastáveis** | Painel "Formas" no menu esquerdo — arrasta uma forma com o rato até ao quadro para a adicionares onde quiseres (ou clica para colocar no centro). |
| **Ferramentas** | Menu "Ferramentas" no menu esquerdo — mostra os atalhos **Pincel** e **Formas**; ao clicares abre o menu de cada ferramenta. |
| **Autocolantes e molduras** | Menu "Autocolantes" no menu esquerdo — galeria de autocolantes e molduras pré-definidas para decorar o quadro. |
| **Imagens por drag & drop** | Arrasta ficheiros de imagem ou **links de imagem** até à tela — o sistema puxa e trata a imagem automaticamente. |
| **Mover e editar texto** | Arrasta os títulos/textos com o rato para os posicionar; duplo clique para editar o conteúdo. |
| **Histórico / Undo** | Desfazer e refazer cada acção de edição. |
| **Exportar** | Exporta o quadro em formato selecionado (imagem/PDF) e abre uma pré-visualização. |
| **Quadros públicos** | Publica um quadro para a lista pública; qualquer visitante pode abrir o quadro publicado. |
| **Moderação e termos** | Nomes de autor com linguagem ofensiva ou links são bloqueados. Antes de publicar é obrigatório aceitar os termos de direitos de imagem. |
| **Persistência local** | Guarda os teus quadros e projetos no navegador (localStorage). |

---

##  Regras de publicação (quadros públicos)

Antes de publicar, o autor tem de aceitar os termos e condições, confirmando que:

- É o autor das imagens ou tem autorização/licença dos respetivos titulares de direitos.
- É o único responsável pelo conteúdo que publica.
- Não usa nomes ofensivos nem publica conteúdo de ódio, violento, sexual ou que viole direitos de terceiros.
- Conteúdo que infrinja direitos de autor ou de imagem pode ser removido sem aviso, assumindo o autor total responsabilidade por reclamações.

O filtro de nomes (`js/moderation.js`) corre no cliente e explica o motivo ao
utilizador quando um nome é rejeitado. É um auxiliar automático — nomes
camuflados podem escapar, por isso a remoção manual continua a ser possível.

---

##  Estrutura do projeto

```
PinSpace_Create/
├── index.html            A página do site (home + editor)
├── iniciar.bat           Atalho para correr um servidor estático
├── css/
│   ├── board.css         Quadro / tela de edição
│   ├── responsive.css    Adaptações para ecrãs menores
│   ├── style.css         Base: cores, tipografia, home
│   └── toolbar.css       Barras e painéis de ferramentas
├── js/
│   ├── app.js            Lógica principal (estado, projectos, undo)
│   ├── brush.js          Ferramenta de desenho
│   ├── export.js         Exportação de quadros
│   ├── layers.js         Camadas
│   ├── moderation.js     Filtro de linguagem ofensiva + termos de publicação
│   ├── public.js         Ligação aos quadros públicos (Supabase)
│   ├── shapes.js         Formas pré-definidas
│   ├── supabase.js       Cliente REST do Supabase
│   ├── supabase-config.js Config da nuvem (URL + chave anónima)
│   ├── text.js           Presets e painel de texto
│   └── ui.js             Interface (componentes/rendering)
└── projects/             * Projetos guardados — criados em runtime
```

\* Diretório gerado em runtime, não faz parte do repositório (ver `.gitignore`).

---

##  Base de dados (quadros públicos)

Os quadros públicos ficam no **Supabase** (tabela `public.quadros`, REST sem SDK).

Setup (2 minutos, grátis):

1. Vai a https://supabase.com → *New project* (região próxima de ti).
2. Em *Settings → API*, copia o **Project URL** e a **anon public key**.
3. Cola-os em `js/supabase-config.js` (GUARDA as aspas).
4. No *SQL Editor* corre o SQL (permite qualquer pessoa ver + publicar):

   ```sql
   create table if not exists public.quadros (
     id         text primary key,
     titulo     text default 'Sem título',
     autor      text default 'Anónimo',
     thumb      text default '',
     atualizado timestamptz default now(),
     publicado  timestamptz default now(),
     projeto    jsonb default '{}'::jsonb
   );
   alter table public.quadros enable row level security;
   create policy "ler_quadros" on public.quadros for select using (true);
   create policy "publicar_quadros" on public.quadros for insert with check (true);
   create policy "apagar_quadros" on public.quadros for delete using (true);
   ```

> A chave anónima é pública de propósito — quem abre o site pode ler e publicar.
> Para impedir que apaguem quadros, muda/apaga a policy `apagar_quadros`.

---

## 🗺️ Roadmap (próximas versões)

- [ ] Menu **Formas** mais completo (mais formas, edição própria)
- [ ] Mais modelos prontos + collage automática
- [ ] Multi-página / publicação direta

---

Autor: Arthur Sal