const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzd2jPUr--lqprwdBScKZAWqKvXP7aj6WTyj5gUT89OUull-QpRWgBcTHJKZuZpiMyJgA/exec'
};

let funcionariosCache = [];
let fichasCache = [];
let funcionarioSelecionadoId = null;

/* ---------------------- NAVEGAÇÃO DO MENU LATERAL ---------------------- */

document.querySelectorAll('.sidebar-item').forEach(botao => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('ativo'));
    document.querySelectorAll('.painel').forEach(p => p.style.display = 'none');
    botao.classList.add('ativo');
    document.getElementById(botao.dataset.painel).style.display = 'block';
  });
});

/* ---------------------- CADASTRO DE FUNCIONÁRIO ---------------------- */

document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';

  const nome = document.getElementById('f-nome').value;
  const telefone = document.getElementById('f-telefone').value;

  const payload = {
    action: 'criarFuncionario',
    nome,
    cargo: document.getElementById('f-cargo').value,
    setor: document.getElementById('f-setor').value,
    matricula: document.getElementById('f-matricula').value,
    telefone,
    cpf: document.getElementById('f-cpf').value,
    email: document.getElementById('f-email').value
  };

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const resultado = await res.json();

    if (resultado.success) {
      document.getElementById('resultado-cadastro').innerHTML = '✅ Funcionário cadastrado com sucesso!';
      e.target.reset();
      carregarFuncionarios();
      mostrarLinkTermo_(resultado.termoId, nome, telefone);
    } else {
      alert('Erro: ' + resultado.error);
    }
  } catch (err) {
    alert('Falha ao cadastrar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cadastrar funcionário';
  }
});

function mostrarLinkTermo_(termoId, nome, telefone) {
  if (!termoId) return;
  const link = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}assinar.html?id=${termoId}`;
  document.getElementById('input-link-termo').value = link;

  const mensagem = encodeURIComponent(
    `Olá ${nome}! Antes de receber qualquer EPI, por favor acesse o link abaixo no seu celular e assine o Termo de Responsabilidade:\n${link}`
  );
  const telefoneLimpo = (telefone || '').replace(/\D/g, '');
  document.getElementById('btn-whatsapp-termo').href = telefoneLimpo
    ? `https://wa.me/55${telefoneLimpo}?text=${mensagem}`
    : `https://wa.me/?text=${mensagem}`;

  document.getElementById('resultado-termo').style.display = 'block';
}

document.getElementById('btn-copiar-termo').addEventListener('click', () => {
  const input = document.getElementById('input-link-termo');
  input.select();
  navigator.clipboard.writeText(input.value);
  const btn = document.getElementById('btn-copiar-termo');
  btn.textContent = 'Copiado!';
  setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
});

/* ---------------------- LISTAGEM DE FUNCIONÁRIOS ---------------------- */

async function carregarFuncionarios() {
  const res = await fetch(`${CONFIG.API_URL}?action=funcionarios`);
  funcionariosCache = await res.json();
  const corpo = document.getElementById('corpo-tabela-funcionarios');

  if (!funcionariosCache.length) {
    corpo.innerHTML = '<tr><td colspan="4">Nenhum funcionário cadastrado ainda.</td></tr>';
    return;
  }

  corpo.innerHTML = funcionariosCache.map(f => `
    <tr data-id="${f.id}">
      <td><button type="button" class="link-nome" onclick="abrirEdicaoFuncionario('${f.id}')">${f.nome}</button></td>
      <td>${f.cargo || '-'}</td>
      <td><span class="badge ${f.status === 'Inativo' ? 'pendente' : 'ok'}">${f.status || 'Ativo'}</span></td>
      <td class="linha-acoes">
        <button type="button" class="botao secundario" onclick="verHistorico('${f.id}')">Histórico</button>
      </td>
    </tr>
  `).join('');
}

/* ---------------------- EDIÇÃO COMPLETA DO FUNCIONÁRIO (MODAL) ---------------------- */

function abrirEdicaoFuncionario(funcionarioId) {
  const f = funcionariosCache.find(x => x.id === funcionarioId);
  if (!f) return;

  document.getElementById('ed-id').value = f.id;
  document.getElementById('ed-nome').value = f.nome || '';
  document.getElementById('ed-cargo').value = f.cargo || '';
  document.getElementById('ed-setor').value = f.setor || '';
  document.getElementById('ed-matricula').value = f.matricula || '';
  document.getElementById('ed-telefone').value = f.telefone || '';
  document.getElementById('ed-cpf').value = f.cpf || '';
  document.getElementById('ed-email').value = f.email || '';
  document.getElementById('ed-status').value = f.status === 'Inativo' ? 'Inativo' : 'Ativo';
  document.getElementById('status-edicao').textContent = '';

  document.getElementById('modal-editar-funcionario').style.display = 'flex';
}

function fecharModalEdicao_() {
  document.getElementById('modal-editar-funcionario').style.display = 'none';
}

document.getElementById('btn-fechar-modal').addEventListener('click', fecharModalEdicao_);
document.getElementById('modal-editar-funcionario').addEventListener('click', (e) => {
  if (e.target.id === 'modal-editar-funcionario') fecharModalEdicao_();
});

document.getElementById('form-editar-funcionario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const status = document.getElementById('status-edicao');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const payload = {
    action: 'editarFuncionario',
    id: document.getElementById('ed-id').value,
    nome: document.getElementById('ed-nome').value,
    cargo: document.getElementById('ed-cargo').value,
    setor: document.getElementById('ed-setor').value,
    matricula: document.getElementById('ed-matricula').value,
    telefone: document.getElementById('ed-telefone').value,
    cpf: document.getElementById('ed-cpf').value,
    email: document.getElementById('ed-email').value,
    status: document.getElementById('ed-status').value
  };

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const resultado = await res.json();

    if (resultado.success) {
      status.textContent = '✅ Salvo com sucesso!';
      await carregarFuncionarios();
      setTimeout(fecharModalEdicao_, 700);
    } else {
      status.textContent = '⚠️ ' + resultado.error;
    }
  } catch (err) {
    status.textContent = '⚠️ Falha ao salvar: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar alterações';
  }
});

/* ---------------------- HISTÓRICO DE FICHAS ---------------------- */

async function verHistorico(funcionarioId) {
  funcionarioSelecionadoId = funcionarioId;
  const funcionario = funcionariosCache.find(f => f.id === funcionarioId);

  document.getElementById('secao-historico').style.display = 'block';
  document.getElementById('titulo-historico').textContent = `Histórico de ${funcionario.nome}`;
  document.getElementById('lista-historico').innerHTML = 'Carregando...';
  document.getElementById('status-exportar').textContent = '';
  document.getElementById('filtro-tipo-epi').value = '';
  document.getElementById('filtro-data-inicio').value = '';
  document.getElementById('filtro-data-fim').value = '';
  document.getElementById('secao-historico').scrollIntoView({ behavior: 'smooth' });

  const res = await fetch(`${CONFIG.API_URL}?action=fichas&funcionarioId=${encodeURIComponent(funcionarioId)}`);
  fichasCache = await res.json();

  renderizarHistorico_(fichasCache);
}

function aplicarFiltroHistorico_() {
  const tipoEpi = document.getElementById('filtro-tipo-epi').value.toLowerCase().trim();
  const dataInicio = document.getElementById('filtro-data-inicio').value;
  const dataFim = document.getElementById('filtro-data-fim').value;

  let filtradas = fichasCache;

  if (tipoEpi) {
    filtradas = filtradas.filter(f => {
      const itens = JSON.parse(f.itens || '[]');
      return itens.some(i => (i.nome || '').toLowerCase().includes(tipoEpi));
    });
  }
  if (dataInicio) {
    const inicio = new Date(dataInicio + 'T00:00:00');
    filtradas = filtradas.filter(f => f.assinadoEm && new Date(f.assinadoEm) >= inicio);
  }
  if (dataFim) {
    const fim = new Date(dataFim + 'T23:59:59');
    filtradas = filtradas.filter(f => f.assinadoEm && new Date(f.assinadoEm) <= fim);
  }

  renderizarHistorico_(filtradas);
}

document.getElementById('btn-aplicar-filtro').addEventListener('click', aplicarFiltroHistorico_);
document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
  document.getElementById('filtro-tipo-epi').value = '';
  document.getElementById('filtro-data-inicio').value = '';
  document.getElementById('filtro-data-fim').value = '';
  renderizarHistorico_(fichasCache);
});

function renderizarHistorico_(fichas) {
  if (!fichas.length) {
    document.getElementById('lista-historico').innerHTML = '<p class="ajuda">Nenhuma ficha encontrada com esses critérios.</p>';
    return;
  }

  const ordenadas = fichas.slice().sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'Termo' ? -1 : 1;
    return new Date(b.criadoEm) - new Date(a.criadoEm);
  });

  document.getElementById('lista-historico').innerHTML = ordenadas.map(f => {
    const itens = JSON.parse(f.itens || '[]');
    const statusClasse = { Assinada: 'assinada', Pendente: 'pendente', Cancelada: 'cancelada' }[f.status] || 'pendente';
    const badgeTipo = f.tipo === 'Termo' ? 'termo' : 'entrega';
    const dataRef = f.status === 'Assinada' ? f.assinadoEm : f.criadoEm;

    let identificadoresHtml = '';
    if (f.status === 'Assinada') {
      let bio = {};
      try { bio = JSON.parse(f.biometriaWebauthn || '{}'); } catch (e) {}
      let geo = {};
      try { geo = JSON.parse(f.geo || '{}'); } catch (e) {}

      identificadoresHtml = `
        <div class="identificadores">
          <div>🔑 Conta Google: ${bio.googleEmail || '-'}</div>
          <div>🔒 Biometria do aparelho: ${bio.webauthn ? 'confirmada ✅' : 'não confirmada ⚠️'}</div>
          <div>📍 Localização: ${geo.lat ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}` : 'não capturada'}</div>
          <div>🔐 Hash: <code>${f.hash}</code></div>
        </div>
      `;
    }

    const itensTexto = itens.length
      ? itens.map(i => `${i.nome}${i.ca ? ' (CA ' + i.ca + ')' : ''}${i.devolucao ? ' — devolução obrigatória' : ''}`).join(', ')
      : '';

    const botaoCancelar = f.status === 'Pendente'
      ? `<button type="button" class="botao cancelar botao-pequeno" onclick="cancelarFichaHistorico('${f.id}')">🗑️ Cancelar</button>`
      : '';

    return `
      <div class="historico-item" data-ficha-id="${f.id}">
        <span class="badge ${badgeTipo}">${f.tipo}</span>
        <span class="badge ${statusClasse}">${f.status}</span>
        &nbsp; ${new Date(dataRef).toLocaleString('pt-BR')}<br>
        ${itensTexto ? `<strong>Itens:</strong> ${itensTexto}<br>` : ''}
        ${f.pdfUrl ? `<a href="${f.pdfUrl}" target="_blank">Ver PDF</a>` : ''}
        ${identificadoresHtml}
        ${botaoCancelar}
      </div>
    `;
  }).join('');
}

async function cancelarFichaHistorico(fichaId) {
  if (!confirm('Tem certeza que deseja cancelar esta ficha pendente?')) return;

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'cancelarFicha', id: fichaId })
    });
    const resultado = await res.json();

    if (resultado.success) {
      const ficha = fichasCache.find(f => f.id === fichaId);
      if (ficha) ficha.status = 'Cancelada';
      renderizarHistorico_(fichasCache);
    } else {
      alert('Erro: ' + resultado.error);
    }
  } catch (err) {
    alert('Falha ao cancelar: ' + err.message);
  }
}

/* ---------------------- EXPORTAR EM PDF (ZIP), COM FILTROS ---------------------- */

document.getElementById('btn-exportar-zip').addEventListener('click', async () => {
  if (!funcionarioSelecionadoId) return;
  const btn = document.getElementById('btn-exportar-zip');
  const status = document.getElementById('status-exportar');

  const tipoEpi = document.getElementById('filtro-tipo-epi').value.trim();
  const dataInicio = document.getElementById('filtro-data-inicio').value;
  const dataFim = document.getElementById('filtro-data-fim').value;

  const params = new URLSearchParams({ action: 'exportarZip', funcionarioId: funcionarioSelecionadoId });
  if (tipoEpi) params.set('tipoEpi', tipoEpi);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);

  btn.disabled = true;
  status.textContent = 'Gerando arquivo .zip com os PDFs selecionados...';

  try {
    const res = await fetch(`${CONFIG.API_URL}?${params.toString()}`);
    const resultado = await res.json();

    if (resultado.success) {
      status.innerHTML = `✅ ${resultado.quantidade} ficha(s) exportada(s). <a href="${resultado.url}" target="_blank">Baixar .zip</a>`;
    } else {
      status.textContent = '⚠️ ' + resultado.error;
    }
  } catch (err) {
    status.textContent = '⚠️ Falha ao exportar: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

carregarFuncionarios();
