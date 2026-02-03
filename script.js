const positions = [
    { nom: "L'Étreinte du Lotus", desc: "Face à face, pour une connexion intense et profonde.", diff: "Douceur", icon: "🧘" },
    { nom: "La Cascade", desc: "Un jeu de hauteur pour varier les sensations.", diff: "Acrobate", icon: "🤸" },
    { nom: "Le Papillon", desc: "Légèreté et rythme pour pimenter la soirée.", diff: "Passion", icon: "🦋" },
    { nom: "La Cuillère", desc: "Proximité totale et tendresse infinie.", diff: "Câlin", icon: "🥄" }
];

let positionActuelle = null;

function lancerRoulette() {
    const btn = document.getElementById('spin-btn');
    const card = document.getElementById('display-card');
    
    btn.disabled = true;
    btn.innerText = "Le destin choisit...";
    card.style.opacity = "0.5";

    setTimeout(() => {
        const index = Math.floor(Math.random() * positions.length);
        positionActuelle = positions[index];
        
        card.classList.remove('empty');
        card.style.opacity = "1";
        card.innerHTML = `
            <div style="font-size: 3rem">${positionActuelle.icon}</div>
            <h2 style="color:#d63384">${positionActuelle.nom}</h2>
            <div class="badge">${positionActuelle.diff}</div>
            <p>${positionActuelle.desc}</p>
        `;
        
        document.getElementById('share-zone').classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = "Tirer une autre position";
    }, 1000);
}

function partager() {
    if(!positionActuelle) return;
    const texte = encodeURIComponent(`🔥 Défi Saint-Valentin : On tente la position "${positionActuelle.nom}" ce soir ? Cap ou pas cap ? 🌹`);
    window.open(`https://wa.me/?text=${texte}`, '_blank');
}