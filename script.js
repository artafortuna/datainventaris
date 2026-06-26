// Elemen DOM
const form = document.getElementById('inventoryForm');
const tableBody = document.getElementById('tableBody');
const btnSubmit = document.getElementById('btnSubmit');
const btnCancel = document.getElementById('btnCancel');
const formTitle = document.getElementById('formTitle');
const searchInput = document.getElementById('searchInput');

let db;
let inventoryCache = []; // Cache lokal untuk fitur pencarian agar tetap cepat

// --- 1. INISIALISASI INDEXED-DB ---
const initDB = () => {
    // Nama database diubah menjadi 'AMJS_Database_Clean' agar mulai dari nol
    const request = indexedDB.open('AMJS_Database_Clean', 1);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('inventory')) {
            db.createObjectStore('inventory', { keyPath: 'id' });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadData(); // Tarik data saat database berhasil dibuka
    };

    request.onerror = (event) => {
        console.error("Gagal membuka IndexedDB:", event.target.error);
    };
};

// --- 2. TARIK DATA DARI DATABASE ---
const loadData = () => {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.getAll();

    request.onsuccess = () => {
        inventoryCache = request.result;
        renderTable(inventoryCache); // Langsung render apa adanya (kosong)
    };
};

// --- 3. RENDER TABEL ---
function renderTable(data = inventoryCache) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 30px;">Data inventaris masih kosong. Silakan input data barang baru.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        let condClass = 'baik';
        if(item.condition.includes('Rusak')) condClass = 'rusak';
        if(item.condition.includes('Servis')) condClass = 'servis';

        const formattedPrice = new Intl.NumberFormat('id-ID', { 
            style: 'currency', currency: 'IDR', maximumFractionDigits: 0
        }).format(item.price);

        let displayDate = item.date;
        if(displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // dd/mm/yyyy
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.code}</strong></td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.qty}</td>
            <td>${displayDate}</td>
            <td>${formattedPrice}</td>
            <td><span class="badge ${condClass}">${item.condition}</span></td>
            <td>${item.note || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editItem(${item.id})" title="Edit Data">✎</button>
                    <button class="btn-delete" onclick="deleteItem(${item.id})" title="Hapus Data">✖</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- 4. TAMBAH / UPDATE KE DATABASE ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const editId = document.getElementById('editId').value;
    
    // Siapkan object data baru
    const newItem = {
        id: editId !== "-1" ? parseInt(editId) : Date.now(), // Gunakan Timestamp sebagai ID unik
        code: document.getElementById('itemCode').value,
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        qty: parseInt(document.getElementById('itemQty').value),
        date: document.getElementById('itemDate').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        condition: document.getElementById('itemCondition').value,
        note: document.getElementById('itemNote').value
    };

    const transaction = db.transaction(['inventory'], 'readwrite');
    const store = transaction.objectStore('inventory');

    if (editId === "-1") {
        store.add(newItem); // Mode Tambah Data
    } else {
        store.put(newItem); // Mode Update Data
    }

    transaction.oncomplete = () => {
        loadData(); // Tarik & Render ulang
        resetForm();
    };
});

// --- 5. EDIT DATA ---
window.editItem = (id) => {
    const item = inventoryCache.find(i => i.id === id);
    if(!item) return;

    document.getElementById('itemCode').value = item.code;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemQty').value = item.qty;
    document.getElementById('itemDate').value = item.date;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCondition').value = item.condition;
    document.getElementById('itemNote').value = item.note || '';
    
    document.getElementById('editId').value = item.id;
    
    formTitle.innerText = "Edit Data: " + item.name;
    btnSubmit.innerText = "Update Data";
    btnSubmit.style.background = "var(--success)";
    btnCancel.style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Batal Edit
btnCancel.addEventListener('click', resetForm);
function resetForm() {
    form.reset();
    document.getElementById('editId').value = "-1";
    formTitle.innerText = "Input Data Barang Baru";
    btnSubmit.innerText = "Simpan Data";
    btnSubmit.style.background = "var(--primary)";
    btnCancel.style.display = "none";
}

// --- 6. HAPUS DATA DARI DATABASE ---
window.deleteItem = (id) => {
    if(confirm('Hapus aset ini dari sistem secara permanen?')) {
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');
        store.delete(id);

        transaction.oncomplete = () => {
            loadData(); // Refresh UI
        };
    }
};

// --- 7. CARI DATA ---
searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = inventoryCache.filter(item => 
        item.name.toLowerCase().includes(val) || 
        item.code.toLowerCase().includes(val) ||
        item.category.toLowerCase().includes(val) ||
        (item.note && item.note.toLowerCase().includes(val))
    );
    renderTable(filtered);
});

// --- 8. DARK / LIGHT MODE ---
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

// Jalankan koneksi saat web dimulai
initDB();
