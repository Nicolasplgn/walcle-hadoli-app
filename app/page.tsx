"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  ShoppingCart, DollarSign, Users, TrendingUp, Plus, Trash2, Edit2, Save, X, 
  Target, Lock, Loader2, LogOut, RefreshCcw, CheckSquare, Calendar, CreditCard 
} from "lucide-react";

import { 
  getFornecedores, saveFornecedor, deleteFornecedor, 
  getCompras, saveCompra, deleteCompra, 
  getChecklist, saveChecklistItem, restaurarFornecedoresPadrao 
} from "./actions";

// --- INTERFACES ---
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
  mes: string;
}

type Aba = "dashboard" | "lancamentos" | "fornecedores" | "planejamento";
type FiltroTempo = "mensal" | "semestral" | "anual";

// --- PALETA DE CORES ---
const COLORS = ['#000000', '#333333', '#fb7185', '#9ca3af', '#4b5563', '#e11d48', '#f43f5e'];
const HADOLI_PINK = "#fb7185"; 
const HADOLI_BLACK = "#000000";
const HADOLI_DARK_GRAY = "#374151";

const CATEGORIAS_PADRAO = ["Matéria-prima", "Embalagem", "Serviços", "Equipamentos", "Logística", "Outros"];
const CONDICOES_PAGAMENTO = ["Pix", "Boleto", "Cartão", "Transferência"];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ usuario: "", senha: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<Aba>("dashboard");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [checklistFornecedores, setChecklistFornecedores] = useState<ChecklistFornecedor[]>([]);
  
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>("mensal");
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("todos");
  
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

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const carregarDadosDoBanco = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [dadosFornecedores, dadosCompras, dadosChecklist] = await Promise.all([
        getFornecedores(),
        getCompras(),
        getChecklist()
      ]);

      setFornecedores(dadosFornecedores);
      setCompras(dadosCompras);
      setChecklistFornecedores(dadosChecklist);
    } catch (error) {
      console.error("Erro ao carregar dados do banco:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      carregarDadosDoBanco();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.usuario === "isabela" && loginForm.senha === "22062001") {
      setIsAuthenticated(true);
      localStorage.setItem("isAuthenticated", "true");
    } else {
      setLoginError("Credenciais inválidas");
    }
  };

  const handleLogout = () => {
    if (confirm("Deseja realmente sair?")) {
        localStorage.removeItem("isAuthenticated");
        setIsAuthenticated(false);
        setLoginForm({ usuario: "", senha: "" });
    }
  };

  const handleRestaurarFornecedores = async () => {
    if(!confirm("Isso irá cadastrar os fornecedores padrão caso não existam. Continuar?")) return;
    setIsLoading(true);
    await restaurarFornecedoresPadrao();
    await carregarDadosDoBanco();
    setIsLoading(false);
    alert("Lista de fornecedores restaurada!");
  };

  // --- CÁLCULOS GERAIS ---
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

  const mesAtual = new Date().toISOString().slice(0, 7);
  const checklistMesAtual = checklistFornecedores.filter(item => item.mes === mesAtual);
  
  const comprasDoPlanejamento = checklistMesAtual
    .filter(item => item.comprado && item.compraId)
    .map(item => compras.find(c => c.id === item.compraId))
    .filter((c): c is Compra => c !== undefined);
  
  const comprasParaDashboard = [
    ...comprasFiltradas, 
    ...comprasDoPlanejamento.filter(c => !comprasFiltradas.some(cf => cf.id === c.id) && (filtroFornecedor === "todos" || c.fornecedor === filtroFornecedor))
  ];
  
  const comprasParaGraficos = aplicarFiltroTempo(comprasParaDashboard);
  const totalGasto = comprasParaDashboard.reduce((acc, compra) => acc + compra.valor, 0);

  // --- DADOS PARA GRÁFICOS DO DASHBOARD ---
  const dadosRanking = fornecedores
    .map(fornecedor => {
      const total = comprasParaGraficos
        .filter(c => c.fornecedor === fornecedor.nome)
        .reduce((acc, c) => acc + c.valor, 0);
      return { nome: fornecedor.nome, total };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const dadosPizza = dadosRanking.map(item => ({ name: item.nome, value: item.total }));

  // --- CORREÇÃO DA EVOLUÇÃO TEMPORAL (EIXO X) ---
  const dadosEvolucaoObj = comprasParaGraficos.reduce((acc: any, compra) => {
    // Corrige fuso horário adicionando horas para não cair no dia anterior
    const data = new Date(compra.data + 'T12:00:00');
    let chave: string, ts: number;
    
    if (filtroTempo === "mensal") {
      // Exibe Dia/Mês (ex: 21/01)
      chave = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      ts = data.getTime();
    } else if (filtroTempo === "semestral") {
      // Exibe Nome do Mês (ex: Jan)
      const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short' });
      // Capitaliza a primeira letra
      chave = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
      // Timestamp do primeiro dia do mês para ordenação
      ts = new Date(data.getFullYear(), data.getMonth(), 1).getTime();
    } else {
      // Exibe Mês/Ano (ex: Jan/26)
      const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short' });
      const ano = data.toLocaleDateString('pt-BR', { year: '2-digit' });
      chave = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;
      ts = new Date(data.getFullYear(), data.getMonth(), 1).getTime();
    }
    
    if (!acc[chave]) {
        acc[chave] = { 
            periodo: chave, // Essa chave será usada no Eixo X
            total: 0, 
            timestamp: ts 
        };
    }
    acc[chave].total += compra.valor;
    return acc;
  }, {});

  // Ordena cronologicamente e gera o array final
  const dadosEvolucao = Object.values(dadosEvolucaoObj).sort((a: any, b: any) => a.timestamp - b.timestamp);

  // --- DADOS PARA GRÁFICOS NOVOS ---
  const dadosPagamento = comprasParaGraficos.reduce((acc: any, compra) => {
    const tipo = compra.condicaoPagamento || "Não informado";
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo] += compra.valor;
    return acc;
  }, {});
  const dadosGraficoPagamento = Object.keys(dadosPagamento).map(key => ({ name: key, value: dadosPagamento[key] }));

  const dadosTop5Fornecedores = [...dadosRanking].sort((a, b) => b.total - a.total).slice(0, 5);

  const metaPlanejamento = fornecedores.length;
  const realizadoPlanejamento = checklistFornecedores.filter(c => c.mes === mesAtual && c.comprado).length;
  const dadosPlanejamento = [
    { name: "Realizado", value: realizadoPlanejamento },
    { name: "Pendente", value: metaPlanejamento - realizadoPlanejamento }
  ];


  // --- AÇÕES DO USUÁRIO ---
  const handleSalvarFornecedor = async () => {
    if (!formFornecedor.nome.trim()) return;
    setIsLoading(true);
    await saveFornecedor({
        id: editandoFornecedor ? formFornecedor.id : null,
        nome: formFornecedor.nome.trim(),
        categorias_fornecidas: formFornecedor.categorias_fornecidas,
        contato: formFornecedor.contato.trim()
    });
    await carregarDadosDoBanco();
    setFormFornecedor({ id: "", nome: "", categorias_fornecidas: [], contato: "" });
    setEditandoFornecedor(false);
    setIsLoading(false);
  };

  const handleRemoverFornecedor = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este fornecedor?")) {
      setIsLoading(true);
      await deleteFornecedor(id);
      await carregarDadosDoBanco();
      setIsLoading(false);
    }
  };

  const iniciarEdicaoFornecedor = (f: Fornecedor) => {
    setFormFornecedor({ ...f });
    setEditandoFornecedor(true);
  };

  const cancelarEdicaoFornecedor = () => {
    setFormFornecedor({ id: "", nome: "", categorias_fornecidas: [], contato: "" });
    setEditandoFornecedor(false);
  };

  const toggleCategoriaFornecedor = (cat: string) => {
    const cats = formFornecedor.categorias_fornecidas;
    if (cats.includes(cat)) {
        setFormFornecedor({ ...formFornecedor, categorias_fornecidas: cats.filter(c => c !== cat) });
    } else {
        setFormFornecedor({ ...formFornecedor, categorias_fornecidas: [...cats, cat] });
    }
  };

  const handleSalvarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompra.fornecedor || !formCompra.valor) return;
    setIsLoading(true);
    await saveCompra({
      id: editandoCompra ? formCompra.id : null,
      data: formCompra.data,
      fornecedor: formCompra.fornecedor,
      descricao: formCompra.descricao,
      valor: parseFloat(formCompra.valor),
      condicaoPagamento: formCompra.condicaoPagamento,
      dataPrevistaFaturamento: formCompra.dataPrevistaFaturamento,
    });
    await carregarDadosDoBanco();
    setFormCompra({ id: "", data: new Date().toISOString().split('T')[0], fornecedor: "", descricao: "", valor: "", condicaoPagamento: "", dataPrevistaFaturamento: "" });
    setEditandoCompra(false);
    setIsLoading(false);
  };

  const iniciarEdicaoCompra = (c: Compra) => {
    setFormCompra({ ...c, valor: c.valor.toString() });
    setEditandoCompra(true);
  };

  const cancelarEdicaoCompra = () => {
    setFormCompra({ id: "", data: new Date().toISOString().split('T')[0], fornecedor: "", descricao: "", valor: "", condicaoPagamento: "", dataPrevistaFaturamento: "" });
    setEditandoCompra(false);
  };

  const handleRemoverCompra = async (id: string) => {
    if (confirm("Tem certeza que deseja remover esta compra?")) {
      setIsLoading(true);
      await deleteCompra(id);
      await carregarDadosDoBanco();
      setIsLoading(false);
    }
  };

  const handleToggleChecklist = async (fornecedorId: string) => {
    const mesAtualCheck = new Date().toISOString().slice(0, 7);
    const itemExistente = checklistFornecedores.find(item => item.fornecedorId === fornecedorId && item.mes === mesAtualCheck);
    const novoStatus = !itemExistente?.comprado;
    
    const novosItens = [...checklistFornecedores];
    if (itemExistente) {
        const index = novosItens.findIndex(i => i === itemExistente);
        novosItens[index] = { ...itemExistente, comprado: novoStatus };
    } else {
        novosItens.push({ fornecedorId, mes: mesAtualCheck, comprado: true, compraId: null, observacao: "" });
    }
    setChecklistFornecedores(novosItens);

    await saveChecklistItem({
        fornecedorId,
        mes: mesAtualCheck,
        comprado: novoStatus,
        compraId: itemExistente?.compraId || null,
        observacao: itemExistente?.observacao || ""
    });
  };

  const criarCompraDoPlanejamento = async (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (!fornecedor) return;
    setIsLoading(true);
    await saveCompra({ id: null, data: new Date().toISOString().split('T')[0], fornecedor: fornecedor.nome, descricao: `Planejado - ${fornecedor.nome}`, valor: 0, condicaoPagamento: "", dataPrevistaFaturamento: "" });
    await carregarDadosDoBanco();
    setIsLoading(false);
    alert("Compra criada na aba Lançamentos! Edite o valor lá.");
  };

  const formatarValor = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatarValorTooltip = (value: number | undefined) => (value === undefined || isNaN(value)) ? '' : formatarValor(value);

  // --- LOGIN UI ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
          <div className="text-center mb-8">
             <h1 className="text-4xl font-serif text-rose-400 mb-2 italic" style={{fontFamily: 'serif'}}>Walcle / Hadoli</h1>
             <p className="text-gray-400 text-sm tracking-widest uppercase">Gestão de Compras</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Usuário</label>
              <input type="text" value={loginForm.usuario} onChange={e => setLoginForm({...loginForm, usuario: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition outline-none" placeholder="Digite seu usuário" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Senha</label>
              <input type="password" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition outline-none" placeholder="Digite sua senha" required />
            </div>
            {loginError && <div className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg border border-rose-100">{loginError}</div>}
            <button type="submit" className="w-full py-4 bg-black text-white rounded-lg font-bold hover:bg-gray-900 transition shadow-lg text-sm uppercase tracking-wide">Acessar Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  // --- APP PRINCIPAL ---
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-serif text-rose-400 italic tracking-tight" style={{fontFamily: 'serif'}}>Walcle / Hadoli</h1>
             <span className="hidden md:block w-px h-6 bg-gray-200 mx-2"></span>
             <p className="hidden md:block text-xs text-gray-400 uppercase tracking-widest mt-1">Controle de Compras</p>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right hidden md:block">
               <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Gasto</p>
               <p className="text-lg font-bold text-gray-900">{formatarValor(totalGasto)}</p>
             </div>
             <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 transition p-2">
                <LogOut size={20} />
             </button>
          </div>
        </div>
        {isLoading && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-100 overflow-hidden"><div className="h-full bg-rose-400 animate-pulse w-1/3 mx-auto"></div></div>}
      </header>

      {/* MENU NAVEGAÇÃO */}
      <div className="bg-white border-b border-gray-100 sticky top-[73px] z-40">
        <div className="container mx-auto px-6 flex gap-8 overflow-x-auto">
          {[
              { id: "dashboard", label: "Visão Geral", icon: TrendingUp },
              { id: "lancamentos", label: "Lançamentos", icon: ShoppingCart },
              { id: "fornecedores", label: "Fornecedores", icon: Users },
              { id: "planejamento", label: "Planejamento", icon: Target }
          ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setAbaAtiva(tab.id as Aba)} 
                className={`py-4 text-sm font-bold uppercase tracking-wide flex items-center gap-2 border-b-2 transition-all ${abaAtiva === tab.id ? 'border-rose-400 text-black' : 'border-transparent text-gray-400 hover:text-rose-400'}`}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <main className="container mx-auto px-6 py-10 pb-24">
        
        {/* === DASHBOARD === */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filtros */}
            <div className="flex justify-between items-center flex-wrap gap-4">
               <h2 className="text-2xl font-light text-black">Resumo de Performance</h2>
               <div className="flex gap-3">
                 <select value={filtroTempo} onChange={e => setFiltroTempo(e.target.value as any)} className="bg-gray-50 border-none text-sm font-bold text-gray-700 py-2 px-4 rounded-full focus:ring-2 focus:ring-rose-200 cursor-pointer hover:bg-gray-100 transition">
                    <option value="mensal">Mensal</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                 </select>
                 <select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)} className="bg-gray-50 border-none text-sm font-bold text-gray-700 py-2 px-4 rounded-full focus:ring-2 focus:ring-rose-200 cursor-pointer hover:bg-gray-100 transition">
                    <option value="todos">Todos Fornecedores</option>
                    {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                 </select>
               </div>
            </div>
            
            {/* Cards de KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Volume de Compras</p>
                    <p className="text-3xl font-light text-black">{comprasParaGraficos.length}</p>
                    <div className="h-1 w-10 bg-rose-400 mt-4"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-3xl font-light text-black">{formatarValor(totalGasto / (comprasParaGraficos.length || 1))}</p>
                    <div className="h-1 w-10 bg-black mt-4"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Maior Fornecedor</p>
                    <p className="text-xl font-light text-black truncate">{dadosRanking[0]?.nome || "N/A"}</p>
                    <p className="text-xs text-rose-400 font-bold mt-1">{formatarValor(dadosRanking[0]?.total || 0)}</p>
                </div>
            </div>
            
            {/* Gráficos */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ranking (BarChart preto) */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-6">Ranking de Gastos</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosRanking}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis 
                        dataKey="nome" 
                        tick={{fontSize: 11, fill: '#000000', fontWeight: 'bold'}} 
                        interval={0} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false}
                    />
                    <YAxis 
                        tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}}
                        axisLine={false} tickLine={false} 
                    />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#000' }} itemStyle={{color: '#000'}}/>
                    <Bar dataKey="total" fill={HADOLI_BLACK} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pizza */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-6">Distribuição (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={dadosPizza} cx="50%" cy="50%" outerRadius={100} 
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                        fill="#8884d8"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#000' }} itemStyle={{color: '#000'}} />
                    </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Evolução (AreaChart Rosa) */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                <h3 className="text-lg font-bold text-black mb-6">Evolução Temporal</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dadosEvolucao}>
                    <defs>
                      <linearGradient id="colorTotalPink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={HADOLI_PINK} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={HADOLI_PINK} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                    <XAxis 
                        dataKey="periodo" 
                        tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}}
                        axisLine={false} tickLine={false} dy={10} 
                    />
                    <YAxis 
                        tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}}
                        axisLine={false} tickLine={false} 
                    />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#000' }} itemStyle={{color: '#000'}} />
                    <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke={HADOLI_PINK} 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorTotalPink)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* === ABA LANÇAMENTOS === */}
        {abaAtiva === "lancamentos" && (
          <div className="space-y-8 animate-in fade-in duration-500">
             
             {/* Gráfico de Resumo de Pagamentos */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2"><CreditCard size={18}/> Gastos por Pagamento</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart layout="vertical" data={dadosGraficoPagamento}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#000', fontWeight: 'bold'}} axisLine={false} tickLine={false}/>
                        <Tooltip formatter={formatarValorTooltip} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', color: '#000'}} itemStyle={{color: '#000'}} />
                        <Bar dataKey="value" fill={HADOLI_DARK_GRAY} radius={[0, 4, 4, 0]} barSize={20} />
                     </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="grid lg:grid-cols-3 gap-8">
                {/* Formulário */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-bold text-black mb-6 text-lg flex items-center gap-2">
                        {editandoCompra ? <Edit2 size={20} className="text-rose-400"/> : <Plus size={20} className="text-rose-400"/>}
                        {editandoCompra ? 'Editar' : 'Novo Lançamento'}
                    </h3>
                    <form onSubmit={handleSalvarCompra} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Data</label>
                            <input type="date" value={formCompra.data} onChange={e => setFormCompra({...formCompra, data: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Fornecedor</label>
                            <select value={formCompra.fornecedor} onChange={e => setFormCompra({...formCompra, fornecedor: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" required>
                                <option value="">Selecione...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Descrição</label>
                            <input type="text" value={formCompra.descricao} onChange={e => setFormCompra({...formCompra, descricao: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" placeholder="Ex: Tecido" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Valor</label>
                                <input type="number" step="0.01" value={formCompra.valor} onChange={e => setFormCompra({...formCompra, valor: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" placeholder="0.00" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Pagamento</label>
                                <select value={formCompra.condicaoPagamento} onChange={e => setFormCompra({...formCompra, condicaoPagamento: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200">
                                    <option value="">Selecione...</option>
                                    {CONDICOES_PAGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition flex justify-center gap-2 items-center shadow-lg mt-4">
                            {isLoading ? <Loader2 className="animate-spin"/> : (editandoCompra ? <Save size={18}/> : <Plus size={18}/>)} 
                            {editandoCompra ? 'Salvar Alterações' : 'Adicionar Compra'}
                        </button>
                        {editandoCompra && <button type="button" onClick={cancelarEdicaoCompra} className="w-full text-gray-500 text-sm hover:text-black mt-2 underline">Cancelar Edição</button>}
                    </form>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="font-bold text-gray-700">Histórico Recente</span>
                        <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600 font-medium">{compras.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                                <tr><th className="p-4 pl-6 font-bold">Data</th><th className="p-4 font-bold">Fornecedor</th><th className="p-4 font-bold">Descrição</th><th className="p-4 text-right font-bold">Valor</th><th className="p-4 text-center font-bold">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {compras.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nenhum registro encontrado.</td></tr>}
                                {[...compras].reverse().map(c => (
                                    <tr key={c.id} className="hover:bg-rose-50/30 transition group">
                                        <td className="p-4 pl-6 text-gray-600">{formatarData(c.data)}</td>
                                        <td className="p-4 text-black font-bold">{c.fornecedor}</td>
                                        <td className="p-4 text-gray-600">{c.descricao}</td>
                                        <td className="p-4 text-right font-bold text-rose-500">{formatarValor(c.valor)}</td>
                                        <td className="p-4 flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition">
                                            <button onClick={() => iniciarEdicaoCompra(c)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                            <button onClick={() => handleRemoverCompra(c.id)} className="text-gray-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* === ABA FORNECEDORES === */}
        {abaAtiva === "fornecedores" && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-black mb-4">Top 5 Fornecedores (Volume)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={dadosTop5Fornecedores}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="nome" type="category" width={120} tick={{fontSize: 11, fontWeight: 'bold', fill: '#000'}} axisLine={false} tickLine={false}/>
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', color: '#000'}} itemStyle={{color: '#000'}} formatter={formatarValorTooltip} />
                            <Bar dataKey="total" fill={HADOLI_BLACK} radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-black text-lg">{editandoFornecedor ? 'Editar' : 'Novo'} Fornecedor</h3>
                        <button onClick={handleRestaurarFornecedores} title="Restaurar Padrão" className="text-gray-400 hover:text-rose-500"><RefreshCcw size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        <input value={formFornecedor.nome} onChange={e => setFormFornecedor({...formFornecedor, nome: e.target.value})} placeholder="Nome da Empresa" className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" />
                        <input value={formFornecedor.contato} onChange={e => setFormFornecedor({...formFornecedor, contato: e.target.value})} placeholder="Email / Telefone" className="w-full bg-gray-50 border-none p-3 rounded-lg text-black focus:ring-2 focus:ring-rose-200" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Categorias</p>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIAS_PADRAO.map(cat => (
                                    <button key={cat} onClick={() => toggleCategoriaFornecedor(cat)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${formFornecedor.categorias_fornecidas.includes(cat) ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleSalvarFornecedor} disabled={isLoading} className="flex-1 bg-black text-white p-3 rounded-lg font-bold hover:bg-gray-900 transition flex justify-center gap-2">
                                {isLoading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Salvar
                            </button>
                            {editandoFornecedor && <button onClick={cancelarEdicaoFornecedor} className="bg-gray-100 text-gray-600 p-3 rounded-lg font-bold hover:bg-gray-200">X</button>}
                        </div>
                    </div>
                 </div>
                 <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
                    {fornecedores.map(f => (
                        <div key={f.id} className="bg-white p-5 rounded-xl border border-gray-100 hover:border-rose-200 hover:shadow-md transition group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => iniciarEdicaoFornecedor(f)} className="text-blue-500 bg-blue-50 p-1.5 rounded-full"><Edit2 size={14}/></button>
                                <button onClick={() => handleRemoverFornecedor(f.id)} className="text-rose-500 bg-rose-50 p-1.5 rounded-full"><Trash2 size={14}/></button>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-1">{f.nome}</h4>
                            <p className="text-xs text-gray-500 mb-3">{f.contato || '-'}</p>
                            <div className="flex flex-wrap gap-1">
                                {f.categorias_fornecidas.map(c => (
                                    <span key={c} className="text-[9px] uppercase tracking-wider bg-gray-50 text-gray-600 px-2 py-1 rounded-md font-bold">{c}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {/* === ABA PLANEJAMENTO === */}
        {abaAtiva === "planejamento" && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
                <div className="z-10">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Status Mensal ({mesAtual})</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-serif italic text-rose-400">{checklistFornecedores.filter(c => c.mes === mesAtual && c.comprado).length}</p>
                        <p className="text-xl text-gray-300 font-light">/ {fornecedores.length}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Fornecedores comprados este mês</p>
                </div>
                <div className="h-32 w-32">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={dadosPlanejamento} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                <Cell fill={HADOLI_PINK} />
                                <Cell fill="#f3f4f6" />
                            </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckSquare size={18} className="text-rose-400"/> Checklist de Compras</h3>
                 </div>
                 <div className="divide-y divide-gray-50">
                    {fornecedores.map(f => {
                       const item = checklistFornecedores.find(c => c.fornecedorId === f.id && c.mes === mesAtual);
                       const comprado = item?.comprado || false;
                       return (
                          <div key={f.id} className={`p-5 flex items-center gap-4 transition ${comprado ? 'bg-gray-50' : 'hover:bg-white'}`}>
                             <button 
                                onClick={() => handleToggleChecklist(f.id)} 
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${comprado ? 'bg-rose-400 border-rose-400 text-white' : 'border-gray-300 text-transparent hover:border-rose-300'}`}
                             >
                                <CheckSquare size={14} fill="currentColor" />
                             </button>
                             <div className="flex-1 flex justify-between items-center">
                                <div>
                                   <span className={`font-bold text-sm ${comprado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{f.nome}</span>
                                   <p className="text-xs text-gray-400 mt-0.5">{comprado ? "Concluído" : "Pendente"}</p>
                                </div>
                                {!comprado && (
                                   <button onClick={() => criarCompraDoPlanejamento(f.id)} className="text-xs bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-full font-bold transition shadow-md">
                                       Gerar Pedido
                                   </button>
                                )}
                             </div>
                          </div>
                       )
                    })}
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}