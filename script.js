// --- 1. CONFIGURATION ---
const supabaseUrl = 'https://nzkjxrvzqwdjprdgziha.supabase.co';
const supabaseKey = 'sb_publishable_XrvzJ7RfF7SX7X4m63hXKQ_Zyd0NsPr';
// Initialisation globale
supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const urlParams = new URLSearchParams(window.location.search);
let config = {};

// --- 2. INITIALISATION ---
window.onload = function() {
    const messageId = urlParams.get('id');
    if (messageId) {
        chargerMessageDepuisDB(messageId);
    } else {
        afficherHistorique();
    }
};

// --- 3. GÉNÉRER ET ENREGISTRER (CREATE.HTML) ---
async function genererLien() {
    const btn = document.getElementById('validate-btn');
    const data = {
        to: document.getElementById('input-to').value.trim(),
        hint: document.getElementById('input-hint').value.trim(),
        code1: document.getElementById('input-code1').value.trim(),
        code2: document.getElementById('input-code2').value.trim(),
        message: document.getElementById('input-msg').value.trim()
    };

    if (!data.to || !data.code1 || !data.message) {
        alert("Remplis les champs obligatoires !");
        return;
    }

    btn.innerText = "Création en cours...";
    btn.disabled = true;

    // INSERTION DANS SUPABASE
    const { data: record, error } = await supabase
        .from('secrets')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error("Erreur Supabase:", error);
        alert("Erreur lors de l'enregistrement. Vérifie ta console.");
        btn.innerText = "Réessayer";
        btn.disabled = false;
    } else {
        const finalUrl = `${window.location.origin}/index.html?id=${record.id}`;
        document.getElementById('final-url').value = finalUrl;
        document.getElementById('result-zone').classList.remove('hidden');
        btn.innerText = "Généré avec succès ! ✅";
        
        sauvegarderDansLeCache(data.to, record.id, finalUrl);
    }
}

// --- 4. LECTURE ET VÉRIFICATION (INDEX.HTML) ---
async function chargerMessageDepuisDB(id) {
    const { data, error } = await supabase.from('secrets').select('*').eq('id', id).single();
    if (data) {
        config = data;
        document.querySelectorAll('.dynamic-name').forEach(el => el.innerText = config.to);
        if (document.querySelector('.instruction')) {
            document.querySelector('.instruction').innerText = `Le code est ${config.hint} :`;
        }
    }
}

function checkCode() {
    const attempt = document.getElementById('answer').value.trim().toLowerCase();
    const c1 = config.code1.toLowerCase();
    const c2 = config.code2 ? config.code2.toLowerCase() : null;

    if (attempt === c1 || (c2 && attempt === c2)) {
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('message-screen').classList.remove('hidden');
        startTyping();
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

function startTyping() {
    let i = 0;
    const target = document.getElementById('text-target');
    const fullMsg = `${config.to}...\n\n${config.message}`;
    
    function type() {
        if (i < fullMsg.length) {
            let char = fullMsg.charAt(i);
            target.innerHTML += char === '\n' ? '<br>' : char;
            let d = char === '.' || char === '!' ? 1300 : 80;
            i++;
            setTimeout(type, d);
            document.getElementById('message-screen').scrollTo({top: 1000});
        } else {
            document.getElementById('reply-area')?.classList.remove('hidden');
        }
    }
    type();
}

// --- 5. RÉPONSE ET CACHE ---
async function envoyerReponseAnonyme(event) {
    event.preventDefault();
    const replyText = document.getElementById('reply-text').value;
    await supabase.from('secrets').update({ reponse: replyText }).eq('id', config.id);
    document.getElementById('valentine-form').classList.add('hidden');
    document.getElementById('success-msg').classList.remove('hidden');
}

function sauvegarderDansLeCache(nom, id, url) {
    let mesEnvois = JSON.parse(localStorage.getItem('mes_secrets') || "[]");
    mesEnvois.unshift({ id, nom, url, date: new Date().toLocaleDateString() });
    localStorage.setItem('mes_secrets', JSON.stringify(mesEnvois.slice(0, 5)));
    afficherHistorique();
}

async function afficherHistorique() {
    const liste = document.getElementById('liste-historique');
    if (!liste) return;
    let mesEnvois = JSON.parse(localStorage.getItem('mes_secrets') || "[]");
    if (mesEnvois.length > 0) {
        document.getElementById('historique-zone').classList.remove('hidden');
        // Optionnel : vérifier les réponses en temps réel ici
        liste.innerHTML = mesEnvois.map(item => `
            <div class="historique-item" style="margin-bottom: 10px; font-size: 0.8rem; background: #fff5f8; padding: 10px; border-radius: 10px;">
                <strong>${item.nom}</strong> (${item.date})<br>
                <button onclick="copierLienDirect('${item.url}')" style="font-size: 0.6rem; padding: 3px 8px;">Copier lien</button>
            </div>
        `).join('');
    }
}

function copierLien() {
    const copyText = document.getElementById('final-url');
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Lien copié ! 💌");
}
function copierLienDirect(url) {
    navigator.clipboard.writeText(url);
    alert("Lien récupéré ! 📋");
}