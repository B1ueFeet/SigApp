// src/services/db.js
import localforage from 'localforage'

export default {
  SQL: null,
  db: null,

  // Inicializa la base, recreando esquema si falta alguna tabla
  async initDatabase() {
    if (!this.SQL) {
      throw new Error('SQL.js no ha sido asignado')
    }

    let needsFullRecreate = false
    const saved = await localforage.getItem('sigapp-db')
    if (saved) {
      this.db = new this.SQL.Database(new Uint8Array(saved))
      // Verifica si la tabla 'materials' existe
      const chk = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='materials';"
      )
      if (!chk[0] || chk[0].values.length === 0) {
        needsFullRecreate = true
      }
    }
    else {
      this.db = new this.SQL.Database()
      needsFullRecreate = true
    }

    if (needsFullRecreate) {
      this.createTables()
      await this.save()
    }
  },

  // Crea todas las tablas
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
        PRIMARY KEY (product_id, material_id)
      );
    `)
  },

  // Persiste el estado en IndexedDB
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

  // Genera el siguiente código P/M/S
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
    const stmt = this.db.prepare(`
      SELECT material_id
      FROM product_material
      WHERE product_id = ?
    `)
    stmt.bind([productId])
    const ids = []
    while (stmt.step()) {
      ids.push(stmt.get()[0])
    }
    stmt.free()
    return ids
  },

  async saveProductMaterials(productId, materialIds) {
    // 1) Borro los viejos
    this.db.run(
      'DELETE FROM product_material WHERE product_id = ?',
      [productId]
    )

    // 2) Inserto cada relación con db.run (que bindea bien el array)
    for (const m of materialIds) {
      // si vienen como objeto, extraigo el id
      const mid = (typeof m === 'object' && m != null)
        ? (m.id ?? m.value)
        : m

      this.db.run(
        'INSERT INTO product_material (product_id, material_id) VALUES (?, ?)',
        [productId, mid]
      )
    }

    // 3) Persisto en IndexedDB
    await this.save()
  },
}
