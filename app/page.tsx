"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ShoppingCart, DollarSign, Users, TrendingUp, Plus, Trash2, Edit2, Save, X, Calendar, Target, CheckSquare, Lock, LogOut, RefreshCcw } from "lucide-react";
import { 
  getFornecedores, saveFornecedor, deleteFornecedor, getCompras, 
  saveCompra, deleteCompra, getChecklist, saveChecklistItem, 
  restaurarFornecedoresPadrao // <--- ADICIONE ESSA IMPORTAÇÃO AQUI
} from "./actions";

interface Compra {
  id: string;
  data: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  condicaoPagamento: string;
  dataPrevistaFaturamento: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  categorias_fornecidas: string[];
  contato: string;
}

interface ChecklistFornecedor {
  fornecedorId: string;
  comprado: boolean;
  compraId: string | null;
  observacao: string;
  mes: string; // YYYY-MM
}

type Aba = "dashboard" | "lancamentos" | "fornecedores" | "planejamento";
type FiltroTempo = "mensal" | "semestral" | "anual";

const COLORS = ['#003366', '#004080', '#004d99', '#0059b3', '#0066cc', '#3385d6', '#6699e0', '#99b3eb', '#cce0f5', '#e6f0fa'];
const CATEGORIAS_PADRAO = ["Matéria-prima", "Embalagem", "Serviços", "Equipamentos", "Logística", "Outros"];
const CONDICOES_PAGAMENTO = ["Pix", "Boleto", "Cartão", "Transferência"];

export default function Home() {
  // Estado de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ usuario: "", senha: "" });
  const [loginError, setLoginError] = useState("");

  const [abaAtiva, setAbaAtiva] = useState<Aba>("dashboard");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [checklistFornecedores, setChecklistFornecedores] = useState<ChecklistFornecedor[]>([]);
  
  // Estados para filtros do Dashboard
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>("mensal");
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("todos");
  
  // Estados para formulários
  const [formFornecedor, setFormFornecedor] = useState({
    id: "",
    nome: "",
    categorias_fornecidas: [] as string[],
    contato: "",
  });
  const [editandoFornecedor, setEditandoFornecedor] = useState(false);
  
  const [formCompra, setFormCompra] = useState({
    id: "",
    data: new Date().toISOString().split('T')[0],
    fornecedor: "",
    descricao: "",
    valor: "",
    condicaoPagamento: "",
    dataPrevistaFaturamento: "",
  });
  const [editandoCompra, setEditandoCompra] = useState(false);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Migração de dados antigos e carregamento inicial
  useEffect(() => {
    if (!isAuthenticated) return; // Só carregar dados se autenticado
    
    try {
      // Carregar fornecedores com migração
      const fornecedoresSalvos = localStorage.getItem("fornecedores");
      if (fornecedoresSalvos) {
        try {
          const dados = JSON.parse(fornecedoresSalvos);
          // Verificar se é formato antigo (array de strings ou objetos simples)
          if (Array.isArray(dados) && dados.length > 0) {
            if (typeof dados[0] === 'string' || (dados[0].nome && !dados[0].categorias_fornecidas)) {
              // Migrar formato antigo
              const fornecedoresMigrados: Fornecedor[] = dados.map((item: any, index: number) => ({
                id: typeof item === 'string' ? `forn-${index}` : item.id || `forn-${index}`,
                nome: typeof item === 'string' ? item : item.nome,
                categorias_fornecidas: [],
                contato: "",
              }));
              setFornecedores(fornecedoresMigrados);
              localStorage.setItem("fornecedores", JSON.stringify(fornecedoresMigrados));
            } else {
              setFornecedores(dados);
            }
          }
        } catch (e) {
          console.error("Erro ao carregar fornecedores:", e);
          inicializarFornecedoresPadrao();
        }
      } else {
        inicializarFornecedoresPadrao();
      }

      // Carregar compras
      const comprasSalvas = localStorage.getItem("compras");
      if (comprasSalvas) {
        try {
          const dados = JSON.parse(comprasSalvas);
          // Migrar compras antigas (sem novos campos)
          const comprasMigradas: Compra[] = dados.map((compra: any) => ({
            ...compra,
            condicaoPagamento: compra.condicaoPagamento || "",
            dataPrevistaFaturamento: compra.dataPrevistaFaturamento || "",
          }));
          setCompras(comprasMigradas);
          localStorage.setItem("compras", JSON.stringify(comprasMigradas));
        } catch (e) {
          console.error("Erro ao carregar compras:", e);
          setCompras([]);
        }
      }

      // Carregar checklist de planejamento
      const checklistSalvo = localStorage.getItem("checklistFornecedores");
      if (checklistSalvo) {
        try {
          setChecklistFornecedores(JSON.parse(checklistSalvo));
        } catch (e) {
          console.error("Erro ao carregar checklist:", e);
          setChecklistFornecedores([]);
        }
      }
    } catch (error) {
      console.error("Erro geral ao carregar dados:", error);
      // Inicializar valores padrão em caso de erro
      inicializarFornecedoresPadrao();
    }
  }, []);

  const inicializarFornecedoresPadrao = () => {
    const fornecedoresIniciais: Fornecedor[] = [
      "Delfa", "Zanoti", "Fermoplast", "Modelle", "Águas Cristal",
      "Top Bojos", "Etax", "Mercado (Atacado)", "Midlab", "Mercado Livre"
    ].map((nome, index) => ({
      id: `forn-${Date.now()}-${index}`,
      nome,
      categorias_fornecidas: [],
      contato: "",
    }));
    setFornecedores(fornecedoresIniciais);
    localStorage.setItem("fornecedores", JSON.stringify(fornecedoresIniciais));
  };

  // Salvar dados no LocalStorage
  useEffect(() => {
    if (fornecedores.length > 0) {
      localStorage.setItem("fornecedores", JSON.stringify(fornecedores));
    }
  }, [fornecedores]);

  useEffect(() => {
    localStorage.setItem("compras", JSON.stringify(compras));
  }, [compras]);

  useEffect(() => {
    localStorage.setItem("checklistFornecedores", JSON.stringify(checklistFornecedores));
  }, [checklistFornecedores]);

  // Calcular total gasto (respeitando filtros)
  const comprasFiltradas = filtroFornecedor === "todos"
    ? compras
    : compras.filter(c => c.fornecedor === filtroFornecedor);

  const aplicarFiltroTempo = (comprasArray: Compra[]) => {
    const agora = new Date();
    const dataLimite = new Date();
    
    if (filtroTempo === "mensal") {
      dataLimite.setMonth(agora.getMonth() - 1);
    } else if (filtroTempo === "semestral") {
      dataLimite.setMonth(agora.getMonth() - 6);
    } else if (filtroTempo === "anual") {
      dataLimite.setFullYear(agora.getFullYear() - 1);
    }
    
    return comprasArray.filter(c => new Date(c.data) >= dataLimite);
  };

  // Incluir compras do planejamento nos cálculos do dashboard
  const mesAtual = new Date().toISOString().slice(0, 7);
  const checklistMesAtual = checklistFornecedores.filter(item => item.mes === mesAtual);
  const comprasDoPlanejamento = checklistMesAtual
    .filter(item => item.comprado && item.compraId)
    .map(item => compras.find(c => c.id === item.compraId))
    .filter((c): c is Compra => c !== null);
  
  const comprasParaDashboard = [...comprasFiltradas, ...comprasDoPlanejamento.filter(c => !comprasFiltradas.some(cf => cf.id === c.id))];
  const comprasParaGraficos = aplicarFiltroTempo(comprasParaDashboard);
  const totalGasto = comprasParaDashboard.reduce((acc, compra) => acc + compra.valor, 0);

  // Dados para gráficos
  const dadosRanking = fornecedores
    .map(fornecedor => {
      const total = comprasParaGraficos
        .filter(c => c.fornecedor === fornecedor.nome)
        .reduce((acc, c) => acc + c.valor, 0);
      return { nome: fornecedor.nome, total };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const dadosPizza = dadosRanking.map(item => ({
    name: item.nome,
    value: item.total
  }));

  // Dados para gráfico de evolução (agrupa por período conforme filtro)
  const dadosEvolucao = comprasParaGraficos.reduce((acc: { [key: string]: { total: number; timestamp: number } }, compra) => {
    const data = new Date(compra.data);
    let chave: string;
    let timestamp: number;
    
    if (filtroTempo === "mensal") {
      chave = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      timestamp = new Date(data.getFullYear(), data.getMonth(), 1).getTime();
    } else if (filtroTempo === "semestral") {
      const semestre = Math.floor(data.getMonth() / 6);
      chave = `${semestre + 1}º Sem ${data.getFullYear()}`;
      timestamp = new Date(data.getFullYear(), semestre * 6, 1).getTime();
    } else {
      chave = data.getFullYear().toString();
      timestamp = new Date(data.getFullYear(), 0, 1).getTime();
    }
    
    if (!acc[chave]) {
      acc[chave] = { total: 0, timestamp };
    }
    acc[chave].total += compra.valor;
    return acc;
  }, {});

  const dadosEvolucaoArray = Object.entries(dadosEvolucao)
    .map(([periodo, dados]) => ({ periodo, total: dados.total, timestamp: dados.timestamp }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ periodo, total }) => ({ periodo, total }));

  // Funções de fornecedores
  const iniciarEdicaoFornecedor = (fornecedor: Fornecedor) => {
    setFormFornecedor({
      id: fornecedor.id,
      nome: fornecedor.nome,
      categorias_fornecidas: [...fornecedor.categorias_fornecidas],
      contato: fornecedor.contato,
    });
    setEditandoFornecedor(true);
  };

  const cancelarEdicaoFornecedor = () => {
    setFormFornecedor({ id: "", nome: "", categorias_fornecidas: [], contato: "" });
    setEditandoFornecedor(false);
  };

  const salvarFornecedor = () => {
    if (!formFornecedor.nome.trim()) return;
    
    if (editandoFornecedor) {
      setFornecedores(fornecedores.map(f => f.id === formFornecedor.id ? formFornecedor : f));
    } else {
      const novo: Fornecedor = {
        id: `forn-${Date.now()}`,
        nome: formFornecedor.nome.trim(),
        categorias_fornecidas: formFornecedor.categorias_fornecidas,
        contato: formFornecedor.contato.trim(),
      };
      setFornecedores([...fornecedores, novo]);
    }
    cancelarEdicaoFornecedor();
  };

  const removerFornecedor = (id: string) => {
    if (confirm("Tem certeza que deseja remover este fornecedor?")) {
      setFornecedores(fornecedores.filter(f => f.id !== id));
    }
  };

  const toggleCategoriaFornecedor = (categoria: string) => {
    const categorias = formFornecedor.categorias_fornecidas;
    if (categorias.includes(categoria)) {
      setFormFornecedor({ ...formFornecedor, categorias_fornecidas: categorias.filter(c => c !== categoria) });
    } else {
      setFormFornecedor({ ...formFornecedor, categorias_fornecidas: [...categorias, categoria] });
    }
  };

  // Funções de compras
  const iniciarEdicaoCompra = (compra: Compra) => {
    setFormCompra({
      id: compra.id,
      data: compra.data,
      fornecedor: compra.fornecedor,
      descricao: compra.descricao,
      valor: compra.valor.toString(),
      condicaoPagamento: compra.condicaoPagamento,
      dataPrevistaFaturamento: compra.dataPrevistaFaturamento,
    });
    setEditandoCompra(true);
  };

  const cancelarEdicaoCompra = () => {
    setFormCompra({
      id: "",
      data: new Date().toISOString().split('T')[0],
      fornecedor: "",
      descricao: "",
      valor: "",
      condicaoPagamento: "",
      dataPrevistaFaturamento: "",
    });
    setEditandoCompra(false);
  };

  const salvarCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompra.fornecedor || !formCompra.descricao || !formCompra.valor) return;

    const compraAtualizada: Compra = {
      id: editandoCompra ? formCompra.id : `compra-${Date.now()}`,
      data: formCompra.data,
      fornecedor: formCompra.fornecedor,
      descricao: formCompra.descricao,
      valor: parseFloat(formCompra.valor),
      condicaoPagamento: formCompra.condicaoPagamento,
      dataPrevistaFaturamento: formCompra.dataPrevistaFaturamento,
    };

    if (editandoCompra) {
      setCompras(compras.map(c => c.id === compraAtualizada.id ? compraAtualizada : c));
    } else {
      setCompras([...compras, compraAtualizada]);
    }
    cancelarEdicaoCompra();
  };

  const removerCompra = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta compra?")) {
      setCompras(compras.filter(c => c.id !== id));
    }
  };

  // Funções de planejamento (checklist)
  const checklistMesAtualPlanejamento = checklistFornecedores.filter(item => item.mes === mesAtual);

  const toggleFornecedorChecklist = (fornecedorId: string) => {
    const itemExistente = checklistMesAtualPlanejamento.find(item => item.fornecedorId === fornecedorId);
    
    if (itemExistente) {
      // Se já existe, apenas alterna o estado comprado
      const mesAtualCheck = new Date().toISOString().slice(0, 7);
      setChecklistFornecedores(checklistFornecedores.map(item => 
        item.fornecedorId === fornecedorId && item.mes === mesAtualCheck
          ? { ...item, comprado: !item.comprado, compraId: !item.comprado ? item.compraId : null }
          : item
      ));
    } else {
      // Se não existe, cria novo item
      const mesAtualCheck = new Date().toISOString().slice(0, 7);
      const novoItem: ChecklistFornecedor = {
        fornecedorId,
        comprado: true,
        compraId: null,
        observacao: "",
        mes: mesAtualCheck,
      };
      setChecklistFornecedores([...checklistFornecedores, novoItem]);
    }
  };

  const atualizarChecklistFornecedor = (fornecedorId: string, campo: 'compraId' | 'observacao', valor: string) => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    setChecklistFornecedores(checklistFornecedores.map(item =>
      item.fornecedorId === fornecedorId && item.mes === mesAtual
        ? { ...item, [campo]: valor }
        : item
    ));
  };

  const criarCompraDoPlanejamento = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (!fornecedor) return;

    const novaCompra: Compra = {
      id: `compra-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      fornecedor: fornecedor.nome,
      descricao: `Compra planejada - ${fornecedor.nome}`,
      valor: 0,
      condicaoPagamento: "",
      dataPrevistaFaturamento: "",
    };
    
    setCompras([...compras, novaCompra]);
    
    // Atualiza o checklist com o ID da nova compra
    atualizarChecklistFornecedor(fornecedorId, 'compraId', novaCompra.id);
    
    // Abre a aba de lançamentos para editar a compra
    setAbaAtiva("lancamentos");
    setTimeout(() => {
      iniciarEdicaoCompra(novaCompra);
    }, 100);
  };

  // Cálculos para dashboard do planejamento
  const fornecedoresComprados = checklistMesAtualPlanejamento.filter(item => item.comprado).length;
  const totalPlanejado = fornecedores.length;
  const totalRealizado = fornecedoresComprados;

  // Utilitários
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarValorTooltip = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '';
    return formatarValor(value);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };
// --- FUNÇÃO DE SAIR (NOVA) ---
const handleLogout = () => {
  if(confirm("Deseja realmente sair?")) {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    setLoginForm({ usuario: "", senha: "" });
  }
};


  // Função de login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginForm.usuario === "isabela" && loginForm.senha === "22062001") {
      setIsAuthenticated(true);
      localStorage.setItem("isAuthenticated", "true");
    } else {
      setLoginError("Usuário ou senha incorretos");
    }
  };

  // Se não estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-[#003366] p-3 rounded-full">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Walcle / Hadoli</h1>
            <p className="text-gray-600">ERP de Compras</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={loginForm.usuario}
                onChange={(e) => setLoginForm({ ...loginForm, usuario: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                placeholder="Digite seu usuário"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={loginForm.senha}
                onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium text-lg"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003366] text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Walcle / Hadoli</h1>
              <p className="text-blue-200 mt-1">ERP de Compras</p>
            </div>
            <div className="flex items-center gap-4 bg-blue-900/50 px-6 py-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
              <div>
                <p className="text-sm text-blue-200">Total Gasto</p>
                <p className="text-2xl font-bold text-white">{formatarValor(totalGasto)}</p>
              </div>
              <div className="flex items-center gap-4">
    <div className="bg-blue-900/50 px-6 py-3 rounded-lg">
        {/* ... código do total gasto que já existe ... */}
    </div>

    {/* COLE O BOTÃO DE SAIR AQUI EMBAIXO: */}
    <button 
        onClick={handleLogout} 
        className="bg-red-600 hover:bg-red-700 p-3 rounded-lg text-white flex items-center gap-2 font-bold transition"
    >
        <LogOut size={20} /> Sair
    </button>
</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navegação */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setAbaAtiva("dashboard")}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                abaAtiva === "dashboard"
                  ? "bg-[#003366] text-white border-b-2 border-[#003366]"
                  : "text-gray-600 hover:text-[#003366] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setAbaAtiva("lancamentos")}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                abaAtiva === "lancamentos"
                  ? "bg-[#003366] text-white border-b-2 border-[#003366]"
                  : "text-gray-600 hover:text-[#003366] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Lançamentos
              </div>
            </button>
            <button
              onClick={() => setAbaAtiva("fornecedores")}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                abaAtiva === "fornecedores"
                  ? "bg-[#003366] text-white border-b-2 border-[#003366]"
                  : "text-gray-600 hover:text-[#003366] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Fornecedores
              </div>
            </button>
            <button
              onClick={() => setAbaAtiva("planejamento")}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                abaAtiva === "planejamento"
                  ? "bg-[#003366] text-white border-b-2 border-[#003366]"
                  : "text-gray-600 hover:text-[#003366] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Planejamento
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8">
        {/* Aba Dashboard */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
              
              {/* Filtros */}
              <div className="flex gap-4 flex-wrap">
                <select
                  value={filtroTempo}
                  onChange={(e) => setFiltroTempo(e.target.value as FiltroTempo)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#003366] focus:border-transparent"
                >
                  <option value="mensal">Mensal</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
                
                <select
                  value={filtroFornecedor}
                  onChange={(e) => setFiltroFornecedor(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#003366] focus:border-transparent min-w-[200px]"
                >
                  <option value="todos">Todos os Fornecedores</option>
                  {fornecedores.map(fornecedor => (
                    <option key={fornecedor.id} value={fornecedor.nome}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Barras - Ranking */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Ranking de Fornecedores</h3>
                {dadosRanking.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosRanking}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="nome" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12, fill: '#000' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#000' }} />
                      <Tooltip 
                        formatter={formatarValorTooltip}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000' }}
                        itemStyle={{ color: '#000', fontWeight: 'bold' }}
                        labelStyle={{ color: '#000', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ color: '#000' }} />
                      <Bar dataKey="total" fill="#003366" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-700">
                    Nenhum dado disponível para o período selecionado
                  </div>
                )}
              </div>

              {/* Gráfico de Pizza */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Distribuição por Fornecedor</h3>
                {dadosPizza.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={formatarValorTooltip}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000' }}
                        itemStyle={{ color: '#000', fontWeight: 'bold' }}
                        labelStyle={{ color: '#000', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-700">
                    Nenhum dado disponível para o período selecionado
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Linha - Evolução */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Evolução {filtroTempo === "mensal" ? "Mensal" : filtroTempo === "semestral" ? "Semestral" : "Anual"}</h3>
              {dadosEvolucaoArray.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dadosEvolucaoArray}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: '#000' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#000' }} />
                    <Tooltip 
                      formatter={formatarValorTooltip}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000' }}
                      itemStyle={{ color: '#000', fontWeight: 'bold' }}
                      labelStyle={{ color: '#000', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ color: '#000' }} />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#003366" 
                      strokeWidth={3}
                      dot={{ fill: "#003366", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-700">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Lançamentos */}
        {abaAtiva === "lancamentos" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">Lançamentos</h2>
            
            {/* Formulário */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editandoCompra ? "Editar Compra" : "Nova Compra"}
                </h3>
                {editandoCompra && (
                  <button
                    onClick={cancelarEdicaoCompra}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <form onSubmit={salvarCompra} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formCompra.data}
                      onChange={(e) => setFormCompra({ ...formCompra, data: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Fornecedor
                    </label>
                    <select
                      value={formCompra.fornecedor}
                      onChange={(e) => setFormCompra({ ...formCompra, fornecedor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900 bg-white"
                      required
                    >
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores.map(fornecedor => (
                        <option key={fornecedor.id} value={fornecedor.nome}>
                          {fornecedor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formCompra.descricao}
                    onChange={(e) => setFormCompra({ ...formCompra, descricao: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                    placeholder="Descrição da compra"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formCompra.valor}
                      onChange={(e) => setFormCompra({ ...formCompra, valor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Condição de Pagamento
                    </label>
                    <select
                      value={formCompra.condicaoPagamento}
                      onChange={(e) => setFormCompra({ ...formCompra, condicaoPagamento: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">Selecione</option>
                      {CONDICOES_PAGAMENTO.map(cond => (
                        <option key={cond} value={cond}>{cond}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Data Prevista Faturamento
                    </label>
                    <input
                      type="date"
                      value={formCompra.dataPrevistaFaturamento}
                      onChange={(e) => setFormCompra({ ...formCompra, dataPrevistaFaturamento: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium flex items-center gap-2 justify-center"
                >
                  {editandoCompra ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editandoCompra ? "Salvar Alteração" : "Adicionar Compra"}
                </button>
              </form>
            </div>

            {/* Tabela de Compras */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Histórico de Compras</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Data</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Fornecedor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Descrição</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Pagamento</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Faturamento</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Valor</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-700">
                          Nenhuma compra registrada ainda.
                        </td>
                      </tr>
                    ) : (
                      [...compras].reverse().map(compra => (
                        <tr key={compra.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => iniciarEdicaoCompra(compra)}>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatarData(compra.data)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{compra.fornecedor}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{compra.descricao}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{compra.condicaoPagamento || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{compra.dataPrevistaFaturamento ? formatarData(compra.dataPrevistaFaturamento) : "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                            {formatarValor(compra.valor)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); iniciarEdicaoCompra(compra); }}
                                className="p-1 text-[#003366] hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removerCompra(compra.id); }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Aba Fornecedores */}
        {abaAtiva === "fornecedores" && (
          <div className="space-y-8"> 
            <h2 className="text-3xl font-bold text-gray-900">Fornecedores</h2>
            
            {/* Formulário */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editandoFornecedor ? "Editar Fornecedor" : "Adicionar Fornecedor"}
                </h3>
                {editandoFornecedor && (
                  <button
                    onClick={cancelarEdicaoFornecedor}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Nome do Fornecedor
                  </label>
                  <input
                    type="text"
                    value={formFornecedor.nome}
                    onChange={(e) => setFormFornecedor({ ...formFornecedor, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Contato
                  </label>
                  <input
                    type="text"
                    value={formFornecedor.contato}
                    onChange={(e) => setFormFornecedor({ ...formFornecedor, contato: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                    placeholder="Email, telefone, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Categorias Fornecidas
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIAS_PADRAO.map(categoria => (
                      <label key={categoria} className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formFornecedor.categorias_fornecidas.includes(categoria)}
                          onChange={() => toggleCategoriaFornecedor(categoria)}
                          className="w-4 h-4 text-[#003366] focus:ring-[#003366]"
                        />
                        <span className="text-sm text-gray-900">{categoria}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={salvarFornecedor}
                  className="w-full md:w-auto px-6 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium flex items-center gap-2"
                >
                  {editandoFornecedor ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editandoFornecedor ? "Salvar Alteração" : "Adicionar Fornecedor"}
                </button>
              </div>
            </div>

            {/* Lista de fornecedores */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Lista de Fornecedores</h3>
              {fornecedores.length === 0 ? (
                <p className="text-center py-8 text-gray-700">Nenhum fornecedor cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {fornecedores.map(fornecedor => (
                    <div
                      key={fornecedor.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{fornecedor.nome}</h4>
                          {fornecedor.contato && (
                            <p className="text-sm text-gray-700 mt-1">Contato: {fornecedor.contato}</p>
                          )}
                          {fornecedor.categorias_fornecidas.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {fornecedor.categorias_fornecidas.map(cat => (
                                <span key={cat} className="px-2 py-1 bg-[#003366]/10 text-[#003366] text-xs rounded-full">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => iniciarEdicaoFornecedor(fornecedor)}
                            className="p-2 text-[#003366] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removerFornecedor(fornecedor.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Planejamento */}
        {abaAtiva === "planejamento" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">Checklist de Compras</h2>
            
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total de Fornecedores</h3>
                <p className="text-3xl font-bold text-[#003366]">{totalPlanejado}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fornecedores Comprados</h3>
                <p className="text-3xl font-bold text-gray-900">{totalRealizado} / {totalPlanejado}</p>
              </div>
            </div>
            
            {/* Gráfico de progresso */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Progresso de Compras</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: "Total", valor: totalPlanejado }, { name: "Comprados", valor: totalRealizado }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#000' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#000' }} />
                  <Tooltip 
                    formatter={formatarValorTooltip}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000' }}
                    itemStyle={{ color: '#000', fontWeight: 'bold' }}
                    labelStyle={{ color: '#000', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="valor" fill="#003366" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Checklist de Fornecedores */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Checklist de Fornecedores (Mês Atual)</h3>
              {fornecedores.length === 0 ? (
                <p className="text-center py-8 text-gray-700">Nenhum fornecedor cadastrado. Adicione fornecedores na aba "Fornecedores".</p>
              ) : (
                <div className="space-y-4">
                  {fornecedores.map(fornecedor => {
                    const itemChecklist = checklistMesAtualPlanejamento.find(item => item.fornecedorId === fornecedor.id);
                    const comprado = itemChecklist?.comprado || false;
                    const compraAssociada = itemChecklist?.compraId ? compras.find(c => c.id === itemChecklist.compraId) : null;
                    const comprasDoFornecedor = compras.filter(c => c.fornecedor === fornecedor.nome);

                    return (
                      <div
                        key={fornecedor.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          comprado 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center pt-1">
                            <input
                              type="checkbox"
                              checked={comprado}
                              onChange={() => toggleFornecedorChecklist(fornecedor.id)}
                              className="w-5 h-5 text-[#003366] focus:ring-[#003366] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">{fornecedor.nome}</h4>
                              {comprado && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                  Comprado
                                </span>
                              )}
                            </div>

                            {comprado && (
                              <div className="mt-4 space-y-3">
                                {/* Seleção de Compra */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-1">
                                    Compra Associada
                                  </label>
                                  <div className="flex gap-2">
                                    <select
                                      value={itemChecklist?.compraId || ""}
                                      onChange={(e) => {
                                        if (e.target.value === "nova") {
                                          criarCompraDoPlanejamento(fornecedor.id);
                                        } else {
                                          atualizarChecklistFornecedor(fornecedor.id, 'compraId', e.target.value);
                                        }
                                      }}
                                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900 bg-white"
                                    >
                                      <option value="">Selecione uma compra</option>
                                      {comprasDoFornecedor.map(compra => (
                                        <option key={compra.id} value={compra.id}>
                                          {formatarData(compra.data)} - {compra.descricao} ({formatarValor(compra.valor)})
                                        </option>
                                      ))}
                                      <option value="nova">+ Criar Nova Compra</option>
                                    </select>
                                    {compraAssociada && (
                                      <button
                                        onClick={() => {
                                          setAbaAtiva("lancamentos");
                                          setTimeout(() => iniciarEdicaoCompra(compraAssociada), 100);
                                        }}
                                        className="px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004080] transition-colors text-sm font-medium"
                                      >
                                        Ver/Editar
                                      </button>
                                    )}
                                  </div>
                                  {compraAssociada && (
                                    <p className="mt-1 text-sm text-gray-700">
                                      {formatarData(compraAssociada.data)} - {formatarValor(compraAssociada.valor)}
                                    </p>
                                  )}
                                </div>

                                {/* Observação */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-1">
                                    Observação
                                  </label>
                                  <textarea
                                    value={itemChecklist?.observacao || ""}
                                    onChange={(e) => atualizarChecklistFornecedor(fornecedor.id, 'observacao', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent text-gray-900"
                                    rows={2}
                                    placeholder="Adicione uma observação sobre esta compra..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
        )}
      </main>
    </div>
  );
}
