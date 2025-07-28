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
  }

}
