const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzd2jPUr--lqprwdBScKZAWqKvXP7aj6WTyj5gUT89OUull-QpRWgBcTHJKZuZpiMyJgA/exec'
};

let funcionariosCache = [];
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

/* ---------------------- LISTAGEM E EDIÇÃO DE FUNCIONÁRIOS ---------------------- */

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
      <td>${f.nome}</td>
      <td>
        <input type="email" class="editavel" value="${f.email || ''}" data-campo="email">
      </td>
      <td>
        <select class="editavel" data-campo="status">
          <option value="Ativo" ${f.status !== 'Inativo' ? 'selected' : ''}>Ativo</option>
          <option value="Inativo" ${f.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
        </select>
      </td>
      <td class="linha-acoes">
        <button type="button" class="botao secundario" onclick="salvarEdicaoFuncionario('${f.id}')">Salvar</button>
        <button type="button" class="botao secundario" onclick="verHistorico('${f.id}')">Histórico</button>
      </td>
    </tr>
  `).join('');
}

async function salvarEdicaoFuncionario(funcionarioId) {
  const linha = document.querySelector(`tr[data-id="${funcionarioId}"]`);
  const email = linha.querySelector('[data-campo="email"]').value;
  const status = linha.querySelector('[data-campo="status"]').value;
  const botao = linha.querySelector('.linha-acoes button');

  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'editarFuncionario', id: funcionarioId, email, status })
    });
    const resultado = await res.json();
    if (resultado.success) {
      botao.textContent = '✅ Salvo';
      setTimeout(() => { botao.textContent = 'Salvar'; botao.disabled = false; }, 1500);
      carregarFuncionarios();
    } else {
      alert('Erro: ' + resultado.error);
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  } catch (err) {
    alert('Falha ao salvar: ' + err.message);
    botao.disabled = false;
    botao.textContent = 'Salvar';
  }
}

/* ---------------------- HISTÓRICO DE FICHAS ---------------------- */

async function verHistorico(funcionarioId) {
  funcionarioSelecionadoId = funcionarioId;
  const funcionario = funcionariosCache.find(f => f.id === funcionarioId);

  document.getElementById('secao-historico').style.display = 'block';
  document.getElementById('titulo-historico').textContent = `Histórico de ${funcionario.nome}`;
  document.getElementById('lista-historico').innerHTML = 'Carregando...';
  document.getElementById('status-exportar').textContent = '';
  document.getElementById('secao-historico').scrollIntoView({ behavior: 'smooth' });

  const res = await fetch(`${CONFIG.API_URL}?action=fichas&funcionarioId=${encodeURIComponent(funcionarioId)}`);
  const fichas = await res.json();

  if (!fichas.length) {
    document.getElementById('lista-historico').innerHTML = '<p class="ajuda">Nenhuma ficha registrada para este funcionário ainda.</p>';
    return;
  }

  fichas.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'Termo' ? -1 : 1;
    return new Date(b.criadoEm) - new Date(a.criadoEm);
  });

  document.getElementById('lista-historico').innerHTML = fichas.map(f => {
    const itens = JSON.parse(f.itens || '[]');
    const badgeStatus = f.status === 'Assinada' ? 'assinada' : 'pendente';
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

    return `
      <div class="historico-item">
        <span class="badge ${badgeTipo}">${f.tipo}</span>
        <span class="badge ${badgeStatus}">${f.status}</span>
        &nbsp; ${new Date(dataRef).toLocaleString('pt-BR')}<br>
        ${itens.length ? `<strong>Itens:</strong> ${itens.map(i => i.nome).join(', ')}<br>` : ''}
        ${f.pdfUrl ? `<a href="${f.pdfUrl}" target="_blank">Ver PDF</a>` : ''}
        ${identificadoresHtml}
      </div>
    `;
  }).join('');
}

/* ---------------------- EXPORTAR TODAS EM PDF (ZIP) ---------------------- */

document.getElementById('btn-exportar-zip').addEventListener('click', async () => {
  if (!funcionarioSelecionadoId) return;
  const btn = document.getElementById('btn-exportar-zip');
  const status = document.getElementById('status-exportar');

  btn.disabled = true;
  status.textContent = 'Gerando arquivo .zip com todos os PDFs...';

  try {
    const res = await fetch(`${CONFIG.API_URL}?action=exportarZip&funcionarioId=${encodeURIComponent(funcionarioSelecionadoId)}`);
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
