// src/services/db.js
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
      // Si no existe la tabla materials, recreamos todo
      const chk = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='materials';"
      )
      if (!chk[0] || chk[0].values.length === 0) {
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
    const stmt = this.db.prepare(`
      SELECT product_code
      FROM products
      WHERE product_code LIKE ?
      ORDER BY product_code DESC
      LIMIT 1
    `)
    stmt.bind([`${prefix}%`])
    let next = 1
    if (stmt.step()) {
      const last = stmt.getAsObject().product_code
      next = parseInt(last.slice(1), 10) + 1
    }
    stmt.free()
    return prefix + String(next).padStart(4, '0')
  },

  loadMaterials() {
    const res = this.db.exec(`
      SELECT id, name, description
      FROM materials
    `)
    return (res[0]?.values || []).map(([id, name, desc]) => ({
      id, name, description: desc
    }))
  },

  loadProductMaterials(productId) {
    const res = this.db.exec(`
      SELECT material_id
      FROM product_material
      WHERE product_id = ${productId}
    `)
    return (res[0]?.values || []).map(([mid]) => mid)
  },

  // ★ SOBREESCRIBE por completo con db.run ★
  async saveProductMaterials(productId, materialIds) {
    // Borra viejos
    this.db.run(
      'DELETE FROM product_material WHERE product_id = ?',
      [productId]
    )

    // Inserta nuevos (db.run bindea correctamente)
    materialIds.forEach(mid => {
      this.db.run(
        'INSERT INTO product_material (product_id, material_id) VALUES (?, ?)',
        [productId, mid]
      )
    })

    // Persiste
    await this.save()
  }
}
