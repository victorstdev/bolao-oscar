import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
const provider = new GoogleAuthProvider();

// ==========================================
// 2. REFERÊNCIAS DO DOM
// ==========================================
const heroBanner = document.getElementById("dash-hero");
const dashTag = document.getElementById("dash-tag");
const dashTitle = document.getElementById("dash-title");
const dashDesc = document.getElementById("dash-desc");
const btnLogin = document.getElementById("btn-login-google");
const btnApostar = document.getElementById("btn-hero-apostar");

const headerPoints = document.getElementById("header-points");
const headerPointsValue = document.getElementById("header-points-value");
const statsGrid = document.getElementById("stats-grid");
const statRank = document.getElementById("stat-rank");
const statStatus = document.getElementById("stat-status");

const containerPodio = document.getElementById("podium-container");
const containerLista = document.getElementById("ranking-list");

let emailLogadoGeral = "";
let listaParticipantes = [];
let gabaritoOficial = {};

// ==========================================
// 3. CONTROLE DE DASHBOARD E LOGIN
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        emailLogadoGeral = user.email;
        btnLogin.style.display = "none";
        
        const docRef = doc(db, "participantes", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Logado, mas sem cédula salva
            heroBanner.style.display = "block";
            dashTag.innerText = "Desafio Diário";
            dashTitle.innerText = "Ficha Pendente";
            dashDesc.innerText = `Olá, ${user.displayName.split(' ')[0]}! Tranque suas escolhas para entrar na disputa.`;
            btnApostar.style.display = "flex";
            
            statsGrid.style.display = "grid";
            statRank.innerText = "--";
            statStatus.innerText = "Pendente";
            statStatus.style.color = "#ff4444";
            headerPoints.style.display = "none";
        } else {
            // Logado e com cédula trancada
            heroBanner.style.display = "none";
            headerPoints.style.display = "flex"; 
            statsGrid.style.display = "grid";
            
            const dadosUsuario = docSnap.data();
            headerPointsValue.innerText = dadosUsuario.pontos || 0;
            statStatus.innerText = "Realizada";
            statStatus.style.color = "#00e676";
        }
        
        // Recalcula o ranking para atualizar a box de "Meu Rank"
        if(listaParticipantes.length > 0) calcularEAtualizarRanking();

    } else {
        // Deslogado
        emailLogadoGeral = "";
        heroBanner.style.display = "block";
        btnLogin.style.display = "flex";
        btnApostar.style.display = "none";
        statsGrid.style.display = "none";
        headerPoints.style.display = "none";
        dashTitle.innerText = "Faça suas Apostas";
        dashDesc.innerText = "Entre com sua conta do Google para preencher sua ficha e entrar no ranking oficial.";
    }
});

btnLogin.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(erro => console.error("Erro no login", erro));
});

// ==========================================
// 4. MOTOR DE REGRAS E PONTUAÇÃO (TEMPO REAL)
// ==========================================

// Escuta o Gabarito (Admin)
onSnapshot(doc(db, "gabarito", "oscar2026"), (docSnap) => {
    gabaritoOficial = docSnap.exists() ? docSnap.data() : {};
    calcularEAtualizarRanking();
});

// Escuta os Participantes
onSnapshot(collection(db, "participantes"), (querySnapshot) => {
    listaParticipantes = [];
    querySnapshot.forEach((doc) => {
        listaParticipantes.push(doc.data());
    });
    calcularEAtualizarRanking();
});

function calcularEAtualizarRanking() {
    let rankingCalculado = [];

    // Lógica de cálculo de pontos
    listaParticipantes.forEach(p => {
        let pts = 0;
        categoriasOscar.forEach(cat => {
            const palpite = p.palpites ? p.palpites[cat.id] : null;
            const vencedor = gabaritoOficial[cat.id];
            const isCerteza = p.certeza_absoluta === cat.id;

            if (vencedor && vencedor !== "") {
                if (palpite === vencedor) {
                    pts += isCerteza ? (cat.peso * 3) : cat.peso;
                } else {
                    if (isCerteza) pts -= cat.peso; // Perde pontos se errar a certeza absoluta
                }
            }
        });
        rankingCalculado.push({ ...p, pontos: pts });
    });

    // Ordena do maior para o menor
    rankingCalculado.sort((a, b) => b.pontos - a.pontos);

    // Atualiza a Widget de "Meu Rank"
    if (emailLogadoGeral !== "") {
        const minhaPosicaoIndex = rankingCalculado.findIndex(p => p.email === emailLogadoGeral);
        if (minhaPosicaoIndex !== -1) {
            statRank.innerText = `#${minhaPosicaoIndex + 1}`;
            // Atualiza também a pílula de pontos global
            headerPointsValue.innerText = rankingCalculado[minhaPosicaoIndex].pontos;
        }
    }

    // Renderiza a Interface
    containerPodio.innerHTML = "";
    containerLista.innerHTML = "";

    const top3 = rankingCalculado.slice(0, 3);
    const resto = rankingCalculado.slice(3);

    // --- PÓDIO (TOP 3) ---
    if (top3.length > 0) {
        const ordemVisual = [];
        if(top3[1]) ordemVisual.push({ ...top3[1], pos: 2 });
        ordemVisual.push({ ...top3[0], pos: 1 });
        if(top3[2]) ordemVisual.push({ ...top3[2], pos: 3 });

        ordemVisual.forEach(p => {
            const avatarHTML = p.foto 
                ? `<img src="${p.foto}" alt="${p.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` 
                : p.nome.charAt(0).toUpperCase();

            containerPodio.innerHTML += `
                <div class="podium-item rank-${p.pos}">
                    <div class="podium-name">${p.nome}</div>
                    <div class="podium-pts">${p.pontos} pts</div>
                    <div class="podium-avatar">${avatarHTML}</div>
                    <div class="podium-block">${p.pos}º</div>
                </div>
            `;
        });
    }

    // --- LISTA GERAL (4º+) ---
    resto.forEach((p, index) => {
        const posicaoReal = index + 4;
        const corPontos = p.pontos < 0 ? "#ff4444" : "var(--text-main)"; 
        
        const miniAvatarHTML = p.foto
            ? `<img src="${p.foto}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #444;">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface-light); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">${p.nome.charAt(0).toUpperCase()}</div>`;

        const classeDestaque = p.email === emailLogadoGeral ? "is-me" : ""; 

        containerLista.innerHTML += `
            <div class="ranking-card ${classeDestaque}">
                <div class="rank-info">
                    <span class="rank-position">${posicaoReal}</span>
                    ${miniAvatarHTML}
                    <span class="rank-name">${p.nome}</span>
                </div>
                <div class="rank-points" style="color: ${corPontos}">${p.pontos}</div>
            </div>
        `;
    });
}

// ==========================================
// 5. CONTADOR REGRESSIVO (DEADLINE 20H)
// ==========================================
const dataFimApostas = new Date("2026-03-15T20:30:00-03:00").getTime();
const countdownElement = document.getElementById("countdown-timer");
const countdownContainer = document.getElementById("countdown-container");

function atualizarContador() {
    if(!countdownElement) return true;

    const agora = new Date().getTime();
    const distancia = dataFimApostas - agora;

    if (distancia < 0) {
        // O TEMPO ACABOU!
        countdownElement.innerText = "00h 00m 00s";
        countdownElement.style.color = "#ff4444";
        countdownElement.style.textShadow = "0 0 10px rgba(255, 68, 68, 0.4)";
        
        const labelIcon = countdownContainer.querySelector('i');
        if(labelIcon) labelIcon.style.color = "#ff4444";
        
        // Proteções para não dar erro se a div estiver oculta
        const elDashTag = document.getElementById("dash-tag");
        const elDashTitle = document.getElementById("dash-title");
        const elBtnApostar = document.getElementById("btn-hero-apostar");
        
        if(elDashTag) elDashTag.innerText = "Fechado";
        if(elDashTitle) elDashTitle.innerText = "Apostas Encerradas";
        if(elBtnApostar) elBtnApostar.style.display = "none"; 
        
        return true; // Retorna true para parar o loop
    }

    // CALCULA O TEMPO RESTANTE
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

    countdownElement.innerText = 
        String(horas).padStart(2, '0') + "h " + 
        String(minutos).padStart(2, '0') + "m " + 
        String(segundos).padStart(2, '0') + "s";
        
    return false;
}

// 1. Chama imediatamente para não ficar esperando 1 segundo e aparecer "Carregando"
const tempoEsgotado = atualizarContador();

// 2. Se o tempo não esgotou, inicia o relógio automático
if (!tempoEsgotado) {
    const timerInterval = setInterval(() => {
        const acabou = atualizarContador();
        if (acabou) {
            clearInterval(timerInterval); // Para o relógio quando zerar
        }
    }, 1000);
}