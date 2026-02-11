// --- 1. CONFIGURATION ---
const supabaseUrl = 'https://nzkjxrvzqwdjprdgziha.supabase.co';
const supabaseKey = 'sb_publishable_XrvzJ7RfF7SX7X4m63hXKQ_Zyd0NsPr';
// Initialisation globale
supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variables globales
const urlParams = new URLSearchParams(window.location.search);
let config = {}; 

// =================================================================
// 2. INITIALISATION AU CHARGEMENT
// =================================================================
window.onload = function() {
    const messageId = urlParams.get('id');
    const isCreationPage = document.getElementById('input-to'); // Détecte la page création

    // Initialisation des animations (Ajouté pour le design)
    initAnimations();

    // CAS 1 : Lecture d'un message (index.html?id=...)
    if (messageId) {
        chargerMessageDepuisDB(messageId);
    } 
    // CAS 2 : Page de création (create.html)
    else if (isCreationPage) {
        // C'est ici qu'on charge l'historique ET les réponses
        afficherHistorique(); 
    }
    // CAS 3 : Accueil sans lien -> Redirection vers création
    else {
        window.location.href = "create.html";
    }
};

// =================================================================
// 3. PARTIE LECTURE (index.html)
// =================================================================

async function chargerMessageDepuisDB(id) {
    const { data, error } = await supabase
        .from('secrets')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error("Erreur:", error);
        alert("Ce lien semble invalide ou a expiré 😢");
        return;
    }

    config = data; 

    // Textes dynamiques
    document.querySelectorAll('.dynamic-name').forEach(el => el.innerText = config.to);

    // Indice
    const instructionBox = document.querySelector('.instruction');
    if (instructionBox) {
        const indice = config.hint ? config.hint : "le code secret";
        instructionBox.innerHTML = `L'indice est : <strong>${indice}</strong>`;
    }

    // Affichage de l'écran de verrouillage
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) lockScreen.classList.remove('hidden');
}

function checkCode() {
    const input = document.getElementById('answer');
    const attempt = input.value.trim().toLowerCase();
    
    const c1 = config.code1 ? config.code1.toLowerCase() : "";
    const c2 = config.code2 ? config.code2.toLowerCase() : null;

    if (attempt === c1 || (c2 && attempt === c2)) {
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('message-screen').classList.remove('hidden');
        startTyping();
    } else {
        const errorMsg = document.getElementById('error-msg');
        errorMsg.style.display = 'block';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
    }
}

function startTyping() {
    let i = 0;
    const target = document.getElementById('text-target');
    const fullMsg = `Mon message pour toi, ${config.to}...\n\n${config.message}`;
    
    function type() {
        if (i < fullMsg.length) {
            let char = fullMsg.charAt(i);
            target.innerHTML += char === '\n' ? '<br>' : char;
            
            let delay = 50; 
            if (char === '.' || char === '!' || char === '?') delay = 800;
            else if (char === ',') delay = 300;
            
            i++;
            setTimeout(type, delay);
            
            // Scroll auto
            const envelope = document.querySelector('.envelope');
            if (envelope) envelope.scrollTop = envelope.scrollHeight;
        } else {
            const replyArea = document.getElementById('reply-area');
            if (replyArea) replyArea.classList.remove('hidden');
        }
    }
    type();
}

async function envoyerReponseAnonyme(event) {
    event.preventDefault();
    const btn = document.getElementById('send-reply');
    const replyText = document.getElementById('reply-text').value;

    if (!replyText.trim()) return;

    btn.innerText = "Envoi...";
    btn.disabled = true;

    const { error } = await supabase
        .from('secrets')
        .update({ reponse: replyText })
        .eq('id', config.id);

    if (error) {
        alert("Erreur lors de l'envoi.");
        btn.innerText = "Réessayer";
        btn.disabled = false;
    } else {
        document.getElementById('valentine-form').classList.add('hidden');
        document.getElementById('success-msg').classList.remove('hidden');
    }
}

// =================================================================
// 4. PARTIE CRÉATION (create.html)
// =================================================================

async function genererLien() {
    console.log("Bouton cliqué !"); 

    // Sécurité : Vérifie qu'on est bien sur la page création
    if (!document.getElementById('input-to')) return;

    const btn = document.getElementById('validate-btn');
    const data = {
        to: document.getElementById('input-to').value.trim(),
        hint: document.getElementById('input-hint').value.trim(),
        code1: document.getElementById('input-code1').value.trim(),
        code2: document.getElementById('input-code2').value.trim(),
        message: document.getElementById('input-msg').value.trim()
    };

    if (!data.to || !data.code1 || !data.message) {
        alert("Merci de remplir le Prénom, le Code 1 et le Message !");
        return;
    }

    btn.innerText = "Création...";
    btn.disabled = true;

    // Envoi vers Supabase
    const { data: record, error } = await supabase
        .from('secrets')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error("Erreur Supabase:", error);
        alert("Erreur de connexion (voir console). Vérifie ton URL Supabase.");
        btn.innerText = "Réessayer";
        btn.disabled = false;
    } else {
        const finalUrl = `${window.location.origin}/index.html?id=${record.id}`;
        
        document.getElementById('final-url').value = finalUrl;
        document.getElementById('result-zone').classList.remove('hidden');
        btn.innerText = "Généré avec succès ! ✅";
        
        // On sauvegarde et on rafraîchit l'historique
        sauvegarderDansLeCache(data.to, record.id, finalUrl);
    }
}

// =================================================================
// 5. HISTORIQUE & RÉPONSES
// =================================================================

function sauvegarderDansLeCache(nom, id, url) {
    let mesEnvois = JSON.parse(localStorage.getItem('mes_secrets') || "[]");
    mesEnvois.unshift({ 
        id, 
        nom, 
        url, 
        date: new Date().toLocaleDateString() 
    });
    localStorage.setItem('mes_secrets', JSON.stringify(mesEnvois.slice(0, 5)));
    
    // Une fois sauvegardé, on réaffiche la liste (ça lancera la vérif des réponses)
    afficherHistorique();
}

async function afficherHistorique() {
    const liste = document.getElementById('liste-historique');
    if (!liste) return;

    let mesEnvois = JSON.parse(localStorage.getItem('mes_secrets') || "[]");
    
    if (mesEnvois.length === 0) return;

    document.getElementById('historique-zone').classList.remove('hidden');
    liste.innerHTML = "<p style='font-size:0.8rem; color:#666; text-align:center;'>Actualisation des réponses...</p>";

    // 1. On prend tous les IDs de ton historique
    const ids = mesEnvois.map(item => item.id);
    
    // 2. On demande à Supabase les infos pour ces IDs
    const { data: secretsEnLigne, error } = await supabase
        .from('secrets')
        .select('id, reponse')
        .in('id', ids);

    if (error) {
        console.error("Erreur récup réponses:", error);
        renderList(mesEnvois, []); 
        return;
    }

    // 3. On affiche la liste complète avec les réponses
    renderList(mesEnvois, secretsEnLigne);
}

function renderList(mesEnvois, secretsEnLigne) {
    const liste = document.getElementById('liste-historique');
    
    liste.innerHTML = mesEnvois.map(item => {
        // On cherche la réponse correspondante
        const infoDb = secretsEnLigne.find(s => s.id === item.id);
        const reponseRecue = infoDb ? infoDb.reponse : null;
        
        // HTML de la réponse
        let statusHtml = '';
        if (reponseRecue && reponseRecue.trim() !== "") {
            statusHtml = `
                <div style="margin-top:10px; padding:10px; background:#d4edda; color:#155724; border-radius:8px; font-size:0.9rem; border:1px solid #c3e6cb;">
                    <strong>💌 Elle a répondu :</strong><br>
                    <span style="font-style:italic;">"${reponseRecue}"</span>
                </div>`;
        } else {
            statusHtml = `<div style="font-size:0.75rem; color:#999; margin-top:5px; font-style:italic;">Pas encore de réponse... ⏳</div>`;
        }

        return `
            <div style="margin-bottom: 15px; font-size: 0.9rem; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#d63384;">Pour : ${item.nom}</strong>
                        <div style="color:#bbb; font-size:0.7rem;">${item.date}</div>
                    </div>
                    <button onclick="copierLienDirect('${item.url}')" style="background:#f8f9fa; border:1px solid #ddd; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.75rem;">Copier</button>
                </div>
                ${statusHtml}
            </div>
        `;
    }).join('');
}

// --- UTILITAIRES ---

function copierLien() {
    const copyText = document.getElementById('final-url');
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert("Lien copié ! 💌");
    });
}

function copierLienDirect(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("Lien copié !");
    });
}

// =================================================================
// 6. ANIMATIONS & DESIGN (AJOUTÉ POUR TOI)
// =================================================================

function initAnimations() {
    createBackgroundPetals();
    attachButtonEffects();
}

// --- A. Pétales qui tombent en fond ---
function createBackgroundPetals() {
    const container = document.body;
    
    // On lance la boucle de création
    setInterval(() => {
        const petal = document.createElement('div');
        petal.classList.add('falling-petal');
        
        // Taille aléatoire (plus petit pour le réalisme)
        const size = Math.random() * 15 + 8; 
        petal.style.width = `${size}px`;
        petal.style.height = `${size}px`;
        
        // Position horizontale aléatoire
        petal.style.left = `${Math.random() * 100}vw`;
        
        // Durée de chute aléatoire
        const duration = Math.random() * 5 + 6; 
        petal.style.animationDuration = `${duration}s`;
        
        // Décalage pour ne pas que tous commencent pareil
        petal.style.animationDelay = `-${Math.random() * 5}s`;

        container.appendChild(petal);

        // Nettoyage pour ne pas saturer la mémoire
        setTimeout(() => { petal.remove(); }, duration * 1000);
    }, 400); 
}

// --- B. Explosion de pétales au clic ---
function attachButtonEffects() {
    // On attend un peu que le DOM soit prêt, puis on attache l'event
    setTimeout(() => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Créer 20 mini pétales
                for(let i=0; i<20; i++) {
                    createExplosionPetal(e.clientX, e.clientY);
                }
            });
        });
    }, 500);
}

function createExplosionPetal(x, y) {
    const petal = document.createElement('div');
    petal.classList.add('click-petal');
    document.body.appendChild(petal);

    // Couleurs : Blanc, Or, Rouge clair
    const colors = ['#ffffff', '#ffd700', '#ff8fa3'];
    petal.style.background = colors[Math.floor(Math.random() * colors.length)];

    // Position de départ
    petal.style.left = `${x}px`;
    petal.style.top = `${y}px`;

    // Calcul de la trajectoire d'explosion
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 120 + 60; // Distance
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rot = Math.random() * 360;

    // Variables CSS pour l'animation
    petal.style.setProperty('--tx', `${tx}px`);
    petal.style.setProperty('--ty', `${ty}px`);
    petal.style.setProperty('--rot', `${rot}deg`);

    // Suppression après animation
    setTimeout(() => { petal.remove(); }, 800);
}