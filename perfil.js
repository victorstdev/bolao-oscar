import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { categoriasOscar } from './dados.js';

// INSIRA SUA KEY
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

let gabarito = {};
let minhaAposta = null;

// Referências HTML
const avatarEl = document.getElementById("user-avatar");
const nameEl = document.getElementById("user-name");
const emailEl = document.getElementById("user-email");
const pointsEl = document.getElementById("user-total-points");
const levelEl = document.getElementById("user-level");
const predictionsList = document.getElementById("predictions-list");

// 1. OUVINTE DE AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Preenche os dados do Google do usuário
        nameEl.innerText = user.displayName || "Cinéfilo";
        emailEl.innerText = user.email;
        if (user.photoURL) {
            avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Foto" style="width: 100%; height: 100%; border-radius: 50%;">`;
        }

        // Puxa o gabarito e a aposta do usuário em tempo real
        escutarDados(user.uid);
    } else {
        // Se não estiver logado, manda para o ranking
        alert("Você precisa fazer login primeiro!");
        window.location.href = "index.html";
    }
});

function escutarDados(uid) {
    // Escuta o Gabarito
    onSnapshot(doc(db, "gabarito", "oscar2026"), (docSnap) => {
        gabarito = docSnap.exists() ? docSnap.data() : {};
        renderizarCedula();
    });

    // Escuta apenas o documento do usuário logado
    onSnapshot(doc(db, "participantes", uid), (docSnap) => {
        if (docSnap.exists()) {
            minhaAposta = docSnap.data();
            renderizarCedula();
        } else {
            predictionsList.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <p style="color: var(--text-muted); margin-bottom: 20px;">Você ainda não enviou seus palpites!</p>
                    <a href="apostar.html" class="btn-lock" style="text-decoration: none; padding: 12px 20px;">Fazer Apostas Agora</a>
                </div>
            `;
        }
    });
}

function renderizarCedula() {
    if (!minhaAposta) return;

    let totalPontos = 0;
    predictionsList.innerHTML = "";

    categoriasOscar.forEach(cat => {
        const meuPalpite = minhaAposta.palpites ? minhaAposta.palpites[cat.id] : null;
        
        // Se não houver palpite para essa categoria, ignora
        if (!meuPalpite) return;

        const vencedorOficial = gabarito[cat.id];
        const isCertezaAbsoluta = minhaAposta.certeza_absoluta === cat.id;
        
        let statusClass = ""; // 'hit' ou 'miss'
        let pointsLabel = "PENDENTE";
        let winnerText = "";
        let iconeMultiplicador = isCertezaAbsoluta ? "🎯 " : "";

        // Se o admin já postou um vencedor para essa categoria
        if (vencedorOficial && vencedorOficial !== "") {
            if (meuPalpite === vencedorOficial) {
                // Acertou!
                statusClass = "hit";
                const pontosGanhos = isCertezaAbsoluta ? cat.peso * 3 : cat.peso;
                pointsLabel = `+${pontosGanhos} PTS`;
                totalPontos += pontosGanhos;
                
                // Se acertou a certeza absoluta, acende a badge visualmente
                if (isCertezaAbsoluta) document.getElementById("badge-allin").classList.add("unlocked");

            } else {
                // Errou!
                statusClass = "miss";
                const pontosPerdidos = isCertezaAbsoluta ? -cat.peso : 0;
                pointsLabel = pontosPerdidos < 0 ? `${pontosPerdidos} PTS` : `0 PTS`;
                totalPontos += pontosPerdidos;
                winnerText = `Vencedor: <span>${vencedorOficial}</span>`;
            }
        }

        // Renderiza o Card de Aposta
        predictionsList.innerHTML += `
            <div class="prediction-card ${statusClass}">
                <div class="prediction-header">
                    <span class="prediction-cat">${cat.nome}</span>
                    <span class="prediction-pts">${pointsLabel}</span>
                </div>
                <h3 class="prediction-title">${cat.nome}</h3>
                <div class="prediction-pick">Palpite: ${iconeMultiplicador}${meuPalpite}</div>
                ${winnerText ? `<div class="prediction-winner">${winnerText}</div>` : ""}
            </div>
        `;
    });

    // Atualiza o card superior com os pontos e nível calculados
    pointsEl.innerText = totalPontos;
    
    // Calcula um "Nível" falso e divertido baseado nos pontos
    let nivelCalculado = Math.floor(totalPontos / 50) + 1;
    if (nivelCalculado < 1) nivelCalculado = 1;
    levelEl.innerText = nivelCalculado;
}