const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzd2jPUr--lqprwdBScKZAWqKvXP7aj6WTyj5gUT89OUull-QpRWgBcTHJKZuZpiMyJgA/exec'
};

let funcionariosCache = [];
let contadorLinhas = 0;
let ultimaFichaCriadaId = null;

async function carregarFuncionarios() {
  try {
    const res = await fetch(`${CONFIG.API_URL}?action=funcionarios`);
    funcionariosCache = await res.json();
    const select = document.getElementById('select-funcionario');
    select.innerHTML = '<option value="">Selecione...</option>';
    funcionariosCache
      .filter(f => f.status !== 'Inativo')
      .forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.nome} — ${f.cargo || ''}`;
        select.appendChild(opt);
      });
  } catch (err) {
    console.error('Erro ao carregar funcionários:', err);
  }
}

document.getElementById('select-funcionario').addEventListener('change', (e) => {
  const funcionario = funcionariosCache.find(f => f.id === e.target.value);
  const aviso = document.getElementById('aviso-email');
  if (funcionario && !funcionario.email) {
    aviso.textContent = '⚠️ Este funcionário não tem e-mail Google cadastrado. Cadastre em "Cadastro de Funcionário" antes de gerar a ficha.';
  } else {
    aviso.textContent = '';
  }
});

/* ---------------------- ITENS DE EPI (CAMPO LIVRE) ---------------------- */

async function carregarSugestoesEpis() {
  try {
    const res = await fetch(`${CONFIG.API_URL}?action=epis`);
    const dados = await res.json();
    const datalist = document.getElementById('lista-nomes-epi');
    datalist.innerHTML = dados.map(epi => `<option value="${epi.nome}">`).join('');
  } catch (err) {
    console.error('Erro ao carregar sugestões de EPI:', err);
  }
}

function adicionarLinhaItem(nome, ca, devolucao) {
  nome = nome || '';
  ca = ca || '';
  devolucao = devolucao || false;

  contadorLinhas++;
  const id = `item-${contadorLinhas}`;
  const div = document.createElement('div');
  div.className = 'linha-item-epi';
  div.dataset.linhaId = id;
  div.innerHTML = `
    <input type="text" class="input-epi-nome" list="lista-nomes-epi" placeholder="Ex: Capacete de Segurança" value="${nome}">
    <input type="text" class="input-epi-ca" placeholder="Ex: 12345 ou N/A" value="${ca}">
    <input type="checkbox" class="input-epi-devolucao" title="Este EPI precisa ser devolvido" ${devolucao ? 'checked' : ''}>
    <button type="button" class="btn-remover-item" title="Remover">✕</button>
  `;
  div.querySelector('.btn-remover-item').addEventListener('click', () => {
    const linhas = document.getElementById('linhas-itens-epi');
    if (linhas.children.length > 1) {
      div.remove();
    } else {
      div.querySelector('.input-epi-nome').value = '';
      div.querySelector('.input-epi-ca').value = '';
      div.querySelector('.input-epi-devolucao').checked = false;
    }
  });
  document.getElementById('linhas-itens-epi').appendChild(div);
}

document.getElementById('btn-add-item').addEventListener('click', () => adicionarLinhaItem());

function coletarItensSelecionados() {
  return Array.from(document.querySelectorAll('.linha-item-epi:not(.cabecalho)'))
    .map(linha => ({
      nome: linha.querySelector('.input-epi-nome').value.trim(),
      ca: linha.querySelector('.input-epi-ca').value.trim(),
      devolucao: linha.querySelector('.input-epi-devolucao').checked
    }))
    .filter(item => item.nome !== '');
}

/* ---------------------- CRIAR FICHA ---------------------- */

document.getElementById('form-ficha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-gerar');
  const funcionarioId = document.getElementById('select-funcionario').value;
  const funcionario = funcionariosCache.find(f => f.id === funcionarioId);
  const itens = coletarItensSelecionados();

  if (!funcionarioId) return alert('Selecione o funcionário');
  if (!funcionario.email) return alert('Este funcionário precisa ter um e-mail Google cadastrado antes de gerar a ficha.');
  if (!itens.length) return alert('Informe ao menos um item de EPI');

  btn.disabled = true;
  btn.textContent = 'Gerando...';

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'criarFichaPendente', funcionarioId, itens })
    });
    const resultado = await res.json();

    if (resultado.success) {
      ultimaFichaCriadaId = resultado.id;
      const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}assinar.html?id=${resultado.id}`;
      document.getElementById('input-link').value = link;

      const mensagem = encodeURIComponent(
        `Olá ${funcionario.nome}! Por favor, acesse o link abaixo no seu celular para assinar a ficha de entrega de EPI:\n${link}`
      );
      const telefone = (funcionario.telefone || '').replace(/\D/g, '');
      document.getElementById('btn-whatsapp').href = telefone
        ? `https://wa.me/55${telefone}?text=${mensagem}`
        : `https://wa.me/?text=${mensagem}`;

      document.getElementById('btn-cancelar-ficha').style.display = 'inline-block';
      document.getElementById('status-cancelamento').textContent = '';
      document.getElementById('resultado-link').style.display = 'block';
      document.getElementById('resultado-link').scrollIntoView({ behavior: 'smooth' });
      e.target.reset();
      document.getElementById('linhas-itens-epi').innerHTML = '';
      adicionarLinhaItem();
      document.getElementById('aviso-email').textContent = '';
    } else {
      alert('Erro: ' + resultado.error);
    }
  } catch (err) {
    alert('Falha ao gerar ficha: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gerar link de assinatura';
  }
});

document.getElementById('btn-copiar').addEventListener('click', () => {
  const input = document.getElementById('input-link');
  input.select();
  navigator.clipboard.writeText(input.value);
  const btn = document.getElementById('btn-copiar');
  btn.textContent = 'Copiado!';
  setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
});

/* ---------------------- CANCELAR FICHA CRIADA POR ENGANO ---------------------- */

document.getElementById('btn-cancelar-ficha').addEventListener('click', async () => {
  if (!ultimaFichaCriadaId) return;
  if (!confirm('Tem certeza que deseja cancelar esta ficha? Essa ação não pode ser desfeita.')) return;

  const btn = document.getElementById('btn-cancelar-ficha');
  const status = document.getElementById('status-cancelamento');
  btn.disabled = true;
  btn.textContent = 'Cancelando...';

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'cancelarFicha', id: ultimaFichaCriadaId })
    });
    const resultado = await res.json();

    if (resultado.success) {
      status.textContent = '✅ Ficha cancelada com sucesso.';
      btn.style.display = 'none';
      document.getElementById('btn-whatsapp').style.display = 'none';
      document.getElementById('btn-copiar').disabled = true;
    } else {
      status.textContent = '⚠️ ' + resultado.error;
      btn.disabled = false;
      btn.textContent = '🗑️ Cancelar esta ficha (foi criada por engano)';
    }
  } catch (err) {
    status.textContent = '⚠️ Falha ao cancelar: ' + err.message;
    btn.disabled = false;
    btn.textContent = '🗑️ Cancelar esta ficha (foi criada por engano)';
  }
});

carregarFuncionarios();
carregarSugestoesEpis();
adicionarLinhaItem();
