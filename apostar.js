import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// Adicionamos o getDoc aqui na importação do Firestore
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { categoriasOscar } from './dados.js';

// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAQ-fi0_R9ZFyYTUWG5buXKuHXd3vKqfKE",
    authDomain: "bolao-oscar-2026.firebaseapp.com",
    projectId: "bolao-oscar-2026",
    storageBucket: "bolao-oscar-2026.firebasestorage.app",
    messagingSenderId: "886230610906",
    appId: "1:886230610906:web:990c459520e48bbe7f46e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================================
// 2. VARIÁVEIS GLOBAIS E AUTENTICAÇÃO
// ==========================================
let usuarioLogado = null;
let meusPalpites = {};
let stepAtual = 0;
const totalSteps = categoriasOscar.length + 2;

const containerCategorias = document.getElementById("categorias-container");
const selectCerteza = document.getElementById("certeza_absoluta");
const btnNext = document.getElementById("btn-next");
const btnPrev = document.getElementById("btn-prev");

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogado = user;
        const displayNome = document.getElementById("display-nome");
        if (displayNome) displayNome.innerText = user.displayName || "Cinéfilo Anônimo";

        // Assim que logar, busca a aposta anterior
        carregarApostaAnterior(user.uid);

    } else {
        alert("Você precisa fazer login primeiro para apostar!");
        window.location.href = "index.html";
    }
});

// ==========================================
// NOVA FUNÇÃO: CARREGAR APOSTA E TRANCAR A TELA
// ==========================================
async function carregarApostaAnterior(uid) {
    try {
        const docRef = doc(db, "participantes", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            meusPalpites = dados.palpites || {};

            // 1. Puxa a Certeza Absoluta salva
            if (dados.certeza_absoluta) {
                selectCerteza.value = dados.certeza_absoluta;
            }

            // 2. MÁGICA DA UX: Transforma a página em um "Recibo" trancado
            document.querySelector('.form-header h1').innerHTML = '<i class="fas fa-lock" style="color: var(--gold); font-size: 24px;"></i> Ficha Trancada';
            document.querySelector('.form-header p').innerText = "Você já enviou seus palpites oficiais para este ano. Boa sorte!";

            document.querySelector('#step-review p').innerText = "Este é o registro oficial das suas escolhas.";

            // Esconde a barra de progresso e os botões de navegação (Voltar/Avançar)
            document.querySelector('.progress-container').style.display = "none";
            document.querySelector('.stepper-nav').style.display = "none";

            // Transforma o botão de Enviar num selo de confirmação inativo
            const btnSubmit = document.querySelector('#step-review button[type="submit"]');
            btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Palpites Registrados';
            btnSubmit.disabled = true;
            btnSubmit.style.background = "var(--surface-light)";
            btnSubmit.style.color = "var(--gold)";
            btnSubmit.style.cursor = "default";
            btnSubmit.style.boxShadow = "none";
            btnSubmit.style.transform = "none";

            // 3. Força o sistema a pular todas as categorias e ir direto para a tela de Revisão
            stepAtual = categoriasOscar.length + 1;
            atualizarInterface();
        }
    } catch (erro) {
        console.error("Erro ao carregar aposta anterior", erro);
    }
}

// ==========================================
// 3. CONSTRUÇÃO DA INTERFACE (STEP-BY-STEP)
// ==========================================
categoriasOscar.forEach((cat, index) => {
    let htmlCategoria = `
        <div class="category-step ${index === 0 ? 'active' : ''}" id="step-${index}">
            <h2 class="category-title" style="display: flex; justify-content: space-between; align-items: baseline;">
                ${cat.nome} 
                <span style="font-size: 12px; font-family: sans-serif; color: var(--text-muted);">Vale ${cat.peso} pts</span>
            </h2>
    `;

    cat.indicados.forEach(indicadoObj => {
        htmlCategoria += `
            <div class="nominee-card" data-categoria="${cat.id}" data-indicado="${indicadoObj.nome}">
                <img src="${indicadoObj.img}" class="nominee-img" alt="${indicadoObj.nome}">
                <div class="nominee-info">
                    <h3 class="nominee-name">${indicadoObj.nome}</h3>
                    <button type="button" class="vote-btn">VOTAR</button>
                </div>
            </div>
        `;
    });

    htmlCategoria += `</div>`;
    containerCategorias.innerHTML += htmlCategoria;
    selectCerteza.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
});

// Lógica de clique nos cartões
// Lógica de clique nos cartões
document.querySelectorAll('.nominee-card').forEach(card => {
    card.addEventListener('click', function() {
        const categoriaClicada = this.getAttribute('data-categoria');
        const indicadoClicado = this.getAttribute('data-indicado');

        // Remove a seleção de todos os outros cartões desta categoria
        document.querySelectorAll(`.nominee-card[data-categoria="${categoriaClicada}"]`).forEach(c => {
            c.classList.remove('picked');
            c.querySelector('.vote-btn').innerText = "VOTAR";
        });

        // Adiciona a seleção no cartão clicado
        this.classList.add('picked');
        this.querySelector('.vote-btn').innerText = "✔ ESCOLHIDO";
        meusPalpites[categoriaClicada] = indicadoClicado;

        // 👉 O TOQUE NINJA: Avanço automático após 600 milissegundos
        setTimeout(() => {
            // Só avança se não estiver na tela final de Certeza Absoluta ou Revisão
            if (stepAtual < categoriasOscar.length) {
                btnNext.click(); // Simula o clique no botão "Próximo"
            }
        }, 600);
    });
});

// ==========================================
// 4. LÓGICA DE NAVEGAÇÃO E REVISÃO
// ==========================================
function atualizarInterface() {
    document.querySelectorAll('.category-step').forEach(el => el.classList.remove('active'));

    if (stepAtual < categoriasOscar.length) {
        document.getElementById(`step-${stepAtual}`).classList.add('active');
        btnNext.style.display = "block";
        btnNext.innerHTML = 'Próxima Categoria <i class="fas fa-arrow-right"></i>';

    } else if (stepAtual === categoriasOscar.length) {
        document.getElementById('step-final').classList.add('active');
        btnNext.style.display = "block";
        btnNext.innerHTML = 'Revisar ficha <i class="fas fa-search"></i>';

    } else {
        document.getElementById('step-review').classList.add('active');
        btnNext.style.display = "none";
        montarTelaRevisao();
    }

    btnPrev.style.display = stepAtual === 0 ? "none" : "block";

    const progresso = ((stepAtual + 1) / totalSteps) * 100;
    document.getElementById('progress-fill').style.width = `${progresso}%`;
    document.getElementById('current-step-text').innerText = stepAtual + 1;
    document.getElementById('total-steps-text').innerText = totalSteps;
}

function montarTelaRevisao() {
    const reviewList = document.getElementById("review-list");
    reviewList.innerHTML = "";
    const certezaEscolhida = selectCerteza.value;

    categoriasOscar.forEach(cat => {
        const palpite = meusPalpites[cat.id];
        const isAllIn = (cat.id === certezaEscolhida) ? `<span class="review-allin">🎯 ALL-IN</span>` : '';

        reviewList.innerHTML += `
            <div class="review-item">
                <div class="review-cat">${cat.nome}</div>
                <div class="review-pick">
                    <span>${palpite || '<span style="color:#ff4444;">Não votou</span>'}</span>
                    ${isAllIn}
                </div>
            </div>
        `;
    });
}

btnNext.addEventListener("click", () => {
    if (stepAtual < categoriasOscar.length) {
        const categoriaAtualId = categoriasOscar[stepAtual].id;
        if (!meusPalpites[categoriaAtualId]) {
            alert("Por favor, selecione um vencedor para esta categoria antes de avançar!");
            return;
        }
    }

    if (stepAtual === categoriasOscar.length) {
        if (!selectCerteza.value) {
            alert("Selecione sua Certeza Absoluta para ir para a Revisão!");
            return;
        }
    }

    stepAtual++;
    atualizarInterface();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnPrev.addEventListener("click", () => {
    stepAtual--;
    atualizarInterface();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

atualizarInterface();

// ==========================================
// 5. ENVIO PARA O BANCO DE DADOS
// ==========================================

// ==========================================
// 5. BLOQUEIO DE TEMPO E ENVIO
// ==========================================
const prazoFinal = new Date("2026-03-15T20:30:00-03:00");

// Se o relógio do usuário já passou das 20h, desativa o botão visualmente
if (new Date() > prazoFinal) {
    const btnSubmit = document.querySelector('#step-review button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-hourglass-end"></i> Apostas Encerradas';
        btnSubmit.style.background = "var(--surface-light)";
        btnSubmit.style.color = "#ff4444";
        btnSubmit.style.cursor = "not-allowed";
        btnSubmit.style.boxShadow = "none";
    }
}
const formAposta = document.getElementById("form-aposta");

formAposta.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (new Date() > prazoFinal) {
        alert("O prazo para apostas encerrou às 20h! Acompanhe o ranking na página inicial.");
        window.location.href = "index.html";
        return;
    }

    if (!usuarioLogado) {
        alert("Erro: Usuário não autenticado.");
        return;
    }

    if (Object.keys(meusPalpites).length < categoriasOscar.length) {
        alert("Faltam categorias! Use o botão voltar e preencha tudo.");
        return;
    }

    const dadosDaAposta = {
        nome: usuarioLogado.displayName || "Cinéfilo Anônimo",
        email: usuarioLogado.email,
        foto: usuarioLogado.photoURL || "",
        pontos: 0,
        palpites: meusPalpites,
        certeza_absoluta: selectCerteza.value
    };

    const btnSubmit = formAposta.querySelector('button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSubmit.style.opacity = "0.7";
    btnSubmit.disabled = true;

    try {
        await setDoc(doc(db, "participantes", usuarioLogado.uid), dadosDaAposta);
        alert("Sua ficha foi salva com sucesso! Boa sorte!");
        window.location.href = "perfil.html";
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao salvar. Verifique sua conexão e tente novamente.");
        btnSubmit.innerHTML = '<i class="fas fa-edit"></i> Atualizar Minhas Escolhas';
        btnSubmit.style.opacity = "1";
        btnSubmit.disabled = false;
    }
});