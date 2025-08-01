import localforage from 'localforage'

export default {
  SQL: null,
  db: null,

  async initDatabase() {
    if (!this.SQL) throw new Error('SQL.js no ha sido asignado')

    let needsRecreate = false
    const saved = await localforage.getItem('sigapp-db')

    if (saved) {
      this.db = new this.SQL.Database(new Uint8Array(saved))
      const chk = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='materials';"
      )
      if (!chk[0] || chk[0].values.length === 0) {
        console.warn('Esquema antiguo detectado — recreando tablas.')
        needsRecreate = true
      }
    }
    else {
      this.db = new this.SQL.Database()
      needsRecreate = true
    }

    if (needsRecreate) {
      this.createTables()
      await this.save()
    }
  },

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, sector TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE,
        common_name TEXT,
        description TEXT,
        price REAL,
        unit TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      );
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS product_material (
        product_id INTEGER,
        material_id INTEGER,
        PRIMARY KEY(product_id, material_id)
      );
    `)
    this.db.run(`
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      client_id INTEGER,
      title TEXT,
      apply_taxes INTEGER,
      discount REAL,
      terms TEXT,               -- JSON-encoded array de términos
      work_days INTEGER,
      payment_term TEXT,
      warranty_material INTEGER,
      warranty_work INTEGER
    );
  `);

    this.db.run(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER,
      product_id INTEGER,
      description TEXT,
      quantity REAL,
      unit_price REAL,
      unit TEXT
    );
  `);

    this.db.run(`
    CREATE TABLE IF NOT EXISTS quotation_item_material (
      item_id INTEGER,
      material_id INTEGER,
      PRIMARY KEY(item_id, material_id)
    );
  `);
  },

  async save() {
    const data = this.db.export()
    await localforage.setItem('sigapp-db', data)
  },

  exportData() {
    return this.db.export()
  },

  async importDatabase(buf) {
    this.db = new this.SQL.Database(new Uint8Array(buf))
    await this.save()
  },

  nextProductCode(prefix) {
    const res = this.db.exec(`
      SELECT product_code
      FROM products
      WHERE product_code LIKE '${prefix}%'
      ORDER BY product_code DESC
      LIMIT 1
    `)
    let next = 1
    if (res[0]?.values.length) {
      const last = res[0].values[0][0]   // por ejemplo "P00010"
      const num = parseInt(last.slice(1), 10)
      next = num + 1
    }
    return prefix + String(next).padStart(4, '0')
  },

  // 5) Lecturas
  loadMaterials() {
    const res = this.db.exec(`
      SELECT id, name, description
      FROM materials
    `)
    return (res[0]?.values || []).map(
      ([id, name, desc]) => ({ id, name, description: desc })
    )
  },

  loadProductMaterials(productId) {
    const res = this.db.exec(`
      SELECT material_id
      FROM product_material
      WHERE product_id = ${productId}
    `)
    return (res[0]?.values || []).map(([mid]) => mid)
  },

  async saveProductMaterials(productId, materialIds) {
    try {
      const raw = Array.isArray(materialIds)
        ? [...materialIds]
        : []
      const validIds = raw
        .map(m => {
          if (m != null && typeof m === 'object') {
            return Number(m.id ?? m.value)
          }
          return Number(m)
        })
        .filter(n => !isNaN(n))

      console.log(
        '%c[db] saveProductMaterials →',
        'color: teal; font-weight: bold;',
        { productId, validIds }
      )

      this.db.run(
        'DELETE FROM product_material WHERE product_id = ?',
        [productId]
      )

      for (const mid of validIds) {
        console.log(`  insert (product=${productId}, material=${mid})`)
        this.db.run(
          'INSERT INTO product_material (product_id, material_id) VALUES (?, ?)',
          [productId, mid]
        )
      }

      // 5) Persiste
      await this.save()
    }
    catch (err) {
      console.error(
        '[db] ERROR en saveProductMaterials',
        err,
        { productId, materialIds }
      )
      throw err
    }
  },
  async updateMaterial(id, name, description) {
    this.db.run(
      'UPDATE materials SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    await this.save();
  },


  async saveQuotation(quotation, items) {
    const {
      client_id,
      title,
      apply_taxes,
      discount,
      terms,
      work_days,
      payment_term,
      warranty_material,
      warranty_work
    } = quotation;

    this.db.run(
      `INSERT INTO quotations
         (date, client_id, title, apply_taxes, discount, terms, work_days, payment_term, warranty_material, warranty_work)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        new Date().toISOString(),
        client_id,
        title,
        apply_taxes ? 1 : 0,
        discount,
        JSON.stringify(terms),
        work_days,
        payment_term,
        warranty_material,
        warranty_work
      ]
    );

    const rowid = this.db.exec(`SELECT last_insert_rowid();`)[0].values[0][0];
    const quotationId = Number(rowid);

    for (const item of items) {
      this.db.run(
        `INSERT INTO quotation_items
           (quotation_id, product_id, description, quantity, unit_price, unit)
         VALUES (?,?,?,?,?,?)`,
        [
          quotationId,
          item.productId,
          item.description,
          item.quantity,
          item.unit_price,
          item.unit || ''
        ]
      );

      const itemRow = this.db.exec(`SELECT last_insert_rowid();`)[0].values[0][0];
      const itemId = Number(itemRow);

      for (const matId of item.materials || []) {
        this.db.run(
          `INSERT INTO quotation_item_material (item_id, material_id)
           VALUES (?,?)`,
          [itemId, matId]
        );
      }
    }

    await this.save();

    return quotationId;
  },


  loadQuotations() {
    const res = this.db.exec(`
      SELECT id, date, client_id, title, apply_taxes, discount
      FROM quotations
      ORDER BY date DESC
    `);
    return (res[0]?.values || []).map(
      ([id, date, client_id, title, apply_taxes, discount]) => ({
        id, date, client_id, title,
        apply_taxes: Boolean(apply_taxes),
        discount
      })
    );
  },

  async deleteQuotation(id) {
    this.db.run(
      `DELETE FROM quotation_item_material
     WHERE item_id IN (
       SELECT id FROM quotation_items WHERE quotation_id = ?
     )`,
      [id]
    )
    this.db.run(
      `DELETE FROM quotation_items WHERE quotation_id = ?`,
      [id]
    )
    this.db.run(
      `DELETE FROM quotations WHERE id = ?`,
      [id]
    )
    await this.save()
  },

  loadQuotationById(quotationId) {
    const hdr = this.db.exec(
      `SELECT id, date, client_id, title, apply_taxes, discount, terms,
              work_days, payment_term, warranty_material, warranty_work
       FROM quotations WHERE id = ?`, [quotationId]
    )[0]?.values?.[0];
    if (!hdr) return null;

    const [id, date, client_id, title, apply_taxes, discount, terms,
      work_days, payment_term, warranty_material, warranty_work] = hdr;

    const itemsRes = this.db.exec(
      `SELECT *
       FROM quotation_items
       WHERE quotation_id = ?`, [quotationId]
    )[0]?.values || [];
    console.log('Items de cotización: desde service ', itemsRes);
    const items = itemsRes.map(([itemId, product_id, tableId, desc, qty, up, unit]) => {
      const mats = (this.db.exec(
        `SELECT material_id FROM quotation_item_material WHERE item_id = ?`, [itemId]
      )[0]?.values || []).map(r => r[0]);
      return {
        itemId,
        productId: product_id,
        unit: unit,
        description: desc,
        quantity: qty,
        unit_price: up,
        materials: mats
      };
    });


    return {
      id, date, client_id, title,
      apply_taxes: Boolean(apply_taxes),
      discount,
      terms: JSON.parse(terms),
      work_days,
      payment_term,
      warranty_material,
      warranty_work,
      items
    };
  },


  async saveClient(client) {
    if (client.id) {
      // actualizar
      this.db.run(
        `UPDATE clients
           SET name = ?, phone = ?, sector = ?
         WHERE id = ?`,
        [client.name, client.phone, client.sector, client.id]
      );
      var savedId = client.id;
    }
    else {
      // insertar
      this.db.run(
        `INSERT INTO clients (name, phone, sector)
         VALUES (?, ?, ?)`,
        [client.name, client.phone, client.sector]
      );
      // recuperar el id autogenerado
      const rowid = this.db.exec(`SELECT last_insert_rowid();`)[0].values[0][0];
      var savedId = Number(rowid);
    }

    // persistir en IndexedDB
    await this.save();
    return savedId;
  },


  async deleteClient(id) {
    this.db.run(
      `DELETE FROM clients WHERE id = ?`,
      [id]
    );
    // si tuvieras FK, aquí borrarías cotizaciones u otras tablas relacionadas
    await this.save();
  },

  loadClients() {
    const res = this.db.exec(`
      SELECT id, name, phone, sector
      FROM clients
      ORDER BY name
    `);
    return (res[0]?.values || []).map(
      ([id, name, phone, sector]) => ({ id, name, phone, sector })
    );
  },


  searchClientsByName(term) {
    const like = `%${term}%`;
    const res = this.db.exec(
      `SELECT id, name, phone, sector
       FROM clients
       WHERE name LIKE ?
       ORDER BY name`,
      [like]
    );
    return (res[0]?.values || []).map(
      ([id, name, phone, sector]) => ({ id, name, phone, sector })
    );
  }

}
