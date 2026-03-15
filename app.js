import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"; // <- Linha nova
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

// Inicializando a Autenticação
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Lógica do Botão de Login
const btnLogin = document.getElementById("btn-login-google");

// Ouve se tem alguém logado ou não
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Se estiver logado, esconde o botão
        btnLogin.style.display = "none";
    } else {
        // Se não estiver, mostra o botão
        btnLogin.style.display = "inline-flex";
    }
});

// Ação de clique no botão
btnLogin.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Logado com sucesso!", result.user.displayName);
        })
        .catch((erro) => {
            console.error("Erro ao fazer login", erro);
            alert("Ocorreu um erro ao abrir o login do Google.");
        });
});


let participantes = [];
let gabarito = {};

function calcularEAtualizarRanking() {
    if (!gabarito) return;

    const rankingCalculado = participantes.map(p => {
        let pontosTotais = 0;
        categoriasOscar.forEach(categoria => {
            const idCategoria = categoria.id;
            const pesoBase = categoria.peso;
            const palpite = p.palpites ? p.palpites[idCategoria] : null;
            const vencedorOficial = gabarito[idCategoria];

            if (vencedorOficial && vencedorOficial !== "") {
                if (palpite === vencedorOficial) {
                    if (p.certeza_absoluta === idCategoria) pontosTotais += pesoBase * 3;
                    else pontosTotais += pesoBase;
                } else {
                    if (p.certeza_absoluta === idCategoria && palpite !== "") pontosTotais -= pesoBase;
                }
            }
        });
        return { ...p, pontos: pontosTotais };
    });

    rankingCalculado.sort((a, b) => b.pontos - a.pontos);

    const containerPodio = document.getElementById("podium-container");
    const containerLista = document.getElementById("ranking-list");
    containerPodio.innerHTML = "";
    containerLista.innerHTML = "";

    const top3 = rankingCalculado.slice(0, 3);
    const resto = rankingCalculado.slice(3);

    // ==========================================
    // 1. DESENHA O PÓDIO (Com Foto do Google)
    // ==========================================
    if (top3.length > 0) {
        const ordemVisual = [];
        if(top3[1]) ordemVisual.push({ ...top3[1], pos: 2 });
        ordemVisual.push({ ...top3[0], pos: 1 });
        if(top3[2]) ordemVisual.push({ ...top3[2], pos: 3 });

        ordemVisual.forEach(p => {
            // Verifica se o usuário tem foto. Se sim, cria a tag <img>. Se não, usa a letra.
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

    // ==========================================
    // 2. DESENHA A LISTA (Agora com miniaturas!)
    // ==========================================
    resto.forEach((p, index) => {
        const posicaoReal = index + 4;
        const corPontos = p.pontos < 0 ? "#ff4444" : "var(--text-main)"; 
        
        // Vamos colocar uma miniatura da foto na lista também para ficar mais premium
        const miniAvatarHTML = p.foto
            ? `<img src="${p.foto}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #444;">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface-light); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">${p.nome.charAt(0).toUpperCase()}</div>`;

        // Puxa o e-mail do usuário logado para destacar o card dele na lista
        const emailLogado = auth.currentUser ? auth.currentUser.email : "";
        const classeDestaque = p.email === emailLogado ? "is-me" : ""; 

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

onSnapshot(doc(db, "gabarito", "oscar2026"), (docSnapshot) => {
    gabarito = docSnapshot.exists() ? docSnapshot.data() : {};
    calcularEAtualizarRanking(); 
});

onSnapshot(collection(db, "participantes"), (snapshot) => {
    participantes = [];
    snapshot.forEach((doc) => participantes.push({ id: doc.id, ...doc.data() }));
    calcularEAtualizarRanking(); 
});