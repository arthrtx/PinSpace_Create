# PinSpace Create 

**Cria murais, vision boards e collages — estilo Canva + Pinterest.**

Editor de quadros criativos para montar ideias, guardar visões e partilhar
com o mundo. Escolhe um modelo, arrasta formas e texto, explora pins do
Pinterest e publica o teu quadro público.

---

##  Como correr

Requires **Python 3** (sem dependências externas — só a biblioteca padrão).

```bash
# 1. Entrar na pasta do projeto
cd PinSpace_Create

# 2. Iniciar o servidor local
python server.py
#   ou:  duplo clique em iniciar.bat

# 3. Abrir no navegador
#   http://127.0.0.1:8000
```

> **Ctrl + F5** (recarga forçada) depois de qualquer alteração, para o navegador
> não usar a versão em memória.

---

##  Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Quadros (murais)** | Cria quadros com tamanho (Celular / PC / 4K / Tablet / Quadrado). Cada quadro tem fundo, texto e formas próprias. |
| **Texto estilo Canva** | Menu de texto com presets prontos (Título, Subtítulo, Texto), escolha de fonte, tamanho (A− / A+), negrito, itálico, sublinhado, alinhamento, auto-ajuste, opacidade e rotação. |
| **Formas arrastáveis** | Painel "Formas" no menu esquerdo — arrasta uma forma com o rato até ao quadro para a adicionares onde quiseres (ou clica para colocar no centro). |
| **Ferramentas** | Menu "Ferramentas" (antes "Pincel") — contém o menu de formas e os ajustes da ferramenta. |
| **Ideias (Pinterest)** | Painel de ideias que carrega **100 pins** do feed do Pinterest e mostra os quadros públicos. |
| **Histórico / Undo** | Desfazer e refazer cada acção de edição. |
| **Exportar** | Exporta o quadro em formato selecionado (imagem/PDF) e abre uma pré-visualização. |
| **Quadros públicos** | Publica um quadro para a lista pública; qualquer visitante pode abrir o quadro publicado. |
| **Persistência local** | Guarda os teus quadros e projetos no navegador (localStorage). |

---

##  Estrutura do projeto

```
PinSpace_Create/
├── index.html         A página do site (home + editor)
├── server.py          Servidor local + API JSON (public.json)
├── iniciar.bat        Atalho para correr o servidor
├── background.png     Fundo do site
├── css/
│   ├── board.css      Quadro / tela de edição
│   ├── responsive.css Adaptações para ecrãs menores
│   ├── style.css      Base: cores, tipografia, home
│   └── toolbar.css    Barras e painéis de ferramentas
├── js/
│   ├── app.js         Lógica principal (estado, projectos, undo)
│   ├── brush.js       Ferramenta de desenho
│   ├── export.js      Exportação de quadros
│   ├── ideas.js       Feed de ideias / Pinterest
│   ├── layers.js      Camadas
│   ├── shapes.js      Formas pré-definidas
│   ├── text.js        Presets e painel de texto
│   └── ui.js          Interface (componentes/rendering)
├── assets/            Imagens (SVG) do design
├── icons/             Ícones da UI
├── data/              * Base de dados pública (public.json) — criada em runtime
└── projects/          * Projetos guardados — criados em runtime
```

\* Diretórios gerados em runtime, não fazem parte do repositório (ver `.gitignore`).

---

##  API (servidor local)

`server.py` serve os ficheiros estáticos e uma API JSON em `/api/`:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/public` | Lista os quadros públicos (mais recentes primeiro, no máximo 60). |
| `POST` | `/api/public` | Publica um quadro (novo) ou atualiza um existente se `publicId` for enviado. |
| `GET` | `/api/public/<id>` | Obtém um quadro público específico. |
| `DELETE` | `/api/public/<id>` | Remove um quadro público. |
| `GET` | `/api/pins?limit=100` | Busca pins do feed (100 de uma vez). |

Os dados ficam em `data/public.json` — a "base de dados" local em JSON.
CORS está ativo (`*`) para permitir o desenvolvimento da app.

---


## 🗺️ Roadmap (próximas versões)

- [ ] Menu **Formas** mais completo (mais formas, edição própria)
- [ ] Painéis laterais **redimensionáveis** (arrastar para aumentar/diminuir)
- [ ] **Consumo de uma base de dados geral** (ex.: Supabase) para os quadros públicos
- [ ] Mais modelos prontos + collage automática
- [ ] Multi-página / publicação direta

---

Autor: Arthur Sal
