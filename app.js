import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

    if (top3.length > 0) {
        const ordemVisual = [];
        if(top3[1]) ordemVisual.push({ ...top3[1], pos: 2 });
        ordemVisual.push({ ...top3[0], pos: 1 });
        if(top3[2]) ordemVisual.push({ ...top3[2], pos: 3 });

        ordemVisual.forEach(p => {
            const inicial = p.nome.charAt(0).toUpperCase();
            containerPodio.innerHTML += `
                <div class="podium-item rank-${p.pos}">
                    <div class="podium-name">${p.nome}</div>
                    <div class="podium-pts">${p.pontos} pts</div>
                    <div class="podium-avatar">${inicial}</div>
                    <div class="podium-block">${p.pos}º</div>
                </div>
            `;
        });
    }

    resto.forEach((p, index) => {
        const posicaoReal = index + 4;
        const corPontos = p.pontos < 0 ? "#ff4444" : "var(--text-main)"; 
        const classeDestaque = p.nome === "Seu Nome" ? "is-me" : ""; // Temporário para teste visual

        containerLista.innerHTML += `
            <div class="ranking-card ${classeDestaque}">
                <div class="rank-info">
                    <span class="rank-position">${posicaoReal}</span>
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