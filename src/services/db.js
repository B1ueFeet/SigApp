// src/services/db.js
import localforage from 'localforage'

export default {
  SQL: null,
  db: null,

  // Inicializa la base, recreando el esquema si falta alguna tabla nueva
  async initDatabase() {
    if (!this.SQL) {
      throw new Error('SQL.js no ha sido asignado')
    }

    let needsFullRecreate = false
    const saved = await localforage.getItem('sigapp-db')

    if (saved) {
      // Carga el export previo
      this.db = new this.SQL.Database(new Uint8Array(saved))

      // Comprueba si la tabla 'materials' existe
      const chk = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='materials';"
      )
      if (!chk[0] || chk[0].values.length === 0) {
        console.warn('Esquema antiguo detectado: faltan tablas. Recreando esquema.')
        needsFullRecreate = true
      }
    }
    else {
      // Primera ejecución: no hay nada en IndexedDB
      this.db = new this.SQL.Database()
      needsFullRecreate = true
    }

    if (needsFullRecreate) {
      this.createTables()
      await this.save()
    }
  },

  // Define todas las tablas (clients, products, materials, product_material)
  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        sector TEXT
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

  // Persiste el export de la base en IndexedDB
  async save() {
    const data = this.db.export()
    await localforage.setItem('sigapp-db', data)
  },

  // Para exportar manualmente
  exportData() {
    return this.db.export()
  },

  // Importa un ArrayBuffer y persiste
  async importDatabase(buf) {
    this.db = new this.SQL.Database(new Uint8Array(buf))
    await this.save()
  },

  // Genera el siguiente product_code para un prefijo dado (P, M o S)
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
      const last = stmt.getAsObject().product_code   // ej. "P00010"
      const num = parseInt(last.slice(1), 10)
      next = num + 1
    }
    stmt.free()
    return prefix + String(next).padStart(4, '0')
  },

  // Carga todos los materials: devuelve [{ id, name, description }]
  loadMaterials() {
    const res = this.db.exec(`
      SELECT id, name, description
      FROM materials
    `)
    return (res[0]?.values || []).map(([id, name, desc]) => ({
      id,
      name,
      description: desc
    }))
  },

  // Carga los IDs de materiales asociados a un producto
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

  // Guarda la relación muchos-a-muchos product↔material
  async saveProductMaterials(productId, materialIds) {
    this.db.run(
      `DELETE FROM product_material
       WHERE product_id = ?`,
      [productId]
    )
    const ins = this.db.prepare(`
      INSERT INTO product_material (product_id, material_id)
      VALUES (?, ?)
    `)
    for (const mId of materialIds) {
      ins.bind([productId, mId])
      ins.step()
      ins.reset()
    }
    ins.free()
    await this.save()
  }
}
