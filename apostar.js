import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { categoriasOscar } from './dados.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
const provider = new GoogleAuthProvider();

let usuarioLogado = null;

// 1. OUVINTE DE LOGIN (Verifica se a pessoa está logada ao abrir a página)
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogado = user;
        // Opcional: Você pode preencher o campo "nome" automaticamente com user.displayName
        document.getElementById("nome").value = user.displayName;
    } else {
        alert("Você precisa fazer login primeiro!");
        window.location.href = "index.html";
    }
});

let meusPalpites = {};
const containerCategorias = document.getElementById("categorias-container");
const selectCerteza = document.getElementById("certeza_absoluta");

categoriasOscar.forEach(cat => {
    let htmlCategoria = `<h2 class="category-title">${cat.nome}</h2>`;
    cat.indicados.forEach(indicadoObj => {
        htmlCategoria += `
            <div class="nominee-card" data-categoria="${cat.id}" data-indicado="${indicadoObj.nome}">
                <img src="${indicadoObj.img}" class="nominee-img" alt="${indicadoObj.nome}">
                <div class="nominee-info">
                    <h3 class="nominee-name">${indicadoObj.nome}</h3>
                    <div class="nominee-stats">Vitória vale ${cat.peso} pts</div>
                    <button type="button" class="vote-btn">VOTAR</button>
                </div>
            </div>
        `;
    });
    containerCategorias.innerHTML += htmlCategoria;
    selectCerteza.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
});

document.querySelectorAll('.nominee-card').forEach(card => {
    card.addEventListener('click', function () {
        const categoriaClicada = this.getAttribute('data-categoria');
        const indicadoClicado = this.getAttribute('data-indicado');

        document.querySelectorAll(`.nominee-card[data-categoria="${categoriaClicada}"]`).forEach(c => {
            c.classList.remove('picked');
            c.querySelector('.vote-btn').innerText = "VOTAR";
        });

        this.classList.add('picked');
        this.querySelector('.vote-btn').innerText = "✔ ESCOLHIDO";
        meusPalpites[categoriaClicada] = indicadoClicado;
    });
});

const formAposta = document.getElementById("form-aposta");

formAposta.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!usuarioLogado) {
        alert("Você precisa estar logado para apostar!");
        signInWithPopup(auth, provider);
        return;
    }

    if (Object.keys(meusPalpites).length < categoriasOscar.length) {
        alert("Selecione um vencedor para todas as categorias!"); return;
    }

    const dadosDaAposta = {
        nome: document.getElementById("nome").value, // Ou usuarioLogado.displayName
        email: usuarioLogado.email, // Salva o email por segurança
        pontos: 0,
        palpites: meusPalpites,
        certeza_absoluta: document.getElementById("certeza_absoluta").value
    };

    const btnSubmit = formAposta.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Salvando..."; btnSubmit.style.opacity = "0.7";

    try {
        // MUDANÇA PRINCIPAL: Usamos setDoc e amarramos a aposta à ID do usuário
        await setDoc(doc(db, "participantes", usuarioLogado.uid), dadosDaAposta);

        alert("Sua cédula foi trancada! Boa sorte!");
        window.location.href = "index.html";
    } catch (erro) {
        alert("Erro ao salvar. Verifique se você está logado.");
        btnSubmit.innerText = "Confirmar Minhas Escolhas"; btnSubmit.style.opacity = "1";
    }
});