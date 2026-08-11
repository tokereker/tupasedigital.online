import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCaRKtx54HYM5jXB2DgtZeLciUNB7Inqjw",
    authDomain: "wedding-crm-6853f.firebaseapp.com",
    projectId: "wedding-crm-6853f",
    storageBucket: "wedding-crm-6853f.firebasestorage.app",
    messagingSenderId: "956437103756",
    appId: "1:956437103756:web:b2d27aad4e6bfded7327a9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let eventDataConfig = null;
let currentEventId = null;
let currentGuestId = null;
// NUEVA VARIABLE: Aquí guardaremos las mesas de tu CRM
let mesasDelEvento = []; 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('u');
    currentGuestId = urlParams.get('id');

    if (!currentEventId) {
        document.getElementById('g-event-name').innerText = "Enlace Inválido";
        document.getElementById('g-menu-text').innerText = "No se detectó un código de evento válido en tu enlace.";
        return;
    }

    iniciarEscuchaInvitado(currentEventId);
});

function iniciarEscuchaInvitado(eventId) {
    const docRef = doc(db, 'artifacts', 'weddingflow', 'users', eventId);
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            eventDataConfig = data.config || {};
            
            // Atrapamos las mesas dinámicas de tu CRM
            mesasDelEvento = data.mesas || [];
            
            const eventType = data.eventType || "Evento";
            let nombresFormateados = currentEventId.toUpperCase().replace('Y', ' y ');
            document.getElementById('g-event-name').innerText = `${eventType} de ${nombresFormateados}`;

            const menuText = eventDataConfig.menuText || "";
            document.getElementById('g-menu-text').innerText = menuText.trim() !== "" ? menuText : "El menú será revelado pronto.";

            if (eventDataConfig.themeColor) {
                document.getElementById('guest-header').style.backgroundColor = eventDataConfig.themeColor;
            }
        } else {
            document.getElementById('g-event-name').innerText = "Evento Finalizado";
            document.getElementById('g-menu-text').innerText = "La información de este evento ya no está disponible.";
        }
    }, (error) => {
        console.error("Error de Firebase:", error);
    });
}

window.abrirLinkDJ = async function() {
    if (!currentEventId) return;

    const { value: cancion } = await Swal.fire({
        title: '🎵 Pide tu canción',
        text: '¿Qué canción quieres escuchar en la pista?',
        input: 'text',
        inputPlaceholder: 'Ej. La Chona - Los Tucanes de Tijuana',
        showCancelButton: true,
        confirmButtonText: 'Enviar al DJ',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8b5cf6', // Color morado DJ
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'Escribe el nombre de la canción o artista';
            }
        }
    });

    if (cancion) {
        try {
            const cancionesRef = collection(db, 'artifacts', 'weddingflow', 'users', currentEventId, 'canciones');
            await addDoc(cancionesRef, {
                cancion: cancion.trim(),
                hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                timestamp: Date.now(),
                estado: 'pendiente'
            });

            Swal.fire({
                icon: 'success',
                title: '¡Petición Enviada!',
                text: 'La canción ha sido enviada a la cabina del DJ. ¡Atento a la pista!',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Error al enviar petición al DJ:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo enviar tu petición.' });
        }
    }
};

window.llamarMesero = async function(peticion) {
    if (!currentEventId) return;

    // Construimos la lista de opciones para SweetAlert
    // Primero, agregamos la "Mesa Principal" por defecto
    let opcionesMesas = {
        "Mesa Principal": "Mesa Principal"
    };

    // Luego, inyectamos las mesas de tu CRM
    mesasDelEvento.forEach(mesa => {
        // Usa el nombre de tu CRM (Ej. "Mesa 1", "Mesa Amigos")
        opcionesMesas[mesa.nombre] = mesa.nombre; 
    });

    const { value: mesaElegida } = await Swal.fire({
        title: 'Servicio a Mesa',
        text: `Se enviará una notificación al staff para: ${peticion}. ¿En qué mesa estás sentado?`,
        input: 'select',
        inputOptions: opcionesMesas,
        inputPlaceholder: 'Selecciona tu mesa...',
        showCancelButton: true, 
        confirmButtonText: 'Enviar Notificación', 
        cancelButtonText: 'Cancelar',
        confirmButtonColor: eventDataConfig?.themeColor || '#10b981',
        inputValidator: (value) => {
            if (!value) {
                return 'Por favor selecciona una mesa de la lista';
            }
        }
    });

    if (mesaElegida) {
        try {
            const alertasRef = collection(db, 'artifacts', 'weddingflow', 'users', currentEventId, 'alertas');
            await addDoc(alertasRef, {
                mesa: mesaElegida.toUpperCase(),
                peticion: peticion,
                hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                timestamp: Date.now(),
                estado: 'pendiente'
            });
            
            Swal.fire({ icon: 'success', title: '¡Aviso Enviado!', text: `El staff ha sido notificado y se dirige a la ${mesaElegida}.`, timer: 4000, showConfirmButton: false });
        } catch (error) {
            console.error("Error al enviar notificación:", error);
            Swal.fire({ icon: 'error', title: 'Ups...', text: 'No pudimos enviar el aviso por problemas de conexión. Por favor llama al mesero directamente.' });
        }
    }
};
