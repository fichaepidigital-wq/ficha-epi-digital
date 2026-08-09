const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzd2jPUr--lqprwdBScKZAWqKvXP7aj6WTyj5gUT89OUull-QpRWgBcTHJKZuZpiMyJgA/exec'
};

let funcionariosCache = [];

async function carregarFuncionarios() {
  const res = await fetch(`${CONFIG.API_URL}?action=funcionarios`);
  funcionariosCache = await res.json();
  const select = document.getElementById('select-funcionario');
  select.innerHTML = '<option value="">Selecione...</option>';
  funcionariosCache.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.nome} — ${f.cargo || ''}`;
    select.appendChild(opt);
  });
}

document.getElementById('select-funcionario').addEventListener('change', (e) => {
  const funcionario = funcionariosCache.find(f => f.id === e.target.value);
  const aviso = document.getElementById('aviso-email');
  if (funcionario && !funcionario.email) {
    aviso.textContent = '⚠️ Este funcionário não tem e-mail Google cadastrado. Cadastre em "Área administrativa" antes de gerar a ficha.';
  } else {
    aviso.textContent = '';
  }
});

async function carregarEpis() {
  const res = await fetch(`${CONFIG.API_URL}?action=epis`);
  const dados = await res.json();
  const container = document.getElementById('lista-epis');
  container.innerHTML = '';
  dados.forEach(epi => {
    const label = document.createElement('label');
    label.className = 'epi-item';
    label.innerHTML = `
      <input type="checkbox" value="${epi.id}" data-nome="${epi.nome}" data-ca="${epi.ca}">
      <span>${epi.nome} <small>(CA ${epi.ca})</small></span>
    `;
    container.appendChild(label);
  });
}

function coletarItensSelecionados() {
  return Array.from(document.querySelectorAll('#lista-epis input:checked')).map(el => ({
    id: el.value,
    nome: el.dataset.nome,
    ca: el.dataset.ca
  }));
}

document.getElementById('form-ficha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-gerar');
  const funcionarioId = document.getElementById('select-funcionario').value;
  const funcionario = funcionariosCache.find(f => f.id === funcionarioId);
  const itens = coletarItensSelecionados();

  if (!funcionarioId) return alert('Selecione o funcionário');
  if (!funcionario.email) return alert('Este funcionário precisa ter um e-mail Google cadastrado antes de gerar a ficha.');
  if (!itens.length) return alert('Selecione ao menos um EPI');

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
      const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}assinar.html?id=${resultado.id}`;
      document.getElementById('input-link').value = link;

      const mensagem = encodeURIComponent(
        `Olá ${funcionario.nome}! Por favor, acesse o link abaixo no seu celular para assinar a ficha de entrega de EPI:\n${link}`
      );
      const telefone = (funcionario.telefone || '').replace(/\D/g, '');
      document.getElementById('btn-whatsapp').href = telefone
        ? `https://wa.me/55${telefone}?text=${mensagem}`
        : `https://wa.me/?text=${mensagem}`;

      document.getElementById('resultado-link').style.display = 'block';
      document.getElementById('resultado-link').scrollIntoView({ behavior: 'smooth' });
      e.target.reset();
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

carregarFuncionarios();
carregarEpis();
