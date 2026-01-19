'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';

// --- FORNECEDORES ---
export async function getFornecedores() {
  noStore();
  try {
    const { rows } = await sql`SELECT * FROM fornecedores ORDER BY nome ASC`;
    return rows.map(row => ({
      id: row.id,
      nome: row.nome,
      categorias_fornecidas: row.categorias ? row.categorias.split(',') : [],
      contato: row.contato || ""
    }));
  } catch (error) {
    return [];
  }
}

export async function saveFornecedor(fornecedor: { id: string | null, nome: string, categorias_fornecidas: string[], contato: string }) {
  const categoriasString = fornecedor.categorias_fornecidas.join(',');
  try {
    if (fornecedor.id && fornecedor.id.length > 10) { 
      await sql`
        UPDATE fornecedores 
        SET nome = ${fornecedor.nome}, categorias = ${categoriasString}, contato = ${fornecedor.contato}
        WHERE id = ${fornecedor.id}
      `;
    } else {
      await sql`
        INSERT INTO fornecedores (nome, categorias, contato)
        VALUES (${fornecedor.nome}, ${categoriasString}, ${fornecedor.contato})
      `;
    }
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function deleteFornecedor(id: string) {
  try {
    await sql`DELETE FROM fornecedores WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- RESTAURAR PADRÃO ---
export async function restaurarFornecedoresPadrao() {
  const listaInicial = [
    "Delfa", "Zanoti", "Fermoplast", "Modelle", "Águas Cristal",
    "Top Bojos", "Etax", "Mercado (Atacado)", "Midlab", "Mercado Livre"
  ];

  try {
    for (const nome of listaInicial) {
        const { rows } = await sql`SELECT id FROM fornecedores WHERE nome = ${nome}`;
        if (rows.length === 0) {
            await sql`INSERT INTO fornecedores (nome, categorias, contato) VALUES (${nome}, '', '')`;
        }
    }
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- COMPRAS ---
export async function getCompras() {
  noStore();
  try {
    const { rows } = await sql`SELECT * FROM compras ORDER BY data DESC`;
    return rows.map(row => ({
      id: row.id,
      data: row.data.toISOString().split('T')[0],
      fornecedor: row.fornecedor,
      descricao: row.descricao,
      valor: Number(row.valor),
      condicaoPagamento: row.condicao_pagamento || "",
      dataPrevistaFaturamento: row.data_prevista_faturamento ? row.data_prevista_faturamento.toISOString().split('T')[0] : ""
    }));
  } catch (error) {
    return [];
  }
}

export async function saveCompra(compra: any) {
  try {
    const dataFaturamento = compra.dataPrevistaFaturamento || null;

    if (compra.id && compra.id.length > 10) {
      await sql`
        UPDATE compras 
        SET data = ${compra.data}, fornecedor = ${compra.fornecedor}, descricao = ${compra.descricao}, 
            valor = ${compra.valor}, condicao_pagamento = ${compra.condicaoPagamento}, data_prevista_faturamento = ${dataFaturamento}
        WHERE id = ${compra.id}
      `;
    } else {
      await sql`
        INSERT INTO compras (data, fornecedor, descricao, valor, condicao_pagamento, data_prevista_faturamento)
        VALUES (${compra.data}, ${compra.fornecedor}, ${compra.descricao}, ${compra.valor}, ${compra.condicaoPagamento}, ${dataFaturamento})
      `;
    }
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function deleteCompra(id: string) {
  try {
    await sql`DELETE FROM compras WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- CHECKLIST ---
export async function getChecklist() {
  noStore();
  try {
    const { rows } = await sql`SELECT * FROM checklist`;
    return rows.map(row => ({
      fornecedorId: row.fornecedor_id,
      mes: row.mes,
      comprado: row.comprado,
      compraId: row.compra_id,
      observacao: row.observacao || ""
    }));
  } catch (error) {
    return [];
  }
}

export async function saveChecklistItem(item: any) {
  try {
    const { rows } = await sql`
      SELECT id FROM checklist 
      WHERE fornecedor_id = ${item.fornecedorId} AND mes = ${item.mes}
    `;

    if (rows.length > 0) {
      await sql`
        UPDATE checklist 
        SET comprado = ${item.comprado}, compra_id = ${item.compraId}, observacao = ${item.observacao}
        WHERE fornecedor_id = ${item.fornecedorId} AND mes = ${item.mes}
      `;
    } else {
      await sql`
        INSERT INTO checklist (fornecedor_id, mes, comprado, compra_id, observacao)
        VALUES (${item.fornecedorId}, ${item.mes}, ${item.comprado}, ${item.compraId}, ${item.observacao})
      `;
    }
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}