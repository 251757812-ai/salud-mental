(function () {
    "use strict";

    const CART_KEY = "servicios-digitales-cart-v1";
    const FAQ = [
        { terms: ["original", "origen", "magia", "originales"], answer: "Los productos que presentamos como originales son Netflix, Canva, Duolingo, YouTube Premium y la eSIM. Para los demás usamos informalmente la frase “con magia” para indicar que se consiguen o instalan; pregunta por condiciones y disponibilidad. No somos representantes oficiales de esas marcas." },
        { terms: ["compatible", "compatibilidad", "dispositivo", "telefono", "modelo"], answer: "La compatibilidad eSIM depende del modelo exacto, variante regional y bloqueo de red. Abre la ficha de eSIM para una búsqueda orientativa y confirma con el fabricante y proveedor." },
        { terms: ["esim", "e-sim"], answer: "Una eSIM es un perfil digital que se instala en un dispositivo compatible y normalmente desbloqueado. Cobertura, países, vigencia, activación y política de uso justo dependen del plan. Revisa la ficha del producto antes de cotizar." },
        { terms: ["precio", "costo", "cuesta", "cotizar"], answer: "Los precios visibles son orientativos. Si un servicio no muestra precio, se cotiza por WhatsApp según disponibilidad y detalles." },
        { terms: ["contratar", "compra", "carrito", "pedido"], answer: "Agrega los servicios al carrito y envía la solicitud por WhatsApp. El mensaje incluye los artículos y el total de los precios publicados; los servicios sin precio se cotizan." }
    ];

    function phone() {
        try {
            return CatalogStore.read().whatsapp.replace(/\D/g, "");
        } catch (error) {
            console.error(error);
            return CatalogStore.phone;
        }
    }

    function whatsappUrl(message) {
        return `https://wa.me/${phone()}?text=${encodeURIComponent(message)}`;
    }

    function readCart() {
        try {
            const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
            return Array.isArray(cart) ? cart.filter(item => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0) : [];
        } catch (error) {
            console.error("No se pudo leer el carrito.", error);
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCart();
    }

    function addToCart(id) {
        const service = CatalogStore.read().services.find(item => item.id === id);
        if (!service || !service.available) return;
        const cart = readCart();
        const item = cart.find(entry => entry.id === id);
        if (item) item.quantity += 1;
        else cart.push({ id, quantity: 1 });
        saveCart(cart);
        const status = document.getElementById("cart-message");
        if (status) {
            status.textContent = `${service.name} agregado al carrito.`;
            status.classList.remove("hidden");
        }
    }

    function renderCart() {
        const services = CatalogStore.read().services;
        const storedCart = readCart();
        const validIds = new Set(services.map(service => service.id));
        const cart = storedCart.filter(item => validIds.has(item.id));
        if (cart.length !== storedCart.length) localStorage.setItem(CART_KEY, JSON.stringify(cart));
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = String(count); });
        const list = document.getElementById("cart-items");
        const totalEl = document.getElementById("cart-total");
        if (!list || !totalEl) return;

        list.replaceChildren();
        let knownTotal = 0;
        let hasQuote = false;
        let hasUnavailable = false;
        cart.forEach(entry => {
            const service = services.find(item => item.id === entry.id);
            const row = document.createElement("div");
            row.className = "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3";
            const info = document.createElement("div");
            const name = document.createElement("p");
            name.className = "font-semibold";
            name.textContent = `${service.name} × ${entry.quantity}`;
            const price = document.createElement("p");
            price.className = "text-sm text-slate-600";
            price.textContent = Number.isFinite(service.price) ? CatalogStore.formatPrice(service.price * entry.quantity) : "Precio por cotizar";
            const availability = document.createElement("p");
            availability.className = service.available ? "hidden" : "text-sm font-semibold text-amber-800";
            availability.textContent = "Agotado temporalmente: quítalo del carrito para continuar.";
            info.append(name, price, availability);
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50";
            remove.textContent = "Quitar";
            remove.addEventListener("click", () => saveCart(readCart().filter(item => item.id !== entry.id)));
            row.append(info, remove);
            list.append(row);
            if (Number.isFinite(service.price) && service.price >= 0) knownTotal += service.price * entry.quantity;
            else hasQuote = true;
            if (!service.available) hasUnavailable = true;
        });
        totalEl.textContent = `${CatalogStore.formatPrice(knownTotal)}${hasQuote ? " + servicios por cotizar" : ""}`;
        const empty = document.getElementById("cart-empty");
        if (empty) empty.classList.toggle("hidden", cart.length > 0);
        const sendButton = document.getElementById("cart-send");
        if (sendButton) {
            sendButton.disabled = hasUnavailable || cart.length === 0;
            sendButton.classList.toggle("cursor-not-allowed", sendButton.disabled);
            sendButton.classList.toggle("opacity-50", sendButton.disabled);
        }
    }

    function openChat() {
        const panel = document.getElementById("support-chat-panel");
        if (!panel) return;
        panel.classList.remove("hidden");
        document.getElementById("chat-input")?.focus();
    }

    function answerQuestion(question) {
        const normalized = question.toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized.includes("esim") && ["compatible", "compatibilidad", "dispositivo", "telefono", "modelo"].some(term => normalized.includes(term))) {
            return FAQ[1].answer;
        }
        const aliases = {
            "canva-pro": ["canva"],
            "youtube-premium": ["youtube"],
            "esim-datos-ilimitados": ["esim"],
            "duolingo-plus": ["duolingo", "xp", "experiencia", "puntos de experiencia", "tareas"],
            "adobe-creative-cloud": ["adobe", "creative cloud"],
            "microsoft-office": ["microsoft", "office"]
        };
        const product = CatalogStore.read().services.find(service => {
            const names = [service.name, service.id.replace(/-/g, " "), ...(aliases[service.id] || [])];
            return names.some(name => {
                const normalizedName = name.toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return normalizedName && normalized.includes(normalizedName);
            });
        });
        if (product) {
            const availability = product.available ? "Disponible para consultar." : "Agotado temporalmente.";
            const price = CatalogStore.formatPrice(product.price);
            return `${product.name}: ${product.details || product.description} ${availability} Precio: ${price}.`;
        }
        const generalAnswer = FAQ.find(item => item.terms.some(term => normalized.includes(term)));
        if (generalAnswer) return generalAnswer.answer;
        return "Solo puedo responder dudas sobre los productos del catálogo, sus características, eSIM, precios y pedidos. Para otra pregunta, usa el botón de soporte por WhatsApp.";
    }

    function installWidgets() {
        const footer = document.querySelector("footer");
        if (footer && !document.getElementById("support-footer")) {
            const link = document.createElement("a");
            link.id = "support-footer";
            link.href = "#support-chat";
            link.className = "mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 px-5 py-3 font-semibold text-indigo-800 hover:bg-indigo-50";
            link.innerHTML = '<i class="fa-solid fa-headset" aria-hidden="true"></i> Soporte y preguntas frecuentes';
            link.addEventListener("click", event => { event.preventDefault(); openChat(); });
            const footerContent = footer.querySelector(".max-w-4xl") || footer;
            footerContent.append(link);
        }

        if (document.getElementById("support-chat-panel")) return;
        const root = document.createElement("div");
        root.innerHTML = `
            <div id="support-chat-panel" class="hidden fixed bottom-24 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-label="Chat de soporte">
                <div class="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                    <div><p class="font-semibold">Ayuda rápida</p><p class="text-xs text-slate-300">Información de productos y proyectos</p></div>
                    <button id="chat-close" type="button" class="rounded p-2 hover:bg-slate-700" aria-label="Cerrar chat">✕</button>
                </div>
                <div id="chat-messages" class="max-h-64 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
                    <p class="rounded-xl bg-slate-100 p-3">¡Hola! Puedo responder dudas frecuentes sobre productos, eSIM, proyectos y cotizaciones.</p>
                    <div id="chat-topics" class="flex flex-wrap gap-2">
                        <button type="button" data-question="¿Qué significa originales y con magia?" class="rounded-full bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Origen</button>
                        <button type="button" data-question="¿Cómo revisar la compatibilidad del dispositivo con eSIM?" class="rounded-full bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Compatibilidad eSIM</button>
                        <button type="button" data-question="¿Cómo se cotizan los precios?" class="rounded-full bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Precios</button>
                    </div>
                </div>
                <form id="chat-form" class="flex gap-2 border-t border-slate-200 p-3">
                    <label class="sr-only" for="chat-input">Escribe tu duda sobre los productos</label>
                    <input id="chat-input" maxlength="300" required class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Escribe tu duda...">
                    <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white" type="submit">Enviar</button>
                </form>
            </div>
            <button id="support-chat" type="button" class="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-indigo-700 px-5 py-3 font-semibold text-white shadow-lg hover:bg-indigo-800" aria-expanded="false">
                <i class="fa-solid fa-comments" aria-hidden="true"></i> Soporte
            </button>
            <div id="cart-modal" class="hidden fixed inset-0 z-[60] items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cart-title">
                <section class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                    <div class="flex items-center justify-between gap-4">
                        <h2 id="cart-title" class="text-xl font-bold">Tu carrito</h2>
                        <button id="cart-close" type="button" class="rounded-lg px-3 py-2 hover:bg-slate-100" aria-label="Cerrar carrito">✕</button>
                    </div>
                    <p id="cart-empty" class="py-6 text-slate-600">Aún no agregas productos.</p>
                    <div id="cart-items" class="max-h-72 overflow-y-auto"></div>
                    <p class="mt-4 flex justify-between gap-3 font-bold"><span>Total</span><span id="cart-total">$0.00</span></p>
                    <p class="mt-2 text-xs text-slate-500">Los precios por cotizar no se incluyen en la suma. El pedido se confirma por WhatsApp; esta beta no procesa pagos.</p>
                    <button id="cart-send" type="button" class="mt-5 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700">Enviar pedido por WhatsApp</button>
                </section>
            </div>`;
        document.body.append(root);
        const cartButton = document.createElement("button");
        cartButton.type = "button";
        cartButton.className = "fixed bottom-5 right-36 z-40 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 shadow-lg hover:bg-slate-50";
        cartButton.innerHTML = 'Carrito <span class="ml-1 rounded-full bg-indigo-700 px-2 py-0.5 text-xs text-white" data-cart-count>0</span>';
        cartButton.addEventListener("click", () => {
            const modal = document.getElementById("cart-modal");
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            renderCart();
        });
        document.body.append(cartButton);
        document.getElementById("support-chat").addEventListener("click", () => {
            const panel = document.getElementById("support-chat-panel");
            panel.classList.toggle("hidden");
            document.getElementById("support-chat").setAttribute("aria-expanded", String(!panel.classList.contains("hidden")));
        });
        document.getElementById("chat-close").addEventListener("click", () => document.getElementById("support-chat-panel").classList.add("hidden"));
        document.getElementById("chat-form").addEventListener("submit", event => {
            event.preventDefault();
            const input = document.getElementById("chat-input");
            sendChat(input.value);
            input.value = "";
        });
        document.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => sendChat(button.dataset.question)));
        const topics = document.getElementById("chat-topics");
        CatalogStore.read().services.forEach(service => {
            const topic = document.createElement("button");
            topic.type = "button";
            topic.dataset.question = `¿Qué información hay sobre ${service.name}?`;
            topic.className = "rounded-full bg-indigo-50 px-3 py-2 text-xs text-indigo-800";
            topic.textContent = service.name;
            topics.append(topic);
            topic.addEventListener("click", () => sendChat(topic.dataset.question));
        });
        document.getElementById("cart-close").addEventListener("click", closeCart);
        document.getElementById("cart-modal").addEventListener("click", event => {
            if (event.target.id === "cart-modal") closeCart();
        });
        document.getElementById("cart-send").addEventListener("click", () => {
            const cart = readCart();
            if (!cart.length) return;
            const services = CatalogStore.read().services;
            if (cart.some(entry => {
                const service = services.find(item => item.id === entry.id);
                return !service || !service.available;
            })) {
                renderCart();
                return;
            }
            let total = 0;
            let hasQuote = false;
            const lines = cart.map(entry => {
                const service = services.find(item => item.id === entry.id);
                if (!service) return null;
                if (Number.isFinite(service.price) && service.price >= 0) total += service.price * entry.quantity;
                else hasQuote = true;
                return `- ${service.name} x${entry.quantity}: ${Number.isFinite(service.price) ? CatalogStore.formatPrice(service.price * entry.quantity) : "por cotizar"}`;
            }).filter(Boolean);
            const message = `Hola, quiero cotizar/contratar este pedido:\n${lines.join("\n")}\nTotal de precios publicados: ${CatalogStore.formatPrice(total)}${hasQuote ? " + productos por cotizar" : ""}. ¿Me confirman disponibilidad y condiciones?`;
            window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
        });
        document.addEventListener("click", event => {
            const button = event.target.closest("[data-add-to-cart]");
            if (button) addToCart(button.dataset.addToCart);
        });
        window.addEventListener("storage", event => {
            if (event.key === CatalogStore.storageKey) renderCart();
        });
        document.querySelectorAll("[data-whatsapp-link]").forEach(link => {
            link.href = whatsappUrl(link.dataset.message || "Hola, quisiera información sobre sus servicios.");
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });
        renderCart();
    }

    function closeCart() {
        const modal = document.getElementById("cart-modal");
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }

    function sendChat(question) {
        const messages = document.getElementById("chat-messages");
        const user = document.createElement("p");
        user.className = "ml-8 rounded-xl bg-indigo-50 p-3 text-right";
        user.textContent = question;
        const answer = document.createElement("p");
        answer.className = "mr-8 rounded-xl bg-slate-100 p-3";
        answer.textContent = answerQuestion(question);
        messages.append(user, answer);
        messages.scrollTop = messages.scrollHeight;
    }

    document.addEventListener("DOMContentLoaded", () => {
        CatalogStore.initialize().then(installWidgets).catch(error => {
            const notice = document.createElement("p");
            notice.className = "fixed bottom-5 left-5 z-50 max-w-md rounded-xl bg-red-50 p-4 text-sm text-red-900 shadow";
            notice.setAttribute("role", "alert");
            notice.textContent = `No se pudo conectar con el catálogo: ${error.message}`;
            document.body.append(notice);
        });
    });
}());
