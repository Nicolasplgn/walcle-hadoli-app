"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { 
  ShoppingCart, DollarSign, Users, TrendingUp, Plus, Trash2, Edit2, Save, X, 
  Target, Lock, Loader2, LogOut, RefreshCcw, CheckSquare 
} from "lucide-react";
import { 
  getFornecedores, saveFornecedor, deleteFornecedor, getCompras, 
  saveCompra, deleteCompra, getChecklist, saveChecklistItem, 
  restaurarFornecedoresPadrao 
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
  mes: string;
}

type Aba = "dashboard" | "lancamentos" | "fornecedores" | "planejamento";
type FiltroTempo = "mensal" | "semestral" | "anual";

const COLORS = ['#003366', '#004080', '#004d99', '#0059b3', '#0066cc', '#3385d6', '#6699e0', '#99b3eb', '#cce0f5', '#e6f0fa'];
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

  const dadosEvolucaoObj = comprasParaGraficos.reduce((acc: any, compra) => {
    const data = new Date(compra.data);
    let chave: string, ts: number;
    
    if (filtroTempo === "mensal") {
      chave = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      ts = new Date(data.getFullYear(), data.getMonth(), 1).getTime();
    } else if (filtroTempo === "semestral") {
      const semestre = Math.floor(data.getMonth() / 6);
      chave = `${semestre + 1}º Sem ${data.getFullYear()}`;
      ts = new Date(data.getFullYear(), semestre * 6, 1).getTime();
    } else {
      chave = data.getFullYear().toString();
      ts = new Date(data.getFullYear(), 0, 1).getTime();
    }
    if (!acc[chave]) acc[chave] = { total: 0, timestamp: ts };
    acc[chave].total += compra.valor;
    return acc;
  }, {});
  const dadosEvolucao = Object.values(dadosEvolucaoObj).sort((a: any, b: any) => a.timestamp - b.timestamp).map((d: any) => ({ periodo: d.key || d.periodo || 'Periodo', total: d.total, ...d }));

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
    setFormCompra({ 
        id: "", 
        data: new Date().toISOString().split('T')[0], 
        fornecedor: "", 
        descricao: "", 
        valor: "", 
        condicaoPagamento: "", 
        dataPrevistaFaturamento: "" 
    });
    setEditandoCompra(false);
    setIsLoading(false);
  };

  const iniciarEdicaoCompra = (c: Compra) => {
    setFormCompra({
      id: c.id,
      data: c.data,
      fornecedor: c.fornecedor,
      descricao: c.descricao,
      valor: c.valor.toString(),
      condicaoPagamento: c.condicaoPagamento,
      dataPrevistaFaturamento: c.dataPrevistaFaturamento
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
        dataPrevistaFaturamento: "" 
    });
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
    const mesAtual = new Date().toISOString().slice(0, 7);
    const itemExistente = checklistFornecedores.find(item => item.fornecedorId === fornecedorId && item.mes === mesAtual);
    const novoStatus = !itemExistente?.comprado;
    
    const novosItens = [...checklistFornecedores];
    if (itemExistente) {
        const index = novosItens.findIndex(i => i === itemExistente);
        novosItens[index] = { ...itemExistente, comprado: novoStatus };
    } else {
        novosItens.push({ fornecedorId, mes: mesAtual, comprado: true, compraId: null, observacao: "" });
    }
    setChecklistFornecedores(novosItens);

    await saveChecklistItem({
        fornecedorId,
        mes: mesAtual,
        comprado: novoStatus,
        compraId: itemExistente?.compraId || null,
        observacao: itemExistente?.observacao || ""
    });
  };

  const criarCompraDoPlanejamento = async (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (!fornecedor) return;
    
    setIsLoading(true);
    await saveCompra({ 
        id: null, 
        data: new Date().toISOString().split('T')[0], 
        fornecedor: fornecedor.nome, 
        descricao: `Planejado - ${fornecedor.nome}`, 
        valor: 0, 
        condicaoPagamento: "", 
        dataPrevistaFaturamento: "" 
    });
    await carregarDadosDoBanco();
    setIsLoading(false);
    
    alert("Compra criada na aba Lançamentos! Edite o valor lá.");
  };

  const formatarValor = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatarValorTooltip = (value: number | undefined) => (value === undefined || isNaN(value)) ? '' : formatarValor(value);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4"><div className="bg-[#003366] p-3 rounded-full"><Lock className="w-8 h-8 text-white" /></div></div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Walcle / Hadoli</h1>
            <p className="text-gray-600">ERP de Compras</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Usuário</label>
              <input type="text" value={loginForm.usuario} onChange={e => setLoginForm({...loginForm, usuario: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-[#003366]" placeholder="Digite seu usuário" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Senha</label>
              <input type="password" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-[#003366]" placeholder="Digite sua senha" required />
            </div>
            {loginError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">{loginError}</div>}
            <button type="submit" className="w-full py-3 bg-[#003366] text-white rounded-lg font-bold hover:bg-[#004080] transition">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#003366] text-white shadow-lg sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Walcle / Hadoli</h1>
            <p className="text-blue-200 text-sm">ERP de Compras</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-blue-900/50 px-4 py-2 rounded-lg text-right hidden md:block border border-blue-800">
               <div className="flex items-center gap-2">
                   <DollarSign className="w-4 h-4 text-green-400"/>
                   <div>
                       <p className="text-[10px] text-blue-200 uppercase tracking-wider">Total Acumulado</p>
                       <p className="text-xl font-bold">{formatarValor(totalGasto)}</p>
                   </div>
               </div>
             </div>
             <button onClick={handleLogout} className="bg-red-600/80 hover:bg-red-600 p-2 rounded-lg text-white flex items-center gap-2 text-sm font-bold transition shadow-md">
                <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
             </button>
          </div>
        </div>
        {isLoading && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-300 overflow-hidden"><div className="h-full bg-yellow-400 animate-pulse w-1/2 mx-auto"></div></div>}
      </header>

      <nav className="bg-white shadow-md border-b sticky top-[76px] z-10">
        <div className="container mx-auto px-4 flex gap-2 overflow-x-auto pb-1 pt-1">
          {[
              { id: "dashboard", label: "Dashboard", icon: TrendingUp },
              { id: "lancamentos", label: "Lançamentos", icon: ShoppingCart },
              { id: "fornecedores", label: "Fornecedores", icon: Users },
              { id: "planejamento", label: "Planejamento", icon: Target }
          ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setAbaAtiva(tab.id as Aba)} 
                className={`py-3 px-4 font-bold capitalize border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${abaAtiva === tab.id ? 'border-[#003366] text-[#003366] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <tab.icon size={18}/> {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 pb-20">
        
        {abaAtiva === "dashboard" && (
          <div className="space-y-6">
            <div className="flex justify-between flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <h2 className="text-2xl font-bold text-black flex items-center gap-2"><TrendingUp size={24}/> Visão Geral</h2>
               <div className="flex gap-2">
                 <select value={filtroTempo} onChange={e => setFiltroTempo(e.target.value as any)} className="border p-2 rounded text-black font-medium focus:ring-2 focus:ring-[#003366]">
                    <option value="mensal">Mensal</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                 </select>
                 <select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)} className="border p-2 rounded text-black font-medium focus:ring-2 focus:ring-[#003366]">
                    <option value="todos">Todos Fornecedores</option>
                    {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                 </select>
               </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow h-[400px] border border-gray-100">
                <h3 className="font-bold text-black mb-6 flex items-center gap-2 border-b pb-2">Ranking de Gastos</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={dadosRanking}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="nome" tick={{fontSize: 11, fill: '#000', fontWeight: 'bold'}} height={60} interval={0} angle={-30} textAnchor="end"/>
                    <YAxis tick={{fontSize: 12, fill: '#000', fontWeight: 'bold'}} />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{ borderRadius: '8px', border: '1px solid #000', color: '#000' }} itemStyle={{color: '#000'}} />
                    <Bar dataKey="total" fill="#003366" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow h-[400px] border border-gray-100">
                <h3 className="font-bold text-black mb-6 flex items-center gap-2 border-b pb-2">Distribuição (%)</h3>
                <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie 
                        data={dadosPizza} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={false} 
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                        outerRadius={100} 
                        fill="#8884d8" 
                        dataKey="value"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatarValorTooltip} contentStyle={{color: '#000', border: '1px solid #000'}} itemStyle={{color: '#000'}} />
                      <Legend wrapperStyle={{fontSize: '12px', color: '#000', fontWeight: 'bold'}}/>
                    </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow h-[400px] border border-gray-100 md:col-span-2">
                <h3 className="font-bold text-black mb-6 flex items-center gap-2 border-b pb-2">Evolução Temporal</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={dadosEvolucao}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="periodo" tick={{fontSize: 12, fill: '#000', fontWeight: 'bold'}} />
                    <YAxis tick={{fontSize: 12, fill: '#000', fontWeight: 'bold'}} />
                    <Tooltip formatter={formatarValorTooltip} contentStyle={{color: '#000', border: '1px solid #000'}} itemStyle={{color: '#000'}} />
                    <Legend wrapperStyle={{color: '#000', fontWeight: 'bold'}} />
                    <Line type="monotone" dataKey="total" stroke="#003366" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === "lancamentos" && (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <h3 className="font-bold text-black mb-6 text-lg flex items-center gap-2 border-b pb-2">
                    {editandoCompra ? <Edit2 size={20}/> : <Plus size={20}/>}
                    {editandoCompra ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <form onSubmit={handleSalvarCompra} className="grid md:grid-cols-2 gap-6">
                   <div>
                       <label className="block text-sm font-bold text-gray-800 mb-1">Data</label>
                       <input type="date" value={formCompra.data} onChange={e => setFormCompra({...formCompra, data: e.target.value})} className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" required />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-800 mb-1">Fornecedor</label>
                       <select value={formCompra.fornecedor} onChange={e => setFormCompra({...formCompra, fornecedor: e.target.value})} className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" required>
                          <option value="">Selecione...</option>
                          {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                       </select>
                   </div>
                   <div className="md:col-span-2">
                       <label className="block text-sm font-bold text-gray-800 mb-1">Descrição</label>
                       <input type="text" value={formCompra.descricao} onChange={e => setFormCompra({...formCompra, descricao: e.target.value})} placeholder="Ex: Compra de matéria-prima" className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" required />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-800 mb-1">Valor (R$)</label>
                       <input type="number" step="0.01" value={formCompra.valor} onChange={e => setFormCompra({...formCompra, valor: e.target.value})} placeholder="0.00" className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" required />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-800 mb-1">Pagamento</label>
                       <select value={formCompra.condicaoPagamento} onChange={e => setFormCompra({...formCompra, condicaoPagamento: e.target.value})} className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]">
                          <option value="">Selecione...</option>
                          {CONDICOES_PAGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                   </div>
                   
                   <div className="md:col-span-2 flex gap-3 mt-4">
                       <button type="submit" disabled={isLoading} className="flex-1 bg-[#003366] text-white p-3 rounded font-bold hover:bg-blue-900 transition flex justify-center gap-2 items-center">
                         {isLoading ? <Loader2 className="animate-spin"/> : (editandoCompra ? <Save size={18}/> : <Plus size={18}/>)} 
                         {editandoCompra ? 'Salvar Alterações' : 'Adicionar Compra'}
                       </button>
                       {editandoCompra && (
                           <button type="button" onClick={cancelarEdicaoCompra} className="bg-gray-200 text-gray-800 p-3 rounded font-bold hover:bg-gray-300 transition">
                               Cancelar
                           </button>
                       )}
                   </div>
                </form>
             </div>

             <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="p-4 bg-gray-50 border-b font-bold text-black flex justify-between items-center">
                    <span>Histórico Recente</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-black font-bold">{compras.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-black uppercase text-xs font-bold">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Fornecedor</th>
                            <th className="p-4">Descrição</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {compras.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">Sem registros encontrados.</td></tr>}
                        {[...compras].reverse().map(c => (
                            <tr key={c.id} className="hover:bg-blue-50/50 transition cursor-default">
                                <td className="p-4 text-black font-medium">{formatarData(c.data)}</td>
                                <td className="p-4 text-black font-bold">{c.fornecedor}</td>
                                <td className="p-4 text-black">{c.descricao}</td>
                                <td className="p-4 text-right font-bold text-[#003366]">{formatarValor(c.valor)}</td>
                                <td className="p-4 flex justify-center gap-2">
                                <button onClick={() => iniciarEdicaoCompra(c)} className="text-blue-700 hover:bg-blue-100 p-1.5 rounded" title="Editar"><Edit2 size={16}/></button>
                                <button onClick={() => handleRemoverCompra(c.id)} className="text-red-700 hover:bg-red-100 p-1.5 rounded" title="Excluir"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {/* === ABA FORNECEDORES === */}
        {abaAtiva === "fornecedores" && (
           <div className="space-y-6">
              <div className="flex justify-end">
                  <button onClick={handleRestaurarFornecedores} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 text-black font-bold px-4 py-2 rounded shadow-sm transition">
                      <RefreshCcw size={14}/> Restaurar Padrão
                  </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                 <h3 className="font-bold text-black mb-6 flex items-center gap-2 border-b pb-2">
                     <Users size={20}/> {editandoFornecedor ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
                 </h3>
                 <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Nome da Empresa</label>
                        <input value={formFornecedor.nome} onChange={e => setFormFornecedor({...formFornecedor, nome: e.target.value})} placeholder="Ex: Zanoti" className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Contato</label>
                        <input value={formFornecedor.contato} onChange={e => setFormFornecedor({...formFornecedor, contato: e.target.value})} placeholder="Email / Telefone" className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-[#003366]" />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-800 mb-2">Categorias Fornecidas</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIAS_PADRAO.map(cat => (
                                <button key={cat} onClick={() => toggleCategoriaFornecedor(cat)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${formFornecedor.categorias_fornecidas.includes(cat) ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 flex gap-3 mt-2">
                        <button onClick={handleSalvarFornecedor} disabled={isLoading} className="flex-1 bg-[#003366] text-white p-3 rounded font-bold hover:bg-blue-900 transition flex justify-center items-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                            {editandoFornecedor ? 'Salvar' : 'Cadastrar'}
                        </button>
                        {editandoFornecedor && (
                            <button onClick={cancelarEdicaoFornecedor} className="bg-gray-200 text-gray-800 p-3 rounded font-bold hover:bg-gray-300 transition">
                                Cancelar
                            </button>
                        )}
                    </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {fornecedores.map(f => (
                    <div key={f.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex justify-between items-start hover:shadow-md transition">
                       <div>
                          <h4 className="font-bold text-black text-lg">{f.nome}</h4>
                          <p className="text-sm text-gray-700 mb-3">{f.contato || 'Sem contato registrado'}</p>
                          <div className="flex flex-wrap gap-1">
                              {f.categorias_fornecidas.map(c => (
                                  <span key={c} className="text-[10px] bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200 font-bold">
                                      {c}
                                  </span>
                              ))}
                          </div>
                       </div>
                       <div className="flex gap-1">
                          <button onClick={() => iniciarEdicaoFornecedor(f)} className="text-blue-700 hover:bg-blue-100 p-2 rounded transition"><Edit2 size={18}/></button>
                          <button onClick={() => handleRemoverFornecedor(f.id)} className="text-red-700 hover:bg-red-100 p-2 rounded transition"><Trash2 size={18}/></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* === ABA PLANEJAMENTO === */}
        {abaAtiva === "planejamento" && (
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-xs uppercase font-bold tracking-wider">Progresso de Compras ({mesAtual})</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-[#003366]">
                            {checklistFornecedores.filter(c => c.mes === mesAtual && c.comprado).length}
                            <span className="text-black text-lg"> / {fornecedores.length}</span>
                        </p>
                    </div>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-[#003366]">
                    <Target size={24}/>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                 <div className="p-4 border-b bg-gray-50 font-bold text-black flex items-center gap-2">
                     <CheckSquare size={18}/> Checklist Mensal
                 </div>
                 <div className="divide-y">
                    {fornecedores.map(f => {
                       const item = checklistFornecedores.find(c => c.fornecedorId === f.id && c.mes === mesAtual);
                       const comprado = item?.comprado || false;
                       return (
                          <div key={f.id} className={`p-4 flex items-start gap-4 transition ${comprado ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}>
                             <input 
                                type="checkbox" 
                                checked={comprado} 
                                onChange={() => handleToggleChecklist(f.id)} 
                                className="mt-1 w-6 h-6 text-[#003366] rounded focus:ring-[#003366] cursor-pointer" 
                             />
                             <div className="flex-1">
                                <div className="flex justify-between items-center">
                                   <span className={`font-bold text-lg ${comprado ? 'text-green-900 line-through decoration-green-900/50' : 'text-black'}`}>{f.nome}</span>
                                   {comprado ? (
                                       <span className="text-xs bg-green-200 text-green-900 px-3 py-1 rounded-full font-bold">COMPRADO</span>
                                   ) : (
                                       <button onClick={() => criarCompraDoPlanejamento(f.id)} className="text-xs bg-[#003366] hover:bg-blue-900 text-white px-3 py-1.5 rounded font-medium transition shadow-sm">
                                           + Gerar Compra
                                       </button>
                                   )}
                                </div>
                                <div className="mt-1 text-sm text-gray-700">
                                    {comprado ? "Já registrado no sistema." : "Pendente de compra para este mês."}
                                </div>
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