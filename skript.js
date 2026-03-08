// skript.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formular-pridani');
  const vyhledavac = document.getElementById('vyhledavac');
  const vystup = document.getElementById('vystup-dat');

  // Vytvoříme pole inputů podle HTML (index.html má 3 inputy)
  const inputs = form.querySelectorAll('input');
  const [inpTitle, inpArtist, inpYear] = inputs;

  // Tlačítko submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = inpTitle.value.trim();
    const artist = inpArtist.value.trim();
    const year = inpYear.value.trim();

    // Základní validace
    if (!title || !artist || !year) {
      alert('Vyplň všechna pole.');
      return;
    }
    if (!/^\d{3,4}$/.test(year)) {
      alert('Zadej platný rok (např. 1999).');
      return;
    }

    try {
      const res = await fetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, year: Number(year) })
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Chyba při ukládání: ' + (err.error || res.statusText));
        return;
      }
      // Vyčistit formulář a znovu načíst data
      inpTitle.value = '';
      inpArtist.value = '';
      inpYear.value = '';
      await loadAndRender();
    } catch (err) {
      console.error(err);
      alert('Chyba sítě.');
    }
  });

  // Vyhledávání / filtrování při psaní
  let filterTimeout = null;
  vyhledavac.addEventListener('input', () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(loadAndRender, 250);
  });

  // Načte data z API a vykreslí tabulku
  async function loadAndRender() {
    try {
      const q = encodeURIComponent(vyhledavac.value.trim());
      const url = q ? `/items?q=${q}` : '/items';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Chyba při načítání dat');
      const items = await res.json();
      renderTable(items);
    } catch (err) {
      console.error(err);
      vystup.innerHTML = '<tr><td colspan="3">Nelze načíst data.</td></tr>';
    }
  }

  // Vykreslení tabulky
  function renderTable(items) {
    if (!items || items.length === 0) {
      vystup.innerHTML = '<tr><td colspan="3">Žádné záznamy.</td></tr>';
      return;
    }
    vystup.innerHTML = '';
    items.forEach(it => {
      const tr = document.createElement('tr');

      const tdTitle = document.createElement('td');
      tdTitle.textContent = it.title;
      tr.appendChild(tdTitle);

      const tdArtist = document.createElement('td');
      tdArtist.textContent = it.artist;
      tr.appendChild(tdArtist);

      const tdYear = document.createElement('td');
      tdYear.textContent = it.year;
      tr.appendChild(tdYear);

      // Přidáme akce: edit a delete (vzhled zachován přes CSS)
      const tdActions = document.createElement('td');
      tdActions.style.whiteSpace = 'nowrap';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Upravit';
      editBtn.className = 'tlacitko-akce';
      editBtn.style.width = 'auto';
      editBtn.style.marginRight = '8px';
      editBtn.addEventListener('click', () => openEditForm(it.id));
      tdActions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '🗑';
      delBtn.className = 'smazat-btn';
      delBtn.title = 'Smazat';
      delBtn.addEventListener('click', () => deleteItem(it.id));
      tdActions.appendChild(delBtn);

      // Přidáme nový sloupec pro akce (rozšíření tabulky)
      tr.appendChild(tdActions);

      vystup.appendChild(tr);
    });

    // Upravíme hlavičku tabulky pokud je potřeba (index.html má 3 th)
    const thead = document.querySelector('.tabulka-dat thead tr');
    if (thead && thead.children.length < 4) {
      const th = document.createElement('th');
      th.textContent = 'Akce';
      thead.appendChild(th);
    }
  }

  // Otevře editaci: načte data a předvyplní formulář, změní submit na "Uložit změny"
  let editingId = null;
  function openEditForm(id) {
    fetch(`/edit/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Nelze načíst záznam');
        return r.json();
      })
      .then(item => {
        inpTitle.value = item.title || '';
        inpArtist.value = item.artist || '';
        inpYear.value = item.year || '';
        editingId = item.id;
        // Změníme tlačítko a chování formuláře
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Uložit změny';
        // Přidáme možnost zrušit editaci
        if (!document.getElementById('cancel-edit')) {
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.id = 'cancel-edit';
          cancel.className = 'tlacitko-akce';
          cancel.style.background = 'transparent';
          cancel.style.marginTop = '8px';
          cancel.textContent = 'Zrušit';
          cancel.addEventListener('click', cancelEdit);
          form.appendChild(cancel);
        }
      })
      .catch(err => {
        console.error(err);
        alert('Chyba při načítání záznamu.');
      });
  }

  // Zrušení editace
  function cancelEdit() {
    editingId = null;
    form.reset();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Uložit do databáze';
    const cancel = document.getElementById('cancel-edit');
    if (cancel) cancel.remove();
  }

  // Při submitu pokud editingId je nastavené, pošleme POST /edit/:id
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = inpTitle.value.trim();
    const artist = inpArtist.value.trim();
    const year = inpYear.value.trim();

    if (!title || !artist || !year) {
      alert('Vyplň všechna pole.');
      return;
    }
    if (!/^\d{3,4}$/.test(year)) {
      alert('Zadej platný rok.');
      return;
    }

    if (editingId) {
      try {
        const res = await fetch(`/edit/${editingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, year: Number(year) })
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Chyba při ukládání: ' + (err.error || res.statusText));
          return;
        }
        cancelEdit();
        await loadAndRender();
      } catch (err) {
        console.error(err);
        alert('Chyba sítě.');
      }
    } else {
      // Pokud není editace, použije se standardní POST /items (tento submit handler je duplikovaný s prvním,
      // ale zůstává kompatibilní)
      try {
        const res = await fetch('/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, year: Number(year) })
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Chyba při ukládání: ' + (err.error || res.statusText));
          return;
        }
        form.reset();
        await loadAndRender();
      } catch (err) {
        console.error(err);
        alert('Chyba sítě.');
      }
    }
  });

  // Smazání záznamu
  async function deleteItem(id) {
    if (!confirm('Opravdu smazat záznam?')) return;
    try {
      const res = await fetch(`/delete/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert('Chyba při mazání: ' + (err.error || res.statusText));
        return;
      }
      await loadAndRender();
    } catch (err) {
      console.error(err);
      alert('Chyba sítě.');
    }
  }

  // Inicializace
  loadAndRender();
});