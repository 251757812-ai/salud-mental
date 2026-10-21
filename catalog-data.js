(function () {
    "use strict";

    const STORAGE_KEY = "servicios-digitales-beta-v1";
    const WHATSAPP = "5215531318466";
    const CATALOG_VERSION = 5;
    let supabaseClient = null;
    let remoteEnabled = false;
    let adminAuthorized = false;
    let initializationPromise = null;
    const products = [
        {
            id: "canva-pro",
            name: "Canva Pro",
            description: "Diseña con plantillas, recursos premium y herramientas creativas para tus proyectos.",
            details: "Canva Pro reúne herramientas de diseño, plantillas y recursos premium para crear presentaciones, publicaciones y materiales visuales. La disponibilidad y el tipo de acceso se confirman al cotizar.",
            price: 49,
            icon: "fa-palette",
            color: "blue",
            image: "canva pro.avif",
            original: true,
            available: true
        },
        {
            id: "duolingo-plus",
            name: "XP de Duolingo para tareas",
            description: "Puntos de experiencia (XP) para completar las tareas de Duolingo que tus profesores hayan asignado.",
            details: "Comparte las tareas de Duolingo que te hayan asignado tus profesores, la cantidad de experiencia que necesitas y la fecha límite. Confirmaremos por WhatsApp el alcance, precio y disponibilidad antes de aceptar el pedido.",
            price: 25,
            icon: "fa-language",
            color: "green",
            image: "doulingo.png",
            original: true,
            available: true
        },
        {
            id: "youtube-premium",
            name: "YouTube Premium",
            description: "Disfruta contenido sin anuncios y consulta las opciones de suscripción disponibles.",
            details: "La suscripción Premium incluye funciones como reproducción sin anuncios y reproducción en segundo plano, según el plan contratado y las condiciones vigentes del proveedor.",
            price: 49,
            icon: "fa-brands fa-youtube",
            color: "red",
            image: "youtube premium.png",
            original: true,
            available: true
        },
        {
            id: "netflix",
            name: "Netflix",
            description: "Consulta disponibilidad, plan y duración antes de contratar.",
            details: "Servicio de entretenimiento en streaming. Los planes, pantallas disponibles, duración y condiciones se confirman antes de contratar.",
            price: 69,
            icon: "fa-film",
            color: "red",
            image: "netflix.png",
            original: true,
            available: true
        },
        {
            id: "esim-datos-ilimitados",
            name: "eSIM con datos ilimitados",
            description: "Conectividad móvil para viajes. Revisa primero si tu dispositivo y destino son compatibles.",
            details: "Una eSIM es un perfil digital que se instala en un teléfono compatible, sin insertar una SIM física. La cobertura, países, vigencia, política de uso justo y activación dependen del plan. Confirma destino y fechas antes de comprar; “datos ilimitados” puede estar sujeto a las condiciones del proveedor.",
            price: 299,
            icon: "fa-sim-card",
            color: "indigo",
            image: "eSIM-Datos-Ilimitados-Holafly.avif",
            original: true,
            available: true
        },
        {
            id: "adobe-creative-cloud",
            name: "Adobe Creative Cloud",
            description: "Consulta opciones disponibles para herramientas creativas de Adobe.",
            details: "Opciones relacionadas con herramientas de diseño y edición. Aplicaciones, modalidad, duración y condiciones se confirman al cotizar.",
            price: 99,
            icon: "fa-bezier-curve",
            color: "purple",
            image: "adobe.png",
            original: false,
            available: true
        },
        {
            id: "microsoft-office",
            name: "Microsoft Office",
            description: "Consulta opciones para Word, Excel, PowerPoint y otras herramientas de Office.",
            details: "Opciones de instalación o acceso a aplicaciones de Office sujetas a compatibilidad y disponibilidad. Confirma la edición y el dispositivo antes de contratar.",
            price: 99,
            icon: "fa-brands fa-microsoft",
            color: "indigo",
            image: "ofice.webp",
            original: false,
            available: true
        },
    ];

    function read() {
        let stored;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            throw new Error("No se pudo leer el almacenamiento local del navegador.", { cause: error });
        }
        if (!stored) {
            const initial = { catalogVersion: CATALOG_VERSION, whatsapp: WHATSAPP, services: structuredClone(products) };
            write(initial);
            return initial;
        }

        let data;
        try {
            data = JSON.parse(stored);
        } catch (error) {
            throw new Error("Los datos guardados del catálogo no son JSON válido.", { cause: error });
        }
        if (!data || !Array.isArray(data.services)) {
            throw new Error("Los datos guardados del catálogo no tienen el formato esperado.");
        }

        data.whatsapp = typeof data.whatsapp === "string" && data.whatsapp.replace(/\D/g, "")
            ? data.whatsapp
            : WHATSAPP;
        if (!Number.isInteger(data.catalogVersion) || data.catalogVersion < CATALOG_VERSION) {
            const legacyDuolingo = data.services.find(service => service.id === "duolingo-plus");
            const legacyPoints = data.services.find(service => service.id === "puntos-profesores");
            if (legacyDuolingo) {
                const duolingoProduct = products.find(product => product.id === "duolingo-plus");
                const oldDuolingoDescription = legacyDuolingo.description;
                legacyDuolingo.name = duolingoProduct.name;
                legacyDuolingo.description = duolingoProduct.description;
                legacyDuolingo.details = duolingoProduct.details;
                if (!Number.isFinite(legacyDuolingo.price) && legacyPoints && Number.isFinite(legacyPoints.price)) {
                    legacyDuolingo.price = legacyPoints.price;
                }
                if (!Number.isFinite(legacyDuolingo.price) && oldDuolingoDescription && oldDuolingoDescription.includes("interactivas")) {
                    legacyDuolingo.price = duolingoProduct.price;
                }
            }
            data.services = data.services.filter(service => service.id !== "puntos-profesores" && service.id !== "datos-ilimitados");
            const existingIds = new Set(data.services.map(service => service.id));
            products.forEach(product => {
                if (!existingIds.has(product.id)) data.services.push(structuredClone(product));
            });
            data.catalogVersion = CATALOG_VERSION;
        }
        data.services = data.services.map(service => {
            const defaults = products.find(product => product.id === service.id);
            const merged = {
                ...(defaults || {}),
                ...service,
                details: typeof service.details === "string" ? service.details : (defaults ? defaults.details : service.description),
                original: Boolean(defaults && defaults.original),
                available: typeof service.available === "boolean" ? service.available : true
            };
            if (defaults && !Number.isFinite(merged.price)) merged.price = defaults.price;
            return merged;
        });
        data.services.sort((left, right) => {
            const leftOrder = products.findIndex(product => product.id === left.id);
            const rightOrder = products.findIndex(product => product.id === right.id);
            if (leftOrder === -1) return rightOrder === -1 ? 0 : 1;
            if (rightOrder === -1) return -1;
            return leftOrder - rightOrder;
        });
        write(data);
        return data;
    }

    function write(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            throw new Error("No se pudieron guardar los cambios en este navegador.", { cause: error });
        }
    }

    function configured() {
        const config = window.SUPABASE_CONFIG;
        return Boolean(config && config.url && config.publishableKey);
    }

    function initialize() {
        if (initializationPromise) return initializationPromise;
        initializationPromise = (async () => {
            if (!configured()) {
                remoteEnabled = false;
                return read();
            }
            if (!window.supabase || typeof window.supabase.createClient !== "function") {
                throw new Error("No se cargó la librería de Supabase. Revisa tu conexión y vuelve a cargar la página.");
            }

            const config = window.SUPABASE_CONFIG;
            supabaseClient = window.supabase.createClient(config.url, config.publishableKey);
            const [{ data: services, error: servicesError }, { data: settings, error: settingsError }] = await Promise.all([
                supabaseClient.from("services").select("*").order("sort_order"),
                supabaseClient.from("site_settings").select("whatsapp").eq("id", 1).maybeSingle()
            ]);
            if (servicesError) throw new Error(`No se pudo cargar el catálogo compartido: ${servicesError.message}`);
            if (settingsError) throw new Error(`No se pudo cargar la configuración del sitio: ${settingsError.message}`);
            if (!services || services.length === 0) {
                throw new Error("El catálogo remoto está vacío. Ejecuta supabase-schema.sql desde el editor SQL de Supabase.");
            }

            const data = {
                catalogVersion: CATALOG_VERSION,
                whatsapp: settings && settings.whatsapp ? settings.whatsapp : WHATSAPP,
                services: services.map((service, index) => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    details: service.details,
                    price: service.price === null ? null : Number(service.price),
                    icon: service.icon,
                    color: service.color,
                    image: service.image,
                    original: service.original,
                    available: service.available,
                    sort_order: service.sort_order ?? index
                }))
            };
            remoteEnabled = true;
            write(data);
            return data;
        })().catch(error => {
            initializationPromise = null;
            throw error;
        });
        return initializationPromise;
    }

    async function save(data) {
        if (remoteEnabled) {
            if (!adminAuthorized) throw new Error("Inicia sesión con una cuenta administradora antes de guardar.");
            const services = data.services.map((service, index) => ({
                ...service,
                sort_order: Number.isInteger(service.sort_order) ? service.sort_order : index
            }));
            const { error } = await supabaseClient.rpc("admin_save_catalog", {
                p_services: services,
                p_whatsapp: data.whatsapp
            });
            if (error) throw new Error(`No se pudieron guardar los cambios compartidos: ${error.message}`);
            data.catalogVersion = CATALOG_VERSION;
            data.services = services;
        }
        write(data);
    }

    async function signIn(email, password) {
        if (!remoteEnabled || !supabaseClient) {
            throw new Error("El backend compartido todavía no está configurado.");
        }
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
        if (!data.user || data.user.app_metadata.role !== "admin") {
            await supabaseClient.auth.signOut();
            throw new Error("Esta cuenta no tiene permiso de administradora.");
        }
        adminAuthorized = true;
        return data.user;
    }

    async function adminSession() {
        if (!remoteEnabled || !supabaseClient) return false;
        const { data, error } = await supabaseClient.auth.getUser();
        if (error && error.name !== "AuthSessionMissingError") {
            throw new Error(`No se pudo verificar la sesión: ${error.message}`);
        }
        adminAuthorized = Boolean(data.user && data.user.app_metadata.role === "admin");
        return adminAuthorized;
    }

    async function signOut() {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw new Error(`No se pudo cerrar la sesión: ${error.message}`);
        adminAuthorized = false;
    }

    function formatPrice(price) {
        return Number.isFinite(price) && price >= 0
            ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(price)
            : "Precio por cotizar";
    }

    window.CatalogStore = {
        read,
        write,
        save,
        initialize,
        configured,
        signIn,
        adminSession,
        signOut,
        formatPrice,
        phone: WHATSAPP,
        storageKey: STORAGE_KEY
    };
}());
