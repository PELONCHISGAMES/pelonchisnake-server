# Servidor Multijugador Online - PELONCHISNAKE 🐍🌐
**Pelonchis Games Studio** — [https://pelonchisgames.com/](https://pelonchisgames.com/)

Servidor autoritativo de alto rendimiento en Node.js + WebSockets con soporte para salas masivas simultáneas de **20, 45 y 80 jugadores**.

---

## 🚀 Características Principales

1. **Selector de Salas por Capacidad**:
   * **Sala Rápida (20 Jugadores)**: Arena compacta (Radio 2400) para combates frenéticos y directos.
   * **Sala Estándar (45 Jugadores)**: Arena media equilibrada (Radio 3500) para juego arcade continuo.
   * **Sala Masiva (80 Jugadores)**: Mega arena épica (Radio 4800) donde 80 serpientes compiten por la dominación total.
2. **Auto-Fill Inteligente con Bots**:
   * Las salas **nunca están vacías**. Si hay 3 jugadores humanos conectados en la sala de 80, el servidor genera 77 bots inteligentes.
   * A medida que entran nuevos jugadores reales, los bots son sustituidos limpiamente.
3. **Mecánicas 100% Sincronizadas**:
   * **¡Corte y Mordisco de Cola! (Tail Chomp)**: Al embestir la cola enemiga se corta y roba su masa (+25% Ki). Al chocar contra el torso se produce muerte fatal instantánea.
   * **Habilidades Definitivas**: Sincronización en tiempo real del Rayo Astral del Dragón, Pulso PEM del Mecha, Burbuja del Axolotl, Supernova de Pelonchis, etc.
   * **Clasificación en Vivo**: Top 10 en tiempo real visible para todos los jugadores de la sala.

---

## 💻 1. Cómo Jugar en Local (En tu Ordenador o Red Local / Wi-Fi)

1. Haz doble clic en el archivo **`iniciar_servidor.bat`**.
2. Verás en la consola que el servidor está escuchando en `http://localhost:3000` (WebSocket: `ws://localhost:3000`).
3. Abre el juego **PELONCHISNAKE** en tu navegador, selecciona **MULTIJUGADOR ONLINE**, elige tu sala (20, 45 u 80) y pulsa **¡A LUCHAR!**.
4. Para jugar con amigos en tu misma red Wi-Fi o mediante programas como Hamachi/Radmin, indícales tu IP local (por ejemplo `ws://192.168.1.50:3000`).

---

## ☁️ 2. Cómo Desplegarlo en Internet 100% Gratis (24/7 en la Nube)

Puedes alojar este servidor para que cualquier persona en el mundo juegue desde tu web de forma gratuita:

### Opción A: Render.com (Recomendado y Muy Sencillo)
1. Crea una cuenta gratuita en [https://render.com/](https://render.com/).
2. Haz clic en **"New +"** -> **"Web Service"**.
3. Sube esta carpeta a un repositorio privado de GitHub o usa la opción de despliegue directo.
4. Parámetros de configuración:
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Plan**: `Free`
5. Render te dará una URL segura automática como `wss://pelonchisnake.onrender.com`.
6. En tu juego PELONCHISNAKE, esa será la dirección del servidor multijugador.

### Opción B: Railway.app / Fly.io / VPS
* Sube los archivos `server.js` y `package.json` y ejecuta `npm start`. El servidor responderá en el puerto asignado por la variable de entorno `PORT`.

### Opción C: cPanel con "Setup Node.js App"
* Si tu hosting en Piensa Solutions incluye la herramienta **Setup Node.js App** de Passenger:
  1. Ve a tu cPanel -> **Setup Node.js App**.
  2. Crea una aplicación apuntando a la carpeta `servidor_multijugador`.
  3. Archivo de inicio: `server.js`.
  4. Pulsa **Run NPM Install** y luego **Start App**.
