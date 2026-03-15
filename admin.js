import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const containerAdmin = document.getElementById("admin-categorias-container");

categoriasOscar.forEach(cat => {
    let optionsHTML = '<option value="">Aguardando resultado...</option>';
    cat.indicados.forEach(indicadoObj => {
        // Atenção aqui: O admin usa o 'nome' do indicadoObj para o value
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

document.getElementById("form-admin").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    let gabaritoOficial = { ultima_atualizacao: new Date().toISOString() };

    categoriasOscar.forEach(cat => {
        const selectVencedor = document.getElementById(`vencedor_${cat.id}`);
        if (selectVencedor) gabaritoOficial[cat.id] = selectVencedor.value;
    });

    try {
        await setDoc(doc(db, "gabarito", "oscar2026"), gabaritoOficial);
        alert("✅ Resultados Oficiais Atualizados!");
    } catch (erro) {
        alert("Erro ao salvar o gabarito.");
    }
});