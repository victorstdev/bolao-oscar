import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"; // <-- Adicionamos o getDoc aqui
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { categoriasOscar } from './dados.js';

// ==========================================
// 1. CONFIGURAÇÃO (COLOQUE SUAS CHAVES AQUI)
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
// 2. SEGURANÇA (COLOQUE A SUA UID AQUI)
// ==========================================
const UID_DO_ADMIN = "sQWpepd3HlMUeFFMk0ks3Xpcvll2"; 
let usuarioLogado = null;

// ==========================================
// 3. CONTROLE DE ACESSO
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogado = user;
        
        if (user.uid !== UID_DO_ADMIN) {
            alert("Acesso negado. Você não é o administrador.");
            window.location.href = "index.html"; 
        } else {
            // Se for o Admin, desenha a tela e DEPOIS busca os dados salvos
            montarPainelAdmin();
            carregarGabaritoAtual(); // <-- Nova função chamada aqui!
        }
    } else {
        alert("Você precisa fazer login primeiro!");
        window.location.href = "index.html";
    }
});

// ==========================================
// 4. FUNÇÕES DE TELA
// ==========================================
function montarPainelAdmin() {
    const containerAdmin = document.getElementById("admin-categorias-container");
    containerAdmin.innerHTML = ""; 

    categoriasOscar.forEach(cat => {
        let optionsHTML = '<option value="">Aguardando resultado...</option>';
        
        cat.indicados.forEach(indicadoObj => {
            optionsHTML += `<option value="${indicadoObj.nome}">${indicadoObj.nome}</option>`;
        });

        containerAdmin.innerHTML += `
            <div class="form-group" style="margin-bottom: 20px;">
                <label for="vencedor_${cat.id}" style="color: var(--gold); display: block; margin-bottom: 8px;">🏆 ${cat.nome}:</label>
                <select id="vencedor_${cat.id}" class="dark-input" style="margin-bottom: 0;">
                    ${optionsHTML}
                </select>
            </div>
        `;
    });
}

// NOVA FUNÇÃO: Busca os dados que já estão no banco e preenche as caixinhas
async function carregarGabaritoAtual() {
    try {
        const docRef = doc(db, "gabarito", "oscar2026");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dadosAtual = docSnap.data();
            
            // Percorre todas as categorias e muda o select para o vencedor que já estava salvo
            categoriasOscar.forEach(cat => {
                const selectEl = document.getElementById(`vencedor_${cat.id}`);
                if (selectEl && dadosAtual[cat.id]) {
                    selectEl.value = dadosAtual[cat.id];
                }
            });
        }
    } catch (error) {
        console.error("Erro ao carregar gabarito", error);
    }
}

// ==========================================
// 5. SALVAR NO FIREBASE
// ==========================================
const formAdmin = document.getElementById("form-admin");

formAdmin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    
    if(!usuarioLogado || usuarioLogado.uid !== UID_DO_ADMIN) {
        alert("Operação bloqueada!");
        return;
    }

    const btnSubmit = document.querySelector('#form-admin button[type="submit"]');
    btnSubmit.innerText = "Publicando Resultados...";
    btnSubmit.disabled = true;

    let gabaritoOficial = { ultima_atualizacao: new Date().toISOString() };

    categoriasOscar.forEach(cat => {
        const selectVencedor = document.getElementById(`vencedor_${cat.id}`);
        // Salva tudo que estiver na tela no objeto
        if (selectVencedor) {
            gabaritoOficial[cat.id] = selectVencedor.value;
        }
    });

    try {
        // A MÁGICA AQUI: O { merge: true } garante que só vamos atualizar os campos, sem deletar o documento inteiro acidentalmente
        await setDoc(doc(db, "gabarito", "oscar2026"), gabaritoOficial, { merge: true });
        
        alert("✅ Resultados Oficiais Atualizados! O ranking foi recalculado.");
        btnSubmit.innerText = "Publicar Resultados";
        btnSubmit.disabled = false;
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao salvar o gabarito.");
        btnSubmit.innerText = "Publicar Resultados";
        btnSubmit.disabled = false;
    }
});