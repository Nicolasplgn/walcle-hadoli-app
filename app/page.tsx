"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  ShoppingCart, DollarSign, Users, TrendingUp, Plus, Trash2, Edit2, Save, X, 
  Target, Lock, Loader2, LogOut, RefreshCcw, CheckSquare, Calendar, CreditCard,
  Package, PackageCheck, Truck, AlertCircle
} from "lucide-react";

import { 
  getFornecedores, saveFornecedor, deleteFornecedor, 
  getCompras, saveCompra, deleteCompra, 
  getChecklist, saveChecklistItem, restaurarFornecedoresPadrao,
  toggleStatusEntrega
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
  entregue: boolean;
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
const COLORS =['#000000', '#333333', '#fb7185', '#9ca3af', '#4b5563', '#e11d48', '#f43f5e'];
const HADOLI_PINK = "#fb7185"; 
const HADOLI_BLACK = "#000000";
const HADOLI_DARK_GRAY = "#374151";

const CATEGORIAS_PADRAO =["Matéria-prima", "Embalagem", "Serviços", "Equipamentos", "Logística", "Outros"];
const CONDICOES_PAGAMENTO = ["Pix", "Boleto", "Cartão", "Transferência"];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const[loginForm, setLoginForm] = useState({ usuario: "", senha: "" });
  const[loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const[abaAtiva, setAbaAtiva] = useState<Aba>("dashboard");
  const[fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [checklistFornecedores, setChecklistFornecedores] = useState<ChecklistFornecedor[]>([]);
  
  // --- ESTADOS DE FILTRO ---
  const [mesGlobal, setMesGlobal] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>("mensal");
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("todos");
  
  // Forms
  const[formFornecedor, setFormFornecedor] = useState({
    id: "",
    nome: "",
    categorias_fornecidas: [] as string[],
    contato: "",
  });
  const[editandoFornecedor, setEditandoFornecedor] = useState(false);
  
  const[formCompra, setFormCompra] = useState({
    id: "",
    data: new Date().toISOString().split('T')[0],
    fornecedor: "",
    descricao: "",
    valor: "",
    condicaoPagamento: "",
    dataPrevistaFaturamento: "",
  });
  const[editandoCompra, setEditandoCompra] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  },[]);

  const carregarDadosDoBanco = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const[dadosFornecedores, dadosCompras, dadosChecklist] = await Promise.all([
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

  // --- LÓGICA DE DADOS (CALCULADA MATEMATICAMENTE SEM ERRO DE FUSO) ---

  // 1. Dados para ABA LANÇAMENTOS (Somente o mês global)
  const comprasDoMesGlobal = compras.filter(c => c.data.startsWith(mesGlobal));
  
  // 2. Dados para ABA DASHBOARD (Aplica o Filtro de Tempo baseando no mesGlobal)
  const getComprasDashboard = () => {
    const [anoStr, mesStr] = mesGlobal.split('-');
    const anoFim = parseInt(anoStr);
    const mesFim = parseInt(mesStr); // 1 a 12

    const dataFimNum = anoFim * 100 + mesFim; // Ex: 202604
    let dataInicioNum = 0;

    if (filtroTempo === "mensal") {
       dataInicioNum = anoFim * 100 + mesFim; // Apenas o próprio mês
    } else if (filtroTempo === "semestral") {
       let m = mesFim - 5;
       let a = anoFim;
       if (m <= 0) { m += 12; a -= 1; }
       dataInicioNum = a * 100 + m;
    } else if (filtroTempo === "anual") {
       let m = mesFim - 11;
       let a = anoFim;
       if (m <= 0) { m += 12; a -= 1; }
       dataInicioNum = a * 100 + m;
    }

    return compras.filter(c => {
       if (filtroFornecedor !== "todos" && c.fornecedor !== filtroFornecedor) return false;
       
       const [cAno, cMes] = c.data.split('-').map(Number);
       const cNum = cAno * 100 + cMes;
       
       return cNum >= dataInicioNum && cNum <= dataFimNum;
    });
  };

  const comprasDashboard = getComprasDashboard();
  const totalGastoDashboard = comprasDashboard.reduce((acc, c) => acc + c.valor, 0);

  // 3. Dados para ABA PLANEJAMENTO
  const checklistDoMesGlobal = checklistFornecedores.filter(item => item.mes === mesGlobal);

  // --- GRÁFICOS DASHBOARD ---
  const dadosRanking = fornecedores
    .map(fornecedor => {
      const total = comprasDashboard
        .filter(c => c.fornecedor === fornecedor.nome)
        .reduce((acc, c) => acc + c.valor, 0);
      return { nome: fornecedor.nome, total };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const dadosPizza = dadosRanking.map(item => ({ name: item.nome, value: item.total }));

  // Evolução temporal (Matemática pura para não bugar com dias vazios)
  const gerarDadosEvolucao = () => {
    const mapaValores: Record<string, number> = {};
    comprasDashboard.forEach(c => {
       let chave = c.data; // YYYY-MM-DD
       if (filtroTempo !== "mensal") {
          chave = c.data.slice(0, 7); // YYYY-MM
       }
       if (!mapaValores[chave]) mapaValores[chave] = 0;
       mapaValores[chave] += c.valor;
    });

    const[anoStr, mesStr] = mesGlobal.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const dados =[];

    if (filtroTempo === "mensal") {
        // Preenche do dia 1 até o último dia do mês
        const diasNoMes = new Date(ano, mes, 0).getDate();
        for (let d = 1; d <= diasNoMes; d++) {
            const diaFormatado = String(d).padStart(2, '0');
            const dataChave = `${mesGlobal}-${diaFormatado}`;
            dados.push({
                periodo: `${diaFormatado}/${mesStr}`,
                total: mapaValores[dataChave] || 0
            });
        }
    } else {
        // Preenche os últimos 6 ou 12 meses
        const qtdMeses = filtroTempo === "semestral" ? 6 : 12;
        for (let i = qtdMeses - 1; i >= 0; i--) {
            let m = mes - i;
            let a = ano;
            if (m <= 0) { m += 12; a -= 1; }
            
            const mesFormatado = String(m).padStart(2, '0');
            const dataChave = `${a}-${mesFormatado}`;

            // Pega o nome do mês para o label
            const dateHelper = new Date(a, m - 1, 1);
            const nomeMes = dateHelper.toLocaleDateString('pt-BR', { month: 'short' });
            const nomeAno = dateHelper.toLocaleDateString('pt-BR', { year: '2-digit' });
            const label = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${nomeAno}`;

            dados.push({
                periodo: label,
                total: mapaValores[dataChave] || 0
            });
        }
    }
    return dados;
  };
  const dadosEvolucao = gerarDadosEvolucao();

  const dadosPagamento = comprasDoMesGlobal.reduce((acc: any, compra) => {
    const tipo = compra.condicaoPagamento || "Não informado";
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo] += compra.valor;
    return acc;
  }, {});
  const dadosGraficoPagamento = Object.keys(dadosPagamento).map(key => ({ name: key, value: dadosPagamento[key] }));

  const dadosTop5Fornecedores = [...dadosRanking].sort((a, b) => b.total - a.total).slice(0, 5);

  const metaPlanejamento = fornecedores.length;
  const realizadoPlanejamento = checklistDoMesGlobal.filter(c => c.comprado).length;
  const dadosPlanejamento =[
    { name: "Realizado", value: realizadoPlanejamento },
    { name: "Pendente", value: metaPlanejamento - realizadoPlanejamento }
  ];

  // --- UTILS ---
  const formatarValor = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarData = (d: string) => { if(!d) return ""; const[ano, mes, dia] = d.split('-'); return `${dia}/${mes}/${ano}`; };
  const formatarValorTooltip = (value: number | undefined) => (value === undefined || isNaN(value)) ? '' : formatarValor(value);

  // --- HANDLERS ---
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
    setFormFornecedor({ id: "", nome: "", categorias_fornecidas:[], contato: "" });
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
    setFormFornecedor({ id: "", nome: "", categorias_fornecidas:[], contato: "" });
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
    setFormCompra({ ...c, valor: c.valor.toString(), dataPrevistaFaturamento: c.dataPrevistaFaturamento || "" });
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

  // HANDLER CORRETO PARA A COLUNA DE ENTREGA DO BANCO
  const handleToggleEntrega = async (c: Compra) => {
    const novoStatus = !c.entregue;
    const novasCompras = compras.map(item => item.id === c.id ? { ...item, entregue: novoStatus } : item);
    setCompras(novasCompras);
    await toggleStatusEntrega(c.id, novoStatus);
    await carregarDadosDoBanco();
  };

  const handleToggleChecklist = async (fornecedorId: string) => {
    const itemExistente = checklistDoMesGlobal.find(item => item.fornecedorId === fornecedorId);
    const novoStatus = !itemExistente?.comprado;
    
    const novosItens = [...checklistFornecedores];
    const indexGlobal = novosItens.findIndex(i => i.fornecedorId === fornecedorId && i.mes === mesGlobal);
    
    if (indexGlobal >= 0) {
        novosItens[indexGlobal] = { ...novosItens[indexGlobal], comprado: novoStatus };
    } else {
        novosItens.push({ fornecedorId, mes: mesGlobal, comprado: true, compraId: null, observacao: "" });
    }
    setChecklistFornecedores(novosItens);

    await saveChecklistItem({
        fornecedorId,
        mes: mesGlobal,
        comprado: novoStatus,
        compraId: itemExistente?.compraId || null,
        observacao: itemExistente?.observacao || ""
    });
  };

  const criarCompraDoPlanejamento = async (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (!fornecedor) return;
    setIsLoading(true);
    
    const hoje = new Date().toISOString().split('T')[0];
    const dataCompra = mesGlobal === hoje.slice(0, 7) ? hoje : `${mesGlobal}-01`;

    await saveCompra({ id: null, data: dataCompra, fornecedor: fornecedor.nome, descricao: `Planejado - ${fornecedor.nome}`, valor: 0, condicaoPagamento: "", dataPrevistaFaturamento: "" });
    await carregarDadosDoBanco();
    setIsLoading(false);
    alert("Compra criada na aba Lançamentos!");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
          <div className="text-center mb-8"><h1 className="text-4xl font-serif text-rose-400 mb-2 italic" style={{fontFamily: 'serif'}}>Walcle / Hadoli</h1><p className="text-gray-400 text-sm tracking-widest uppercase">Gestão de Compras</p></div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Usuário</label><input type="text" value={loginForm.usuario} onChange={e => setLoginForm({...loginForm, usuario: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black focus:ring-2 focus:ring-rose-200" required /></div>
            <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Senha</label><input type="password" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black focus:ring-2 focus:ring-rose-200" required /></div>
            {loginError && <div className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg border border-rose-100">{loginError}</div>}
            <button type="submit" className="w-full py-4 bg-black text-white rounded-lg font-bold hover:bg-gray-900 transition shadow-lg text-sm uppercase tracking-wide">Acessar Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* HEADER ORIGINAL */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-serif text-rose-400 italic tracking-tight" style={{fontFamily: 'serif'}}>Walcle / Hadoli</h1>
             <span className="hidden md:block w-px h-6 bg-gray-200 mx-2"></span>
             <p className="hidden md:block text-xs text-gray-400 uppercase tracking-widest mt-1">Controle de Compras</p>
          </div>
          
          {/* SELETOR GLOBAL DE MÊS */}
          <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-full border border-gray-200 shadow-sm hover:border-rose-200 transition">
             <div className="flex items-center gap-2 px-3">
                <Calendar size={16} className="text-rose-400"/>
                <input 
                    type="month" 
                    value={mesGlobal} 
                    onChange={(e) => setMesGlobal(e.target.value)} 
                    className="bg-transparent border-none text-sm font-bold text-gray-800 outline-none cursor-pointer uppercase tracking-wide"
                />
             </div>
             <div className="w-px h-6 bg-gray-200"></div>
             <div className="px-4 text-right">
               <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Total no Painel</p>
               <p className="text-sm font-bold text-gray-900">{formatarValor(totalGastoDashboard)}</p>
             </div>
          </div>

          <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 transition p-2"><LogOut size={20} /></button>
        </div>
        {isLoading && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-100 overflow-hidden"><div className="h-full bg-rose-400 animate-pulse w-1/3 mx-auto"></div></div>}
      </header>

      {/* ABAS ORIGINAIS */}
      <div className="bg-white border-b border-gray-100 sticky top-[80px] z-40">
        <div className="container mx-auto px-6 flex gap-8 overflow-x-auto">
          {[
              { id: "dashboard", label: "Visão Geral", icon: TrendingUp },
              { id: "lancamentos", label: "Lançamentos", icon: ShoppingCart },
              { id: "fornecedores", label: "Fornecedores", icon: Users },
              { id: "planejamento", label: "Planejamento", icon: Target }
          ].map(tab => (
            <button key={tab.id} onClick={() => setAbaAtiva(tab.id as Aba)} className={`py-4 text-sm font-bold uppercase tracking-wide flex items-center gap-2 border-b-2 transition-all ${abaAtiva === tab.id ? 'border-rose-400 text-black' : 'border-transparent text-gray-400 hover:text-rose-400'}`}>
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-6 py-10 pb-24">
        
        {/* === DASHBOARD === */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-500">
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Volume de Compras</p>
                    <p className="text-3xl font-light text-black">{comprasDashboard.length}</p>
                    <div className="h-1 w-10 bg-rose-400 mt-4"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-3xl font-light text-black">{formatarValor(totalGastoDashboard / (comprasDashboard.length || 1))}</p>
                    <div className="h-1 w-10 bg-black mt-4"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Maior Fornecedor</p>
                    <p className="text-xl font-light text-black truncate">{dadosRanking[0]?.nome || "N/A"}</p>
                    <p className="text-xs text-rose-400 font-bold mt-1">{formatarValor(dadosRanking[0]?.total || 0)}</p>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-6">Ranking de Gastos</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosRanking}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="nome" tick={{fontSize: 11, fill: '#000000', fontWeight: 'bold'}} interval={0} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#000' }} itemStyle={{color: '#000'}}/>
                    <Bar dataKey="total" fill={HADOLI_BLACK} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-6">Distribuição (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={dadosPizza} cx="50%" cy="50%" outerRadius={100} 
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                <h3 className="text-lg font-bold text-black mb-6">Evolução Temporal ({mesGlobal})</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dadosEvolucao}>
                    <defs>
                      <linearGradient id="colorTotalPink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={HADOLI_PINK} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={HADOLI_PINK} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                    <XAxis dataKey="periodo" tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{fontSize: 12, fill: '#000000', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#000' }} itemStyle={{color: '#000'}} />
                    <Area type="monotone" dataKey="total" stroke={HADOLI_PINK} strokeWidth={3} fillOpacity={1} fill="url(#colorTotalPink)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* === ABA LANÇAMENTOS === */}
        {abaAtiva === "lancamentos" && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2"><CreditCard size={18}/> Formas de Pagamento ({mesGlobal})</h3>
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
                        <span className="font-bold text-gray-700">Lançamentos de {mesGlobal}</span>
                        <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600 font-medium">{comprasDoMesGlobal.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6 font-bold">Data</th>
                                    <th className="p-4 font-bold">Fornecedor</th>
                                    <th className="p-4 font-bold">Descrição</th>
                                    <th className="p-4 text-right font-bold">Valor</th>
                                    <th className="p-4 text-center font-bold">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {comprasDoMesGlobal.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nenhum registro encontrado neste mês.</td></tr>}
                                {[...comprasDoMesGlobal].reverse().map(c => (
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
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Status Mensal ({mesGlobal})</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-serif italic text-rose-400">{checklistDoMesGlobal.filter(c => c.comprado).length}</p>
                        <p className="text-xl text-gray-300 font-light">/ {fornecedores.length}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Fornecedores acionados este mês</p>
                </div>
                <div className="h-32 w-32">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={dadosPlanejamento} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value" stroke="none">
                                <Cell fill={HADOLI_PINK} />
                                <Cell fill="#f3f4f6" />
                            </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                  {/* COLUNA 1: CHECKLIST */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                     <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                         <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} className="text-black"/> Fazer Pedido</h3>
                     </div>
                     <div className="divide-y divide-gray-50">
                        {fornecedores.map(f => {
                           const item = checklistDoMesGlobal.find(c => c.fornecedorId === f.id);
                           const comprado = item?.comprado || false;
                           
                           return (
                              <div key={f.id} className={`p-5 flex items-center gap-4 transition ${comprado ? 'bg-gray-50 opacity-60' : 'hover:bg-white'}`}>
                                 <button 
                                    onClick={() => handleToggleChecklist(f.id)} 
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${comprado ? 'bg-black border-black text-white' : 'border-gray-300 text-transparent hover:border-black'}`}
                                 >
                                    <CheckSquare size={14} fill="currentColor" />
                                 </button>
                                 <div className="flex-1 flex justify-between items-center">
                                    <span className={`font-bold text-sm ${comprado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{f.nome}</span>
                                    
                                    {!comprado && (
                                       <button onClick={() => criarCompraDoPlanejamento(f.id)} className="text-[10px] uppercase font-bold tracking-wider bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-full transition shadow-md">
                                           Gerar Pedido
                                       </button>
                                    )}
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* COLUNA 2: RECEBIMENTO CORRETO */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                     <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                         <h3 className="font-bold text-gray-800 flex items-center gap-2"><Truck size={18} className="text-rose-400"/> Checagem de Entrega</h3>
                     </div>
                     <div className="divide-y divide-gray-50">
                        {fornecedores
                            .filter(f => checklistDoMesGlobal.find(c => c.fornecedorId === f.id)?.comprado)
                            .map(f => {
                               const compraAssociada = comprasDoMesGlobal.find(c => c.fornecedor === f.nome);
                               const entregue = compraAssociada?.entregue || false;

                               return (
                                  <div key={f.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition">
                                     <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                        {entregue ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>}
                                        {f.nome}
                                     </span>

                                     {compraAssociada ? (
                                         <button 
                                            onClick={() => handleToggleEntrega(compraAssociada)}
                                            className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full transition shadow-md flex items-center gap-1.5 ${
                                                entregue 
                                                ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
                                                : 'bg-black text-white hover:bg-gray-800'
                                            }`}
                                         >
                                             {entregue ? <PackageCheck size={12}/> : <Package size={12}/>}
                                             {entregue ? "Recebido" : "Confirmar"}
                                         </button>
                                     ) : (
                                         <span className="text-[10px] text-gray-400 italic">
                                             Pedido não gerado
                                         </span>
                                     )}
                                  </div>
                               )
                            })
                        }
                        
                        {checklistDoMesGlobal.filter(c => c.comprado).length === 0 && (
                            <div className="p-12 text-center">
                                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3"/>
                                <p className="text-gray-400 text-sm font-bold">Nenhum pedido realizado este mês.</p>
                            </div>
                        )}
                     </div>
                  </div>

              </div>
           </div>
        )}

      </main>
    </div>
  );
}