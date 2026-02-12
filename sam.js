/**
 * SAM Assistant v6.0
 * Features: Draggable, Resizable, Persistent Cache, Modular Action Deck
 */
(function() {
    const MENU_ID = 'sam_v6';
    const d = document;
    const g = i => d.getElementById(i);

    // 1. Cleanup: Remove existing instance
    if (g(MENU_ID)) g(MENU_ID).remove();

    // 2. Main Window Creation
    const m = d.createElement('div');
    m.id = MENU_ID;
    m.style = `
        position: fixed; top: 5%; left: 55%; z-index: 99999;
        width: 400px; height: 600px; min-width: 300px;
        background: #fff; border: 2px solid #004589;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5); border-radius: 10px;
        display: flex; flex-direction: column; resize: both; overflow: hidden;
        font-family: sans-serif;
    `;

    // 3. Header (Draggable)
    const header = d.createElement('div');
    header.style = 'padding:10px; background:#004589; color:#fff; cursor:move; font-weight:bold; user-select:none; display:flex; justify-content:space-between; flex-shrink:0;';
    header.innerHTML = '<span>SAM - Intervención QF</span><div><span id="min" style="cursor:pointer;margin-right:10px">_</span><span id="cls" style="cursor:pointer">×</span></div>';
    m.appendChild(header);

    // 4. Body Container
    const body = d.createElement('div');
    body.style = 'padding:10px; overflow:hidden; flex-grow:1; display:flex; flex-direction:column; background:#f4f4f4;';
    m.appendChild(body);
    d.body.appendChild(m);

    // --- Utility Functions ---

    const getToday = () => {
        const t = new Date();
        const dd = String(t.getDate()).padStart(2, '0');
        const mm = String(t.getMonth() + 1).padStart(2, '0');
        return `${dd}-${mm}-${t.getFullYear()}`;
    };

    const fillForm = (type) => {
        const f = g('fecha'), srv = g('servicio'), rev = g('revisado');
        const savedMap = localStorage.getItem('sam_map');
        const customDate = g('sd').value;

        localStorage.setItem('sam_date', customDate);

        if (f) f.value = customDate;
        if (srv) srv.value = savedMap || "1";
        if (rev) rev.value = type;

        // Visual feedback
        [f, srv, rev].forEach(el => { 
            if (el) el.style.background = '#c8e6c9'; 
        });
    };

    // --- UI Rendering ---

    const renderPatientScanner = (data) => {
        const curD = localStorage.getItem('sam_date') || getToday();
        
        body.innerHTML = `
            <div style="flex-shrink:0; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center">
                <b style="color:#004589">FECHA:</b>
                <input id="sd" value="${curD}" style="width:120px; text-align:center; border:1px solid #ccc; padding:2px;">
            </div>

            <div style="flex-grow:1; display:flex; flex-direction:column; min-height:150px">
                <input id="filter" placeholder="Filtrar paciente..." style="width:100%; margin-bottom:5px; box-sizing:border-box">
                <select id="pList" size="10" style="width:100%; font-size:11px; flex-grow:1; border:1px solid #999;"></select>
                <button id="searchBtn" style="width:100%; height:35px; background:#004589; color:#fff; border:none; margin-top:5px; cursor:pointer; font-weight:bold">BUSCAR FICHA</button>
            </div>

            <div style="flex-shrink:0; margin-top:10px; border-top:2px solid #ccc; padding-top:10px">
                <b style="color:#555; font-size:11px">MENÚ DE ACCIONES:</b>
                <select id="menuSel" style="width:100%; margin:5px 0; padding:5px">
                    <option value="mon">1. Monitorizaciones</option>
                    <option value="fut" disabled>2. (Próximamente...)</option>
                </select>
                <div id="deck" style="background:#e9ecef; padding:8px; border-radius:5px; border:1px solid #ccc"></div>
                
                <button id="resetBtn" style="width:100%; margin-top:8px; border:none; color:#d9534f; cursor:pointer; font-size:10px; background:none">
                    RESET (Cambiar servicio)
                </button>
            </div>
        `;

        const pList = g('pList'), filterInput = g('filter'), deck = g('deck');

        // Search/Filter logic
        const updateView = (query) => {
            pList.innerHTML = '';
            data.filter(x => x.n.toLowerCase().includes(query.toLowerCase())).forEach(x => {
                const o = d.createElement('option');
                o.value = x.f;
                o.text = x.n;
                pList.add(o);
            });
        };

        filterInput.oninput = e => updateView(e.target.value);
        updateView('');

        // Action Deck Loader
        const loadDeck = () => {
            const val = g('menuSel').value;
            if (val === 'mon') {
                deck.innerHTML = `
                    <div style="display:flex; gap:5px">
                        <button id="btnI" style="flex:1; height:40px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px">I. MONITORIZACION</button>
                        <button id="btnN" style="flex:1; height:40px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px">N. REVISION</button>
                    </div>
                `;
                g('btnI').onclick = () => fillForm('I');
                g('btnN').onclick = () => fillForm('N');
            }
        };

        g('menuSel').onchange = loadDeck;
        loadDeck();

        // System Buttons
        g('resetBtn').onclick = () => {
            localStorage.removeItem('sam_cache');
            localStorage.removeItem('sam_date');
            initAssistant();
        };

        g('searchBtn').onclick = () => {
            if (!pList.value) return;
            const fld = g('ficha');
            if (fld) {
                fld.value = pList.value;
                fld.focus();
                if (typeof validar === 'function') validar();
            }
        };
    };

    // --- Data Fetching ---

    const fetchPatients = async (serviceId, mapId) => {
        body.innerHTML = '<small>Descargando lista de pacientes...</small>';
        try {
            const response = await fetch('http://10.7.33.28/hlcm6/atehos002.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'ser=' + serviceId
            });
            const text = await response.text();
            const parser = new DOMParser().parseFromString(text, 'text/html');
            const tbls = parser.querySelectorAll('table');
            const rows = Array.from((tbls[1] || tbls[0]).querySelectorAll('tr')).slice(1);
            
            const cleanData = rows.map(r => {
                const c = r.querySelectorAll('td');
                return (c.length > 7) ? { f: c[5].innerText.trim(), n: c[7].innerText.trim() } : null;
            }).filter(x => x);

            localStorage.setItem('sam_cache', JSON.stringify(cleanData));
            localStorage.setItem('sam_map', mapId);
            renderPatientScanner(cleanData);
        } catch (e) {
            alert('Error de conexión: ' + e);
            initAssistant();
        }
    };

    // --- Initial State ---

    const initAssistant = () => {
        const cachedData = localStorage.getItem('sam_cache');
        if (cachedData) {
            renderPatientScanner(JSON.parse(cachedData));
            return;
        }

        body.innerHTML = `
            <b style="color:#004589">SELECCIONE SERVICIO</b>
            <select id="v" size="14" style="width:100%; margin:8px 0; font-size:11px; flex-grow:1">
                <option value="75" data-map="2" style="font-weight:bold; color:#004589">ONCOLOGIA</option>
                <option value="86" data-map="1" style="font-weight:bold; color:#004589">UPC PEDIATRICA</option>
                <option value="3221" data-map="5" style="font-weight:bold; color:#004589">2da INFANCIA</option>
                <option value="78" data-map="3" style="font-weight:bold; color:#004589">UTI TPH</option>
                <option value="82" data-map="4" style="font-weight:bold; color:#004589">UPC CARDIOVASCULAR</option>
                <option value="83" data-map="12" style="font-weight:bold; color:#004589">UPC NEONATAL</option>
                <option value="3190" data-map="3" style="font-weight:bold; color:#004589">CAE TRASPLANTE MEDULA</option>
                <option disabled>----------------</option>
                <option value="74" data-map="10">LACTANTES</option>
                <option value="73" data-map="6">CIRUGIA</option>
                <option value="3176" data-map="6">HOSP DIA QUIRURGICO</option>
                <option value="61" data-map="11">PENSIONADO</option>
                <option value="15" data-map="6">DIALISIS</option>
                <option value="62" data-map="6">PSICUIATRIA</option>
                <option value="3403" data-map="6">AGUDO INDIF. B</option>
                <option value="3268" data-map="1">UAI PEDIATRICO</option>
                <option value="80" data-map="6">URGENCIA</option>
            </select>
            <button id="go" style="width:100%; height:40px; background:#004589; color:#fff; border:none; border-radius:5px; cursor:pointer; flex-shrink:0">CARGAR LISTA</button>
        `;

        g('go').onclick = () => {
            const el = g('v'), opt = el.options[el.selectedIndex];
            if (!opt) return;
            fetchPatients(el.value, opt.getAttribute('data-map'));
        };
    };

    // --- Window Event Listeners ---
    g('cls').onclick = () => m.remove();
    g('min').onclick = () => {
        body.style.display = (body.style.display === 'none') ? 'flex' : 'none';
        m.style.height = (body.style.display === 'none') ? 'auto' : '600px';
    };

    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    header.onmousedown = e => {
        e.preventDefault();
        p3 = e.clientX; p4 = e.clientY;
        d.onmouseup = () => { d.onmouseup = null; d.onmousemove = null; };
        d.onmousemove = e => {
            e.preventDefault();
            p1 = p3 - e.clientX; p2 = p4 - e.clientY;
            p3 = e.clientX; p4 = e.clientY;
            m.style.top = (m.offsetTop - p2) + 'px';
            m.style.left = (m.offsetLeft - p1) + 'px';
        };
    };

    initAssistant();
})();
