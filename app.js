const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzd2jPUr--lqprwdBScKZAWqKvXP7aj6WTyj5gUT89OUull-QpRWgBcTHJKZuZpiMyJgA/exec'
};

let tracoPontos = [];
let desenhando = false;
let geolocalizacao = null;

const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');

function ajustarCanvas() {
  const proporcao = window.devicePixelRatio || 1;
  const largura = canvas.offsetWidth;
  const altura = canvas.offsetHeight;
  canvas.width = largura * proporcao;
  canvas.height = altura * proporcao;
  ctx.scale(proporcao, proporcao);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1a2e';
}
window.addEventListener('resize', ajustarCanvas);
ajustarCanvas();

function posicaoRelativa(evento) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: +(evento.clientX - rect.left).toFixed(2),
    y: +(evento.clientY - rect.top).toFixed(2),
    p: evento.pressure && evento.pressure > 0 ? evento.pressure : 0.5,
    t: Date.now()
  };
}

canvas.addEventListener('pointerdown', (e) => {
  desenhando = true;
  const pos = posicaoRelativa(e);
  tracoPontos.push({ ...pos, tipo: 'start' });
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('pointermove', (e) => {
  if (!desenhando) return;
  const pos = posicaoRelativa(e);
  tracoPontos.push({ ...pos, tipo: 'move' });
  ctx.lineWidth = 1.5 + pos.p * 2.5;
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
});

['pointerup', 'pointerleave', 'pointercancel'].forEach(evt =>
  canvas.addEventListener(evt, () => { desenhando = false; })
);

document.getElementById('btn-limpar').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tracoPontos = [];
});

document.getElementById('btn-geo').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocalização não suportada neste dispositivo');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geolocalizacao = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      document.getElementById('status-geo').textContent = '📍 Localização capturada';
    },
    () => { document.getElementById('status-geo').textContent = '⚠️ Localização não autorizada'; }
  );
});

async function carregarFuncionarios() {
  const res = await fetch(`${CONFIG.API_URL}?action=funcionarios`);
  const dados = await res.json();
  const select = document.getElementById('select-funcionario');
  select.innerHTML = '<option value="">Selecione...</option>';
  dados.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.nome} — ${f.cargo || ''}`;
    select.appendChild(opt);
  });
}

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
  const btn = document.getElementById('btn-enviar');
  const funcionarioId = document.getElementById('select-funcionario').value;
  const itens = coletarItensSelecionados();

  if (!funcionarioId) return alert('Selecione o funcionário');
  if (!itens.length) return alert('Selecione ao menos um EPI');
  if (tracoPontos.length < 5) return alert('Colete a assinatura no campo indicado');

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const payload = {
    action: 'criarFicha',
    funcionarioId,
    itens,
    assinaturaPng: canvas.toDataURL('image/png'),
    traco: tracoPontos,
    geo: geolocalizacao,
    dispositivo: {
      userAgent: navigator.userAgent,
      tela: `${screen.width}x${screen.height}`
    }
  };

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const resultado = await res.json();

    if (resultado.success) {
      document.getElementById('resultado').innerHTML = `
        ✅ Ficha registrada com sucesso!<br>
        ID: ${resultado.id}<br>
        Hash de integridade: <code>${resultado.hash}</code><br>
        ${resultado.pdfUrl ? `<a href="${resultado.pdfUrl}" target="_blank">Baixar PDF da ficha</a>` : ''}
      `;
      e.target.reset();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tracoPontos = [];
    } else {
      alert('Erro: ' + resultado.error);
    }
  } catch (err) {
    alert('Falha ao enviar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Assinar e Registrar Entrega';
  }
});

carregarFuncionarios();
carregarEpis();
